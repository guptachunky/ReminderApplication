'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface AddReminderFormProps {
  userId: string
}

const categories = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'phone', label: 'Phone' },
  { value: 'other', label: 'Other' },
]

export default function AddReminderForm({ userId }: AddReminderFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    category: 'other',
    due_date: '',
    amount: '',
    is_recurring: false,
    recurrence_pattern: 'monthly',
    recurrence_interval: 1,
    recurrence_end_date: '',
    remind_10_days: true,
    remind_5_days: true,
    remind_weekend: true,
    remind_1_day: true,
    remind_due_day: true,
  })

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const reminderData = {
        user_id: userId,
        title: formData.title,
        category: formData.category,
        due_date: formData.due_date,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
        recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
        recurrence_end_date: formData.is_recurring && formData.recurrence_end_date ? formData.recurrence_end_date : null,
        remind_10_days: formData.remind_10_days,
        remind_5_days: formData.remind_5_days,
        remind_weekend: formData.remind_weekend,
        remind_1_day: formData.remind_1_day,
        remind_due_day: formData.remind_due_day,
        reminder_status: 'active',
        is_template: formData.is_recurring
      }

      // If recurring, calculate next occurrence date
      if (formData.is_recurring) {
        const { data: nextDate, error: calcError } = await supabase.rpc('calculate_next_occurrence', {
          current_date: formData.due_date,
          pattern: formData.recurrence_pattern,
          interval_val: formData.recurrence_interval
        })
        
        if (!calcError && nextDate) {
          reminderData.next_occurrence_date = nextDate
        }
      }

      const { error } = await supabase.from('reminders').insert([reminderData])

      if (error) {
        toast.error('Error creating reminder')
        console.error('Error:', error)
      } else {
        toast.success('Reminder created successfully!')
        setFormData({
          title: '',
          category: 'other',
          due_date: '',
          amount: '',
          is_recurring: false,
          recurrence_pattern: 'monthly',
          recurrence_interval: 1,
          recurrence_end_date: '',
          remind_10_days: true,
          remind_5_days: true,
          remind_weekend: true,
          remind_1_day: true,
          remind_due_day: true,
        })
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
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          className="input-field mt-1"
          placeholder="e.g., Credit Card Payment"
          value={formData.title}
          onChange={handleInputChange}
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          id="category"
          name="category"
          className="input-field mt-1"
          value={formData.category}
          onChange={handleInputChange}
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
          Due Date *
        </label>
        <input
          type="date"
          id="due_date"
          name="due_date"
          required
          className="input-field mt-1"
          value={formData.due_date}
          onChange={handleInputChange}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Amount (₹)
        </label>
        <input
          type="number"
          id="amount"
          name="amount"
          step="0.01"
          min="0"
          className="input-field mt-1"
          placeholder="0.00"
          value={formData.amount}
          onChange={handleInputChange}
        />
      </div>

      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            name="is_recurring"
            checked={formData.is_recurring}
            onChange={handleInputChange}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">Make this a recurring reminder</span>
        </label>

        {formData.is_recurring && (
          <div className="space-y-3 pl-6 border-l-2 border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="recurrence_pattern" className="block text-sm font-medium text-gray-700">
                  Repeat Every
                </label>
                <select
                  id="recurrence_pattern"
                  name="recurrence_pattern"
                  className="input-field mt-1"
                  value={formData.recurrence_pattern}
                  onChange={handleInputChange}
                >
                  <option value="daily">Day(s)</option>
                  <option value="weekly">Week(s)</option>
                  <option value="monthly">Month(s)</option>
                  <option value="yearly">Year(s)</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="recurrence_interval" className="block text-sm font-medium text-gray-700">
                  Interval
                </label>
                <input
                  type="number"
                  id="recurrence_interval"
                  name="recurrence_interval"
                  min="1"
                  max="365"
                  className="input-field mt-1"
                  value={formData.recurrence_interval}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="recurrence_end_date" className="block text-sm font-medium text-gray-700">
                End Date (Optional)
              </label>
              <input
                type="date"
                id="recurrence_end_date"
                name="recurrence_end_date"
                className="input-field mt-1"
                value={formData.recurrence_end_date}
                onChange={handleInputChange}
                min={formData.due_date || new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for indefinite recurrence
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Notification Preferences
        </label>
        
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="remind_10_days"
              checked={formData.remind_10_days}
              onChange={handleInputChange}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Remind 10 days before</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              name="remind_5_days"
              checked={formData.remind_5_days}
              onChange={handleInputChange}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Remind 5 days before</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              name="remind_weekend"
              checked={formData.remind_weekend}
              onChange={handleInputChange}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Weekend reminders</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              name="remind_1_day"
              checked={formData.remind_1_day}
              onChange={handleInputChange}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Remind 1 day before</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              name="remind_due_day"
              checked={formData.remind_due_day}
              onChange={handleInputChange}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Remind on due day</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary"
      >
        {loading ? 'Creating...' : 'Create Reminder'}
      </button>
    </form>
  )
}
