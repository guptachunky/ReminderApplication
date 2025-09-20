'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  telegram_chat_id: string | null
  timezone: string | null
  created_at: string
  updated_at: string
}

interface ProfileSettingsProps {
  user: any
  profile: Profile | null
}

const timezones = [
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
]

export default function ProfileSettings({ user, profile }: ProfileSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    telegram_chat_id: profile?.telegram_chat_id || '',
    timezone: profile?.timezone || 'Asia/Kolkata',
  })

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name,
          email: user.email,
          phone: formData.phone || null,
          telegram_chat_id: formData.telegram_chat_id || null,
          timezone: formData.timezone,
          updated_at: new Date().toISOString(),
        })

      if (error) {
        toast.error('Error updating profile')
        console.error('Error:', error)
      } else {
        toast.success('Profile updated successfully!')
        router.refresh()
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            className="input-field mt-1"
            placeholder="Enter your full name"
            value={formData.full_name}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            disabled
            className="input-field mt-1 bg-gray-50 text-gray-500"
            value={user.email}
          />
          <p className="mt-1 text-xs text-gray-500">
            Email cannot be changed here. Use account settings.
          </p>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            className="input-field mt-1"
            placeholder="+91 9876543210"
            value={formData.phone}
            onChange={handleInputChange}
          />
          <p className="mt-1 text-xs text-gray-500">
            For SMS notifications (limited free quota available)
          </p>
        </div>

        <div>
          <label htmlFor="telegram_chat_id" className="block text-sm font-medium text-gray-700">
            Telegram Chat ID
          </label>
          <input
            type="text"
            id="telegram_chat_id"
            name="telegram_chat_id"
            className="input-field mt-1"
            placeholder="123456789"
            value={formData.telegram_chat_id}
            onChange={handleInputChange}
          />
          <p className="mt-1 text-xs text-gray-500">
            Get this by messaging your Telegram bot with /start
          </p>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            className="input-field mt-1"
            value={formData.timezone}
            onChange={handleInputChange}
          >
            {timezones.map(tz => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Used to calculate reminder timing accurately
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Current Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Email: Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              formData.telegram_chat_id ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <span>Telegram: {formData.telegram_chat_id ? 'Connected' : 'Not connected'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              formData.phone ? 'bg-yellow-500' : 'bg-gray-300'
            }`}></div>
            <span>SMS: {formData.phone ? 'Limited' : 'Not configured'}</span>
          </div>
        </div>
      </div>
    </form>
  )
}
