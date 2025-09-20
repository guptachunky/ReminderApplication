-- Scheduling configuration for Supabase pg_cron
-- Run this in your Supabase SQL Editor after deploying the Edge Function

-- First, ensure the required extensions are enabled
create extension if not exists pg_cron;
create extension if not exists http;

-- Store the project URL and service role key in Vault (recommended by Supabase)
-- You'll need to replace these values with your actual project URL and service role key
-- Run these commands in the Supabase SQL Editor:

-- insert into vault.secrets (name, secret) values ('project_url', 'https://your-project-ref.supabase.co');
-- insert into vault.secrets (name, secret) values ('service_role_key', 'your-service-role-key');

-- Schedule the reminder function to run daily at 6:00 AM UTC
-- Adjust the time as needed for your timezone
select cron.schedule(
  'send-daily-reminders',
  '0 6 * * *', -- Every day at 06:00 UTC (11:30 AM IST)
  $$
  select
    net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
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
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
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
