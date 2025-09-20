'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { format, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'

interface Reminder {
  id: string
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
}

interface ReminderListProps {
  reminders: Reminder[]
}

const categoryLabels: { [key: string]: string } = {
  credit_card: 'Credit Card',
  insurance: 'Insurance',
  electricity: 'Electricity',
  phone: 'Phone',
  other: 'Other',
}

const categoryColors: { [key: string]: string } = {
  credit_card: 'bg-red-100 text-red-800',
  insurance: 'bg-blue-100 text-blue-800',
  electricity: 'bg-yellow-100 text-yellow-800',
  phone: 'bg-green-100 text-green-800',
  other: 'bg-gray-100 text-gray-800',
}

export default function ReminderList({ reminders }: ReminderListProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (reminderId: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) {
      return
    }

    setLoading(reminderId)
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ is_active: false })
        .eq('id', reminderId)

      if (error) {
        toast.error('Error deleting reminder')
        console.error('Error:', error)
      } else {
        toast.success('Reminder deleted successfully')
        router.refresh()
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Error:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleMarkAsPaid = async (reminderId: string) => {
    if (!confirm('Mark this payment as paid?')) {
      return
    }

    setMarkingPaid(reminderId)
    try {
      const response = await fetch('/api/mark-paid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reminderId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Payment marked as paid successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to mark payment as paid')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Error:', error)
    } finally {
      setMarkingPaid(null)
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    return differenceInDays(due, today)
  }

  const getUrgencyColor = (daysUntil: number, paymentStatus: string) => {
    if (paymentStatus === 'paid') return 'border-l-green-500 bg-green-50'
    if (daysUntil < 0) return 'border-l-red-500 bg-red-50'
    if (daysUntil <= 2) return 'border-l-orange-500 bg-orange-50'
    if (daysUntil <= 7) return 'border-l-yellow-500 bg-yellow-50'
    return 'border-l-blue-500 bg-blue-50'
  }

  const getUrgencyText = (daysUntil: number, paymentStatus: string, paidAt: string | null) => {
    if (paymentStatus === 'paid') {
      return `Paid ${paidAt ? format(new Date(paidAt), 'MMM d, yyyy') : ''}`
    }
    if (daysUntil < 0) return `Overdue by ${Math.abs(daysUntil)} day(s)`
    if (daysUntil === 0) return 'Due today'
    if (daysUntil === 1) return 'Due tomorrow'
    return `Due in ${daysUntil} day(s)`
  }

  if (reminders.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-6xl mb-4">📅</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No reminders yet</h3>
        <p className="text-gray-600">
          Create your first reminder to get started with smart notifications.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reminders.map((reminder) => {
        const daysUntil = getDaysUntilDue(reminder.due_date)
        const urgencyColor = getUrgencyColor(daysUntil, reminder.payment_status)
        const urgencyText = getUrgencyText(daysUntil, reminder.payment_status, reminder.paid_at)

        return (
          <div
            key={reminder.id}
            className={`border-l-4 p-4 rounded-r-lg ${urgencyColor} transition-all duration-200 hover:shadow-md`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {reminder.title}
                  </h3>
                  {reminder.category && (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        categoryColors[reminder.category] || categoryColors.other
                      }`}
                    >
                      {categoryLabels[reminder.category] || 'Other'}
                    </span>
                  )}
                  {reminder.recurring_interval && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                      {reminder.recurring_interval}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Due:</span>{' '}
                    {format(new Date(reminder.due_date), 'PPP')}
                  </p>
                  {reminder.amount && (
                    <p>
                      <span className="font-medium">Amount:</span> ₹{reminder.amount.toLocaleString()}
                      {reminder.paid_amount && reminder.paid_amount !== reminder.amount && (
                        <span className="text-green-600 ml-2">(Paid: ₹{reminder.paid_amount.toLocaleString()})</span>
                      )}
                    </p>
                  )}
                  <p className={`font-medium ${reminder.payment_status === 'paid' ? 'text-green-700' : 'text-gray-900'}`}>
                    {urgencyText}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {reminder.payment_status === 'paid' && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-medium">
                      ✓ Paid
                    </span>
                  )}
                  {reminder.remind_10_days && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                      10-day alert
                    </span>
                  )}
                  {reminder.remind_5_days && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                      5-day alert
                    </span>
                  )}
                  {reminder.remind_1_day && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                      1-day alert
                    </span>
                  )}
                  {reminder.remind_due_day && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                      Due day alert
                    </span>
                  )}
                  {reminder.remind_weekend && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                      Weekend alert
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {reminder.payment_status === 'unpaid' && (
                  <button
                    onClick={() => handleMarkAsPaid(reminder.id)}
                    disabled={markingPaid === reminder.id}
                    className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                  >
                    {markingPaid === reminder.id ? 'Marking...' : 'Mark Paid'}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(reminder.id)}
                  disabled={loading === reminder.id}
                  className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                >
                  {loading === reminder.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
