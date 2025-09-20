# Reminder Application

A comprehensive payment reminder system built with Next.js, Supabase, and multiple notification channels (Email, Telegram, SMS).

## Features

- 🔐 **Secure Authentication** - Email/password authentication with Supabase Auth
- 📅 **Smart Reminders** - 10-day, 5-day, and weekend notifications
- 📧 **Email Notifications** - Transactional emails via Brevo
- 📱 **Telegram Alerts** - Instant mobile notifications via Telegram bot
- 💬 **SMS Support** - Limited SMS notifications via Textbelt
- ⏰ **Automated Scheduling** - Daily cron jobs via Supabase pg_cron
- 🎨 **Modern UI** - Beautiful, responsive interface with Tailwind CSS
- 🔄 **Recurring Reminders** - Support for monthly, quarterly, and yearly payments

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Notifications**: Brevo (Email), Telegram Bot API, Textbelt (SMS)
- **Deployment**: Vercel (Frontend) + Supabase (Backend)
- **Scheduling**: Supabase pg_cron + pg_net

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd ReminderApplication
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.local.example .env.local
   # Fill in your environment variables
   ```

3. **Database Setup**
   - Create a Supabase project
   - Run the SQL scripts in `supabase/schema.sql`
   - Set up the Edge Function and scheduling

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── settings/          # User settings
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── AddReminderForm.tsx
│   ├── ReminderList.tsx
│   ├── Navbar.tsx
│   └── ProfileSettings.tsx
├── lib/                   # Utility libraries
│   └── supabase.ts       # Supabase client configuration
├── supabase/             # Database and functions
│   ├── functions/        # Edge Functions
│   ├── schema.sql        # Database schema
│   └── scheduling.sql    # Cron job setup
└── README.md
```

## Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email Provider (Brevo)
BREVO_API_KEY=your_brevo_api_key

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# SMS Provider (Optional - Textbelt)
TEXTBELT_KEY=your_textbelt_key
```

## Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy

### Backend (Supabase)
1. Create Supabase project
2. Run database schema
3. Deploy Edge Function
4. Set up scheduling
5. Configure secrets in Vault

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please create an issue in the GitHub repository.
