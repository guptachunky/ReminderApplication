import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ReminderList from '@/components/ReminderList'
import AddReminderForm from '@/components/AddReminderForm'

export default async function Dashboard() {
  const supabase = createServerClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user's reminders
  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching reminders:', error)
  }

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

            {/* Reminders List */}
            <div className="lg:col-span-2">
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Reminders ({reminders?.length || 0})
                </h2>
                <ReminderList reminders={reminders || []} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
