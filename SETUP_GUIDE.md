# Complete Setup Guide - Enhanced Reminder Application

This guide provides step-by-step instructions for setting up your enhanced reminder application with payment tracking and clickable payment links.

## 🆕 New Features in This Version

- **Enhanced Reminder Schedule**: 1-day and due-day notifications in addition to 10-day, 5-day, and weekend alerts
- **Payment Status Tracking**: Mark payments as paid to stop future reminders
- **Clickable Payment Links**: Direct links in emails and SMS to mark payments as paid
- **Improved UI**: Payment status indicators and manual payment marking
- **Smart Filtering**: Paid reminders are automatically excluded from future notifications

## Prerequisites

- Node.js 18+ installed
- Git installed
- GitHub account
- Email address for account creation
- Existing Supabase, Brevo, and Vercel accounts (as mentioned in your request)

## Phase 1: Fresh Installation Setup (15-20 minutes)

### 1.1 Use Your Supabase Account

Since you already have a Supabase account:

2. **Create New Project**
   - Click "New project"
   - Choose organization (or create one)
   - Project name: `reminder-application`
   - Database password: Generate a strong password (save it!)
   - Region: Choose closest to your location
   - Click "Create new project"
   - **Wait 2-3 minutes** for project to be ready

3. **Get Supabase Keys**
   - Go to Settings → API
   - Copy these values (you'll need them later):
     - `Project URL`
     - `anon public` key
     - `service_role` key (keep this secret!)

### 1.2 Create Brevo Account (Email Service)

1. **Sign up for Brevo**
   - Go to [https://www.brevo.com](https://www.brevo.com)
   - Click "Sign up free"
   - Complete registration and email verification

2. **Get API Key**
   - Go to Account → SMTP & API → API Keys
   - Click "Generate a new API key"
   - Name: `reminder-app`
   - Copy the API key (save it!)

### 1.3 Create Telegram Bot (Optional but Recommended)

1. **Create Bot with BotFather**
   - Open Telegram and search for `@BotFather`
   - Send `/start` to BotFather
   - Send `/newbot`
   - Bot name: `Your Reminder Bot` (or any name)
   - Bot username: `your_reminder_bot` (must end with 'bot')
   - Copy the bot token (save it!)

2. **Get Your Chat ID (for testing)**
   - Search for your bot by username
   - Send `/start` to your bot
   - Go to: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Look for `"chat":{"id":123456789}` - this is your chat ID

### 1.4 Create Vercel Account

1. **Sign up for Vercel**
   - Go to [https://vercel.com](https://vercel.com)
   - Click "Sign up" → "Continue with GitHub"
   - Authorize Vercel to access your repositories

## Phase 2: Database Setup (10-15 minutes)

### 2.1 Run Database Schema

1. **Open Supabase SQL Editor**
   - In your Supabase project dashboard
   - Go to SQL Editor → "New query"

2. **Execute Schema Script**
   - Copy the entire content from `supabase/schema.sql`
   - Paste into the SQL editor
   - Click "Run" (bottom right)
   - Wait for "Success. No rows returned" message

3. **Verify Tables Created**
   - Go to Table Editor
   - You should see: `profiles`, `reminders`, `sent_notifications`

### 2.2 Configure Environment Variables

1. **Create Local Environment File**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Fill in Environment Variables**
   Edit `.env.local` with your actual values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   BREVO_API_KEY=your_brevo_api_key_here
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   TEXTBELT_KEY=textbelt_demo_key_or_your_key
   ```

## Phase 3: Deploy Edge Function (15-20 minutes)

### 3.1 Install Supabase CLI

1. **Install CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```
   - This will open browser for authentication

3. **Link Your Project**
   ```bash
   supabase link --project-ref your-project-ref
   ```
   - Get project-ref from your Supabase URL

### 3.2 Deploy Edge Function

1. **Deploy Function**
   ```bash
   supabase functions deploy send-reminders
   ```

2. **Set Environment Variables in Supabase**
   ```bash
   supabase secrets set BREVO_API_KEY=your_brevo_api_key
   supabase secrets set TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   supabase secrets set TEXTBELT_KEY=your_textbelt_key
   ```

3. **Test Function (Optional)**
   ```bash
   supabase functions invoke send-reminders --method POST
   ```

## Phase 4: Configure Scheduling (10 minutes)

### 4.1 Set up Vault Secrets

1. **Store Secrets in Vault**
   - Go to Supabase SQL Editor
   - Run these commands (replace with your actual values):
   ```sql
   insert into vault.secrets (name, secret) 
   values ('project_url', 'https://your-project-ref.supabase.co');
   
   insert into vault.secrets (name, secret) 
   values ('service_role_key', 'your-service-role-key');
   ```

### 4.2 Enable Scheduling

1. **Run Scheduling Script**
   - Copy content from `supabase/scheduling.sql`
   - Paste in SQL Editor and run
   - This sets up daily execution at 6:00 AM UTC

2. **Verify Cron Job**
   ```sql
   select * from cron.job;
   ```
   - Should show your `send-daily-reminders` job

## Phase 5: Deploy Frontend (10 minutes)

### 5.1 Push to GitHub

1. **Initialize Git (if not done)**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create GitHub Repository**
   - Go to GitHub → New repository
   - Name: `reminder-application`
   - Make it public or private
   - Don't initialize with README (you already have one)

3. **Push Code**
   ```bash
   git remote add origin https://github.com/yourusername/reminder-application.git
   git branch -M main
   git push -u origin main
   ```

### 5.2 Deploy to Vercel

1. **Import Project**
   - Go to Vercel dashboard
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables**
   - In Vercel project settings → Environment Variables
   - Add these (use the same values from your `.env.local`):
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Get your Vercel URL (e.g., `https://your-app.vercel.app`)

## Phase 6: Testing & Verification (15 minutes)

### 6.1 Test User Registration

1. **Visit Your App**
   - Go to your Vercel URL
   - Click "Create Account"
   - Register with your email
   - Check email for verification link

2. **Complete Profile**
   - Login after verification
   - Go to Settings
   - Add your phone number and Telegram chat ID
   - Save settings

### 6.2 Test Reminder Creation

1. **Create Test Reminder**
   - Go to Dashboard
   - Add a reminder with due date tomorrow
   - Enable all notification types

2. **Manual Test (Optional)**
   - In Supabase SQL Editor:
   ```sql
   select trigger_reminders_manually();
   ```
   - Check if you receive notifications

### 6.3 Verify Scheduling

1. **Check Cron Status**
   ```sql
   select * from cron.job_run_details 
   order by start_time desc limit 5;
   ```

2. **Monitor Function Logs**
   - Go to Supabase → Edge Functions → send-reminders
   - Check logs for execution

## Phase 7: Production Considerations

### 7.1 Security Checklist

- [ ] Service role key is not exposed in client code
- [ ] RLS policies are enabled on all tables
- [ ] Environment variables are properly set
- [ ] Secrets are stored in Supabase Vault

### 7.2 Monitoring Setup

1. **Set up Alerts**
   - Monitor Brevo email quota
   - Check Supabase usage limits
   - Monitor Edge Function execution

2. **Regular Maintenance**
   - Clean up old `sent_notifications` records monthly
   - Monitor database size
   - Update dependencies regularly

## Troubleshooting

### Common Issues

1. **Edge Function Not Working**
   - Check environment variables are set
   - Verify function deployment
   - Check function logs

2. **Emails Not Sending**
   - Verify Brevo API key
   - Check sender domain configuration
   - Monitor Brevo quota

3. **Telegram Not Working**
   - Verify bot token
   - Check chat ID format
   - Ensure bot is not blocked

4. **Scheduling Issues**
   - Verify cron extension is enabled
   - Check vault secrets
   - Monitor cron job execution

### Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Brevo API Documentation](https://developers.brevo.com)
- [Telegram Bot API](https://core.telegram.org/bots/api)

## Cost Estimation (Free Tiers)

- **Supabase**: Free up to 500MB database, 2GB bandwidth
- **Vercel**: Free for personal projects, unlimited deployments
- **Brevo**: Free up to 300 emails/day
- **Telegram**: Completely free
- **Textbelt**: 1 free SMS/day (demo), then paid

## Next Steps

After successful setup:

1. **Add More Reminders** - Test with various categories and dates
2. **Invite Family/Friends** - Share the app for broader testing
3. **Monitor Usage** - Keep track of quotas and limits
4. **Customize** - Modify notification templates and timing
5. **Scale** - Consider paid plans as usage grows

---

**Congratulations!** 🎉 Your reminder application is now fully operational with automated notifications across multiple channels.

For any issues or questions, refer to the troubleshooting section or create an issue in your GitHub repository.
