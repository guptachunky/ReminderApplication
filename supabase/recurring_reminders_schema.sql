-- Enhanced Database Schema for Recurring Reminders
-- This extends the existing schema with recurring reminder functionality

-- Add new columns to existing reminders table for recurring functionality
ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(20) CHECK (recurrence_pattern IN ('yearly', 'monthly', 'weekly', 'daily', 'custom')),
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
ADD COLUMN IF NOT EXISTS next_occurrence_date DATE,
ADD COLUMN IF NOT EXISTS original_reminder_id UUID REFERENCES reminders(id),
ADD COLUMN IF NOT EXISTS reminder_status VARCHAR(20) DEFAULT 'active' CHECK (reminder_status IN ('active', 'completed', 'cancelled', 'upcoming')),
ADD COLUMN IF NOT EXISTS completion_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;

-- Create index for better performance on recurring reminders
CREATE INDEX IF NOT EXISTS idx_reminders_recurring ON reminders(is_recurring, next_occurrence_date) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(reminder_status, due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_upcoming ON reminders(due_date) WHERE reminder_status = 'upcoming';

-- Function to calculate next occurrence date
CREATE OR REPLACE FUNCTION calculate_next_occurrence(
  p_current_date DATE,
  pattern VARCHAR(20),
  interval_val INTEGER DEFAULT 1
)
RETURNS DATE AS $$
BEGIN
  CASE pattern
    WHEN 'yearly' THEN
      RETURN (p_current_date + (interval_val || ' years')::INTERVAL)::DATE;
    WHEN 'monthly' THEN
      RETURN (p_current_date + (interval_val || ' months')::INTERVAL)::DATE;
    WHEN 'weekly' THEN
      RETURN (p_current_date + (interval_val || ' weeks')::INTERVAL)::DATE;
    WHEN 'daily' THEN
      RETURN (p_current_date + (interval_val || ' days')::INTERVAL)::DATE;
    ELSE
      RETURN (p_current_date + (interval_val || ' years')::INTERVAL)::DATE; -- Default to yearly
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to create next occurrence of a recurring reminder
CREATE OR REPLACE FUNCTION create_next_occurrence(reminder_id UUID)
RETURNS UUID AS $$
DECLARE
  original_reminder RECORD;
  new_reminder_id UUID;
  next_date DATE;
BEGIN
  -- Get the original reminder details
  SELECT * INTO original_reminder 
  FROM reminders 
  WHERE id = reminder_id AND is_recurring = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring reminder not found: %', reminder_id;
  END IF;
  
  -- Calculate next occurrence date
  next_date := calculate_next_occurrence(
    original_reminder.due_date,
    original_reminder.recurrence_pattern,
    original_reminder.recurrence_interval
  );
  
  -- Check if we should create next occurrence (not past end date)
  IF original_reminder.recurrence_end_date IS NULL OR next_date <= original_reminder.recurrence_end_date THEN
    -- Create new reminder instance
    INSERT INTO reminders (
      user_id, title, category, due_date, amount,
      remind_10_days, remind_5_days, remind_weekend, remind_1_day, remind_due_day,
      is_recurring, recurrence_pattern, recurrence_interval, recurrence_end_date,
      original_reminder_id, reminder_status, is_template, next_occurrence_date
    ) VALUES (
      original_reminder.user_id,
      original_reminder.title,
      original_reminder.category,
      next_date,
      original_reminder.amount,
      original_reminder.remind_10_days,
      original_reminder.remind_5_days,
      original_reminder.remind_weekend,
      original_reminder.remind_1_day,
      original_reminder.remind_due_day,
      original_reminder.is_recurring,
      original_reminder.recurrence_pattern,
      original_reminder.recurrence_interval,
      original_reminder.recurrence_end_date,
      COALESCE(original_reminder.original_reminder_id, original_reminder.id),
      'upcoming',
      false,
      calculate_next_occurrence(next_date, original_reminder.recurrence_pattern, original_reminder.recurrence_interval)
    ) RETURNING id INTO new_reminder_id;
    
    -- Update the original reminder's next occurrence date
    UPDATE reminders 
    SET next_occurrence_date = calculate_next_occurrence(next_date, original_reminder.recurrence_pattern, original_reminder.recurrence_interval)
    WHERE id = reminder_id;
    
    RETURN new_reminder_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark reminder as completed and create next occurrence if recurring
CREATE OR REPLACE FUNCTION complete_reminder(
  reminder_uuid UUID,
  completion_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  reminder_record RECORD;
  next_reminder_id UUID;
  result JSON;
BEGIN
  -- Get the reminder details
  SELECT * INTO reminder_record 
  FROM reminders 
  WHERE id = reminder_uuid AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Reminder not found or already inactive'
    );
  END IF;
  
  -- Mark current reminder as completed
  UPDATE reminders 
  SET 
    reminder_status = 'completed',
    completion_date = NOW(),
    updated_at = NOW(),
    is_active = false
  WHERE id = reminder_uuid;
  
  -- If it's a recurring reminder, create next occurrence
  IF reminder_record.is_recurring THEN
    next_reminder_id := create_next_occurrence(reminder_uuid);
    
    RETURN json_build_object(
      'success', true,
      'message', 'Reminder completed and next occurrence created',
      'completed_reminder_id', reminder_uuid,
      'next_reminder_id', next_reminder_id,
      'completion_date', NOW()
    );
  ELSE
    RETURN json_build_object(
      'success', true,
      'message', 'Reminder completed successfully',
      'completed_reminder_id', reminder_uuid,
      'completion_date', NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get upcoming reminders (12 days in advance)
CREATE OR REPLACE FUNCTION get_upcoming_reminders(user_uuid UUID, days_ahead INTEGER DEFAULT 12)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  due_date DATE,
  amount NUMERIC,
  days_until INTEGER,
  is_recurring BOOLEAN,
  recurrence_pattern VARCHAR(20),
  reminder_status VARCHAR(20),
  original_reminder_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.category,
    r.due_date,
    r.amount,
    (r.due_date - CURRENT_DATE)::INTEGER as days_until,
    r.is_recurring,
    r.recurrence_pattern,
    r.reminder_status,
    r.original_reminder_id
  FROM reminders r
  WHERE r.user_id = user_uuid
    AND r.is_active = true
    AND r.reminder_status IN ('active', 'upcoming')
    AND r.due_date >= CURRENT_DATE
    AND r.due_date <= CURRENT_DATE + (days_ahead || ' days')::INTERVAL
  ORDER BY r.due_date ASC, r.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get reminder history (completed reminders)
CREATE OR REPLACE FUNCTION get_reminder_history(
  user_uuid UUID, 
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  due_date DATE,
  amount NUMERIC,
  completion_date TIMESTAMP WITH TIME ZONE,
  payment_status TEXT,
  paid_amount NUMERIC,
  is_recurring BOOLEAN,
  recurrence_pattern VARCHAR(20),
  original_reminder_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.category,
    r.due_date,
    r.amount,
    r.completion_date,
    r.payment_status,
    r.paid_amount,
    r.is_recurring,
    r.recurrence_pattern,
    r.original_reminder_id
  FROM reminders r
  WHERE r.user_id = user_uuid
    AND r.reminder_status = 'completed'
  ORDER BY r.completion_date DESC NULLS LAST, r.due_date DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recurring reminder templates
CREATE OR REPLACE FUNCTION get_recurring_templates(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  amount NUMERIC,
  recurrence_pattern VARCHAR(20),
  recurrence_interval INTEGER,
  next_occurrence_date DATE,
  total_occurrences BIGINT,
  completed_occurrences BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.category,
    r.amount,
    r.recurrence_pattern,
    r.recurrence_interval,
    r.next_occurrence_date,
    COUNT(all_occurrences.id) as total_occurrences,
    COUNT(completed_occurrences.id) as completed_occurrences
  FROM reminders r
  LEFT JOIN reminders all_occurrences ON (
    all_occurrences.original_reminder_id = r.id OR 
    (all_occurrences.id = r.id AND r.original_reminder_id IS NULL)
  )
  LEFT JOIN reminders completed_occurrences ON (
    completed_occurrences.original_reminder_id = r.id AND 
    completed_occurrences.reminder_status = 'completed'
  )
  WHERE r.user_id = user_uuid
    AND r.is_recurring = true
    AND (r.is_template = true OR r.original_reminder_id IS NULL)
    AND r.is_active = true
  GROUP BY r.id, r.title, r.category, r.amount, r.recurrence_pattern, 
           r.recurrence_interval, r.next_occurrence_date
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create upcoming reminders
CREATE OR REPLACE FUNCTION auto_create_upcoming_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- When a recurring reminder is marked as completed, create next occurrence
  IF NEW.reminder_status = 'completed' AND OLD.reminder_status != 'completed' AND NEW.is_recurring THEN
    PERFORM create_next_occurrence(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-creating upcoming reminders
DROP TRIGGER IF EXISTS trigger_auto_create_upcoming ON reminders;
CREATE TRIGGER trigger_auto_create_upcoming
  AFTER UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_upcoming_reminders();

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_next_occurrence(DATE, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_next_occurrence(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_reminder(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_reminders(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_reminder_history(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recurring_templates(UUID) TO authenticated;

-- Update RLS policies for new columns
DROP POLICY IF EXISTS "Users can view their own reminders" ON reminders;
CREATE POLICY "Users can view their own reminders" ON reminders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own reminders" ON reminders;
CREATE POLICY "Users can insert their own reminders" ON reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reminders" ON reminders;
CREATE POLICY "Users can update their own reminders" ON reminders
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reminders" ON reminders;
CREATE POLICY "Users can delete their own reminders" ON reminders
  FOR DELETE USING (auth.uid() = user_id);
