export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          phone: string | null
          telegram_chat_id: string | null
          timezone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          telegram_chat_id?: string | null
          timezone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          telegram_chat_id?: string | null
          timezone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          title: string
          category: string | null
          due_date: string
          amount: number | null
          recurring_interval: string | null
          remind_10_days: boolean
          remind_5_days: boolean
          remind_weekend: boolean
          remind_1_day: boolean
          remind_due_day: boolean
          is_active: boolean
          payment_status: string
          paid_at: string | null
          paid_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          category?: string | null
          due_date: string
          amount?: number | null
          recurring_interval?: string | null
          remind_10_days?: boolean
          remind_5_days?: boolean
          remind_weekend?: boolean
          remind_1_day?: boolean
          remind_due_day?: boolean
          is_active?: boolean
          payment_status?: string
          paid_at?: string | null
          paid_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          category?: string | null
          due_date?: string
          amount?: number | null
          recurring_interval?: string | null
          remind_10_days?: boolean
          remind_5_days?: boolean
          remind_weekend?: boolean
          remind_1_day?: boolean
          remind_due_day?: boolean
          is_active?: boolean
          payment_status?: string
          paid_at?: string | null
          paid_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      sent_notifications: {
        Row: {
          id: string
          reminder_id: string
          notification_type: string
          sent_at: string
          delivery_status: string
        }
        Insert: {
          id?: string
          reminder_id: string
          notification_type: string
          sent_at?: string
          delivery_status?: string
        }
        Update: {
          id?: string
          reminder_id?: string
          notification_type?: string
          sent_at?: string
          delivery_status?: string
        }
      }
    }
  }
}
