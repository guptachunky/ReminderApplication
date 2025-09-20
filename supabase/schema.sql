-- Database schema for Reminder Application
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- profiles: link to auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone varchar,
  telegram_chat_id text,
  timezone text default 'Asia/Kolkata',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- reminders table
create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  category text check (category in ('credit_card','insurance','electricity','phone','other')),
  due_date date not null,
  amount numeric,
  recurring_interval text, -- e.g. 'monthly' or null
  remind_10_days boolean default true,
  remind_5_days boolean default true,
  remind_weekend boolean default true,
  remind_1_day boolean default true,
  remind_due_day boolean default true,
  is_active boolean default true,
  payment_status text default 'unpaid' check (payment_status in ('unpaid','paid','overdue')),
  paid_at timestamptz,
  paid_amount numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- track sent notifications so we don't send duplicates
create table sent_notifications (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid references reminders(id) on delete cascade,
  notification_type text check (notification_type in ('10_day','5_day','weekend','1_day','due_day')),
  sent_at timestamptz default now(),
  delivery_status text default 'sent' check (delivery_status in ('sent','failed','pending'))
);

-- Create indexes for better performance
create index idx_reminders_user_id on reminders(user_id);
create index idx_reminders_due_date on reminders(due_date);
create index idx_reminders_active on reminders(is_active);
create index idx_sent_notifications_reminder_id on sent_notifications(reminder_id);
create index idx_sent_notifications_type on sent_notifications(notification_type);

-- Create a function to automatically create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a function to get reminders that need notifications
create or replace function get_reminders_to_notify()
returns table (
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
) as $$
begin
  return query
  with reminder_data as (
    select 
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
      (r.due_date - current_date) as days_until
    from reminders r
    join profiles p on r.user_id = p.id
    where r.is_active = true
      and r.payment_status = 'unpaid'
      and r.due_date >= current_date - interval '1 day' -- Include due day
  )
  select 
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
    case 
      when rd.days_until = 10 then '10_day'
      when rd.days_until = 5 then '5_day'
      when rd.days_until = 1 then '1_day'
      when rd.days_until = 0 then 'due_day'
      when extract(dow from current_date) in (0, 6) and rd.days_until between 0 and 2 then 'weekend'
      else null
    end as notify_type,
    rd.days_until,
    rd.payment_status
  from reminder_data rd
  join reminders r on rd.id = r.id
  where (
    (rd.days_until = 10 and r.remind_10_days = true) or
    (rd.days_until = 5 and r.remind_5_days = true) or
    (rd.days_until = 1 and r.remind_1_day = true) or
    (rd.days_until = 0 and r.remind_due_day = true) or
    (extract(dow from current_date) in (0, 6) and rd.days_until between 0 and 2 and r.remind_weekend = true)
  )
  and not exists (
    select 1 from sent_notifications sn 
    where sn.reminder_id = rd.id 
    and sn.notification_type = case 
      when rd.days_until = 10 then '10_day'
      when rd.days_until = 5 then '5_day'
      when rd.days_until = 1 then '1_day'
      when rd.days_until = 0 then 'due_day'
      when extract(dow from current_date) in (0, 6) and rd.days_until between 0 and 2 then 'weekend'
    end
  );
end;
$$ language plpgsql;

-- Function to mark a payment as paid
create or replace function mark_payment_as_paid(
  reminder_uuid uuid,
  paid_amount_param numeric default null
)
returns json as $$
declare
  reminder_record record;
  result json;
begin
  -- Get the reminder and verify it exists and is unpaid
  select * into reminder_record 
  from reminders 
  where id = reminder_uuid 
    and is_active = true 
    and payment_status = 'unpaid';
  
  if not found then
    return json_build_object(
      'success', false,
      'error', 'Reminder not found or already paid'
    );
  end if;
  
  -- Update the reminder as paid
  update reminders 
  set 
    payment_status = 'paid',
    paid_at = now(),
    paid_amount = coalesce(paid_amount_param, amount),
    updated_at = now()
  where id = reminder_uuid;
  
  -- Return success response
  return json_build_object(
    'success', true,
    'message', 'Payment marked as paid successfully',
    'reminder_id', reminder_uuid,
    'paid_at', now()
  );
end;
$$ language plpgsql security definer;

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table reminders enable row level security;
alter table sent_notifications enable row level security;

-- Create RLS policies
-- Profiles: Users can only see and edit their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Reminders: Users can only see and manage their own reminders
create policy "Users can view own reminders" on reminders
  for select using (auth.uid() = user_id);

create policy "Users can insert own reminders" on reminders
  for insert with check (auth.uid() = user_id);

create policy "Users can update own reminders" on reminders
  for update using (auth.uid() = user_id);

create policy "Users can delete own reminders" on reminders
  for delete using (auth.uid() = user_id);

-- Sent notifications: Users can view their notification history
create policy "Users can view own notification history" on sent_notifications
  for select using (
    exists (
      select 1 from reminders r 
      where r.id = reminder_id and r.user_id = auth.uid()
    )
  );
