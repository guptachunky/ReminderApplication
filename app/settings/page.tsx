import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ProfileSettings from '@/components/ProfileSettings'

export default async function Settings() {
  const supabase = createServerClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-2 text-gray-600">
              Manage your profile and notification preferences
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Profile & Notifications
              </h2>
              <ProfileSettings user={user} profile={profile} />
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Telegram Bot Setup
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">
                  How to connect Telegram notifications:
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>Search for your bot on Telegram (you'll get the bot username after deployment)</li>
                  <li>Send <code className="bg-blue-100 px-1 rounded">/start</code> to the bot</li>
                  <li>The bot will reply with your Chat ID</li>
                  <li>Copy and paste the Chat ID in the field above</li>
                  <li>Save your settings</li>
                </ol>
                <p className="mt-3 text-xs text-blue-700">
                  Note: The Telegram bot will be available after you complete the deployment setup.
                </p>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Notification Methods
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-green-900">Email Notifications</h3>
                    <p className="text-sm text-green-700">Always enabled for all users</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    Active
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-blue-900">Telegram Notifications</h3>
                    <p className="text-sm text-blue-700">
                      {profile?.telegram_chat_id ? 'Connected and active' : 'Not connected'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    profile?.telegram_chat_id 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {profile?.telegram_chat_id ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-yellow-900">SMS Notifications</h3>
                    <p className="text-sm text-yellow-700">
                      {profile?.phone ? 'Phone number added (limited free SMS)' : 'No phone number'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    profile?.phone 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {profile?.phone ? 'Limited' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
