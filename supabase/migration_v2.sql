-- Migration script for existing Reminder Application installations
-- Run this ONLY if you already have the application deployed and want to add the new features
-- This adds payment status tracking and new reminder types to existing installations

-- Add new columns to reminders table
ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS remind_1_day boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS remind_due_day boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','overdue')),
ADD COLUMN IF NOT EXISTS paid_at timestamptz,
ADD COLUMN IF NOT EXISTS paid_amount numeric;

-- Update sent_notifications table to support new notification types
ALTER TABLE sent_notifications 
DROP CONSTRAINT IF EXISTS sent_notifications_notification_type_check;

ALTER TABLE sent_notifications 
ADD CONSTRAINT sent_notifications_notification_type_check 
CHECK (notification_type IN ('10_day','5_day','weekend','1_day','due_day'));

-- Update the get_reminders_to_notify function
CREATE OR REPLACE FUNCTION get_reminders_to_notify()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  category text,
  due_date date,
  amount numeric,
  email text,
  phone varchar,
  telegram_chat_id text,
  timezone text,
  notify_type text,
  days_until integer,
  payment_status text
) AS $$
BEGIN
  RETURN QUERY
  WITH reminder_data AS (
    SELECT 
      r.id,
      r.user_id,
      r.title,
      r.category,
      r.due_date,
      r.amount,
      r.payment_status,
      p.email,
      p.phone,
      p.telegram_chat_id,
      p.timezone,
      (r.due_date - current_date) AS days_until
    FROM reminders r
    JOIN profiles p ON r.user_id = p.id
    WHERE r.is_active = true
      AND r.payment_status = 'unpaid'
      AND r.due_date >= current_date - interval '1 day' -- Include due day
  )
  SELECT 
    rd.id,
    rd.user_id,
    rd.title,
    rd.category,
    rd.due_date,
    rd.amount,
    rd.email,
    rd.phone,
    rd.telegram_chat_id,
    rd.timezone,
    CASE 
      WHEN rd.days_until = 10 THEN '10_day'
      WHEN rd.days_until = 5 THEN '5_day'
      WHEN rd.days_until = 1 THEN '1_day'
      WHEN rd.days_until = 0 THEN 'due_day'
      WHEN extract(dow FROM current_date) IN (0, 6) AND rd.days_until BETWEEN 0 AND 2 THEN 'weekend'
      ELSE null
    END AS notify_type,
    rd.days_until,
    rd.payment_status
  FROM reminder_data rd
  JOIN reminders r ON rd.id = r.id
  WHERE (
    (rd.days_until = 10 AND r.remind_10_days = true) OR
    (rd.days_until = 5 AND r.remind_5_days = true) OR
    (rd.days_until = 1 AND COALESCE(r.remind_1_day, true) = true) OR
    (rd.days_until = 0 AND COALESCE(r.remind_due_day, true) = true) OR
    (extract(dow FROM current_date) IN (0, 6) AND rd.days_until BETWEEN 0 AND 2 AND r.remind_weekend = true)
  )
  AND NOT EXISTS (
    SELECT 1 FROM sent_notifications sn 
    WHERE sn.reminder_id = rd.id 
    AND sn.notification_type = CASE 
      WHEN rd.days_until = 10 THEN '10_day'
      WHEN rd.days_until = 5 THEN '5_day'
      WHEN rd.days_until = 1 THEN '1_day'
      WHEN rd.days_until = 0 THEN 'due_day'
      WHEN extract(dow FROM current_date) IN (0, 6) AND rd.days_until BETWEEN 0 AND 2 THEN 'weekend'
    END
  );
END;
$$ LANGUAGE plpgsql;

-- Add the mark_payment_as_paid function if it doesn't exist
CREATE OR REPLACE FUNCTION mark_payment_as_paid(
  reminder_uuid uuid,
  paid_amount_param numeric DEFAULT null
)
RETURNS json AS $$
DECLARE
  reminder_record record;
  result json;
BEGIN
  -- Get the reminder and verify it exists and is unpaid
  SELECT * INTO reminder_record 
  FROM reminders 
  WHERE id = reminder_uuid 
    AND is_active = true 
    AND payment_status = 'unpaid';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Reminder not found or already paid'
    );
  END IF;
  
  -- Update the reminder as paid
  UPDATE reminders 
  SET 
    payment_status = 'paid',
    paid_at = now(),
    paid_amount = COALESCE(paid_amount_param, amount),
    updated_at = now()
  WHERE id = reminder_uuid;
  
  -- Return success response
  RETURN json_build_object(
    'success', true,
    'message', 'Payment marked as paid successfully',
    'reminder_id', reminder_uuid,
    'paid_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing reminders to have the new default values
UPDATE reminders 
SET 
  remind_1_day = true,
  remind_due_day = true,
  payment_status = 'unpaid'
WHERE remind_1_day IS NULL 
   OR remind_due_day IS NULL 
   OR payment_status IS NULL;

-- Create indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_reminders_payment_status ON reminders(payment_status);
CREATE INDEX IF NOT EXISTS idx_reminders_paid_at ON reminders(paid_at);

-- Verify migration
SELECT 
  COUNT(*) as total_reminders,
  COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as unpaid_reminders,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_reminders,
  COUNT(CASE WHEN remind_1_day = true THEN 1 END) as reminders_with_1day_alert,
  COUNT(CASE WHEN remind_due_day = true THEN 1 END) as reminders_with_due_day_alert
FROM reminders 
WHERE is_active = true;

-- Display migration completion message
SELECT 'Migration completed successfully! New features are now available.' as status;
