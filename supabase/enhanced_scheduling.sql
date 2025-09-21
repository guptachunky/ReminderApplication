-- Enhanced Scheduling System with Configurable Timing and Manual Trigger
-- This replaces the previous scheduling.sql and modified_scheduling.sql

-- First, create a scheduler configuration table
CREATE TABLE IF NOT EXISTS scheduler_config (
  id SERIAL PRIMARY KEY,
  config_name VARCHAR(50) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default scheduler configurations
INSERT INTO scheduler_config (config_name, config_value, description) VALUES
('daily_run_time', '09:00:00', 'Time of day to run daily notifications (HH:MM:SS)'),
('timezone', 'Asia/Kolkata', 'Timezone for scheduler'),
('batch_size', '50', 'Number of reminders to process per batch'),
('retry_attempts', '3', 'Number of retry attempts for failed notifications'),
('manual_trigger_enabled', 'true', 'Allow manual triggering of notifications')
ON CONFLICT (config_name) DO NOTHING;

-- Enhanced function to get scheduler configuration
CREATE OR REPLACE FUNCTION get_scheduler_config(config_key TEXT)
RETURNS TEXT AS $$
DECLARE
  config_val TEXT;
BEGIN
  SELECT config_value INTO config_val 
  FROM scheduler_config 
  WHERE config_name = config_key;
  
  RETURN COALESCE(config_val, 'default');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to update scheduler configuration
CREATE OR REPLACE FUNCTION update_scheduler_config(
  config_key TEXT,
  new_value TEXT,
  user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE scheduler_config 
  SET 
    config_value = new_value,
    updated_at = NOW(),
    updated_by = user_id
  WHERE config_name = config_key;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced manual trigger function with logging
CREATE OR REPLACE FUNCTION trigger_reminder_notifications(
  force_run BOOLEAN DEFAULT FALSE,
  batch_limit INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  batch_size INTEGER;
  manual_enabled BOOLEAN;
  project_url TEXT;
  service_key TEXT;
BEGIN
  -- Check if manual trigger is enabled
  SELECT (get_scheduler_config('manual_trigger_enabled'))::BOOLEAN INTO manual_enabled;
  
  IF NOT manual_enabled AND NOT force_run THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Manual trigger is disabled',
      'timestamp', NOW()
    );
  END IF;
  
  -- Get batch size from config
  SELECT COALESCE(batch_limit, (get_scheduler_config('batch_size'))::INTEGER) INTO batch_size;
  
  -- Your Supabase project details (replace with your actual values)
  project_url := 'https://hjhgrddwoukzitdmdopj.supabase.co';
  service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqaGdyZGR3b3Vreml0ZG1kb3BqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzM2NzI0NCwiZXhwIjoyMDUyOTQzMjQ0fQ.YBxVKBXhKRfJCNnqYJGKLqJBrKJBrKJBrKJBrKJBrKI';
  
  -- Call the Edge Function using pg_net
  SELECT INTO result
    net.http_post(
      url := project_url || '/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'manual_trigger', true,
        'batch_size', batch_size,
        'triggered_at', NOW()
      )
    );
  
  -- Log the manual trigger
  INSERT INTO sent_notifications (
    reminder_id, 
    notification_type, 
    delivery_status
  ) VALUES (
    gen_random_uuid(), 
    'manual_trigger', 
    'triggered'
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Manual trigger executed successfully',
    'batch_size', batch_size,
    'timestamp', NOW(),
    'response', result
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Error executing manual trigger: ' || SQLERRM,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing cron job if it exists
SELECT cron.unschedule('daily-reminder-notifications');

-- Create configurable cron job
-- This will run at the time specified in scheduler_config
DO $$
DECLARE
  run_time TEXT;
  cron_schedule TEXT;
BEGIN
  -- Get the configured run time
  SELECT get_scheduler_config('daily_run_time') INTO run_time;
  
  -- Convert time to cron format (assuming daily at specified time)
  -- Format: minute hour * * * (daily)
  cron_schedule := SPLIT_PART(run_time, ':', 2) || ' ' || SPLIT_PART(run_time, ':', 1) || ' * * *';
  
  -- Schedule the cron job
  PERFORM cron.schedule(
    'daily-reminder-notifications',
    cron_schedule,
    'SELECT trigger_reminder_notifications(false, NULL);'
  );
END $$;

-- Function to update cron schedule when configuration changes
CREATE OR REPLACE FUNCTION update_cron_schedule()
RETURNS TRIGGER AS $$
DECLARE
  run_time TEXT;
  cron_schedule TEXT;
BEGIN
  -- Only update if the daily_run_time config changed
  IF NEW.config_name = 'daily_run_time' THEN
    -- Unschedule existing job
    PERFORM cron.unschedule('daily-reminder-notifications');
    
    -- Create new schedule
    cron_schedule := SPLIT_PART(NEW.config_value, ':', 2) || ' ' || SPLIT_PART(NEW.config_value, ':', 1) || ' * * *';
    
    PERFORM cron.schedule(
      'daily-reminder-notifications',
      cron_schedule,
      'SELECT trigger_reminder_notifications(false, NULL);'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update cron schedule when config changes
DROP TRIGGER IF EXISTS update_cron_on_config_change ON scheduler_config;
CREATE TRIGGER update_cron_on_config_change
  AFTER UPDATE ON scheduler_config
  FOR EACH ROW
  EXECUTE FUNCTION update_cron_schedule();

-- Grant necessary permissions
GRANT SELECT, UPDATE ON scheduler_config TO authenticated;
GRANT EXECUTE ON FUNCTION get_scheduler_config(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_scheduler_config(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_reminder_notifications(BOOLEAN, INTEGER) TO authenticated;

-- Create view for scheduler status
CREATE OR REPLACE VIEW scheduler_status AS
SELECT 
  sc.config_name,
  sc.config_value,
  sc.description,
  sc.updated_at,
  p.email as updated_by_email
FROM scheduler_config sc
LEFT JOIN profiles p ON sc.updated_by = p.id
ORDER BY sc.config_name;
