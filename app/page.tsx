import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = createServerClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Reminder App
          </h1>
          <p className="text-gray-600 mb-8">
            Never miss a payment again with smart reminders
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/auth/login"
            className="w-full btn-primary block text-center"
          >
            Sign In
          </Link>
          
          <Link
            href="/auth/register"
            className="w-full btn-secondary block text-center"
          >
            Create Account
          </Link>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <p>Features:</p>
          <ul className="mt-2 space-y-1">
            <li>📧 Email notifications</li>
            <li>📱 Telegram alerts</li>
            <li>📅 Smart scheduling</li>
            <li>💳 Payment tracking</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
