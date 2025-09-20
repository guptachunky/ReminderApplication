-- Modified Scheduling configuration for Supabase pg_cron
-- Run this in your Supabase SQL Editor after deploying the Edge Function

-- First, ensure the required extensions are enabled
create extension if not exists pg_cron;
create extension if not exists http;

-- Schedule the reminder function to run daily at 6:00 AM UTC
-- Adjust the time as needed for your timezone
select cron.schedule(
  'send-daily-reminders',
  '0 6 * * *', -- Every day at 06:00 UTC (11:30 AM IST)
  $$
  select
    net.http_post(
      url := 'https://hjhgrddwoukzitdmdopj.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqaGdyZGR3b3Vreml0ZG1kb3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzk2OTUsImV4cCI6MjA3Mzk1NTY5NX0.oAfABDv3oBRx9Y5T7Et4R4koDoKnl7znIoPp78JZpFw'
      ),
      body := jsonb_build_object(
        'triggered_by', 'pg_cron',
        'timestamp', now()
      )
    ) as request_id;
  $$
);

-- Optional: Create a manual trigger function for testing
create or replace function trigger_reminders_manually()
returns json as $$
declare
  result json;
begin
  select net.http_post(
    url := 'https://hjhgrddwoukzitdmdopj.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqaGdyZGR3b3Vreml0ZG1kb3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzk2OTUsImV4cCI6MjA3Mzk1NTY5NX0.oAfABDv3oBRx9Y5T7Et4R4koDoKnl7znIoPp78JZpFw'
    ),
    body := jsonb_build_object(
      'triggered_by', 'manual',
      'timestamp', now()
    )
  ) into result;
  
  return result;
end;
$$ language plpgsql security definer;

-- View scheduled jobs
-- select * from cron.job;

-- To remove the scheduled job (if needed):
-- select cron.unschedule('send-daily-reminders');

-- To check the job execution history:
-- select * from cron.job_run_details order by start_time desc limit 10;
