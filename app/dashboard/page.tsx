import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import EnhancedReminderList from '@/components/EnhancedReminderList'
import AddReminderForm from '@/components/AddReminderForm'

export default async function Dashboard() {
  const supabase = createServerClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Note: EnhancedReminderList will fetch its own data based on tabs
  // No need to pre-fetch reminders here

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Manage your payment reminders and never miss a due date
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Reminder Form */}
            <div className="lg:col-span-1">
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Add New Reminder
                </h2>
                <AddReminderForm userId={user.id} />
              </div>
            </div>

            {/* Enhanced Reminders List */}
            <div className="lg:col-span-2">
              <div className="card">
                <EnhancedReminderList userId={user.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
