'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { format, differenceInDays, isValid, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

interface Reminder {
  id: string
  title: string
  category: string | null
  due_date: string
  amount: number | null
  is_recurring: boolean
  recurrence_pattern: string | null
  recurrence_interval: number | null
  reminder_status: string
  payment_status: string
  paid_at: string | null
  paid_amount: number | null
  completion_date: string | null
  original_reminder_id: string | null
  days_until?: number
  created_at: string
  next_occurrence_date?: string | null
}

interface EnhancedReminderListProps {
  userId: string
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

const recurrenceLabels: { [key: string]: string } = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

export default function EnhancedReminderList({ userId }: EnhancedReminderListProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'history' | 'recurring'>('active')
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [triggerLoading, setTriggerLoading] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchReminders()
  }, [activeTab, userId])

  const fetchReminders = async () => {
    setLoading(true)
    try {
      let data: Reminder[] = []
      
      switch (activeTab) {
        case 'active':
          const { data: activeData, error: activeError } = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .in('reminder_status', ['active'])
            .order('due_date', { ascending: true })
          
          if (activeError) throw activeError
          data = activeData || []
          break

        case 'upcoming':
          const { data: upcomingData, error: upcomingError } = await supabase
            .rpc('get_upcoming_reminders', { user_uuid: userId, days_ahead: 12 })
          
          if (upcomingError) throw upcomingError
          data = upcomingData || []
          break

        case 'history':
          const { data: historyData, error: historyError } = await supabase
            .rpc('get_reminder_history', { user_uuid: userId, limit_count: 50, offset_count: 0 })
          
          if (historyError) throw historyError
          data = historyData || []
          break

        case 'recurring':
          const { data: recurringData, error: recurringError } = await supabase
            .rpc('get_recurring_templates', { user_uuid: userId })
          
          if (recurringError) throw recurringError
          data = recurringData || []
          break
      }
      
      setReminders(data)
    } catch (error) {
      console.error('Error fetching reminders:', error)
      toast.error('Failed to load reminders')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteReminder = async (reminderId: string) => {
    if (!confirm('Mark this reminder as completed?')) return

    setActionLoading(reminderId)
    try {
      const { data, error } = await supabase.rpc('complete_reminder', {
        reminder_uuid: reminderId
      })

      if (error) throw error

      if (data?.success) {
        toast.success(data.message || 'Reminder completed successfully')
        fetchReminders()
      } else {
        toast.error(data?.error || 'Failed to complete reminder')
      }
    } catch (error) {
      console.error('Error completing reminder:', error)
      toast.error('Failed to complete reminder')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkAsPaid = async (reminderId: string) => {
    if (!confirm('Mark this payment as paid?')) return

    setActionLoading(reminderId)
    try {
      const response = await fetch('/api/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Payment marked as paid successfully')
        fetchReminders()
      } else {
        toast.error(result.error || 'Failed to mark payment as paid')
      }
    } catch (error) {
      console.error('Error marking as paid:', error)
      toast.error('Failed to mark payment as paid')
    } finally {
      setActionLoading(null)
    }
  }

  const handleTriggerNotifications = async () => {
    setTriggerLoading(true)
    try {
      const response = await fetch('/api/trigger-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRun: true }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Notifications triggered successfully!')
      } else {
        toast.error(result.error || 'Failed to trigger notifications')
      }
    } catch (error) {
      console.error('Error triggering notifications:', error)
      toast.error('Failed to trigger notifications')
    } finally {
      setTriggerLoading(false)
    }
  }

  // Safe date formatting function to handle null or invalid dates
  const formatSafeDate = (dateString: string | null | undefined, formatStr: string = 'PPP') => {
    if (!dateString) return 'Not set';
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, formatStr) : 'Invalid date';
    } catch (error) {
      console.error('Invalid date:', dateString, error);
      return 'Invalid date';
    }
  }

  const getDaysUntilDue = (dueDate: string | null | undefined) => {
    if (!dueDate) return 0;
    try {
      const today = new Date();
      const date = parseISO(dueDate);
      return isValid(date) ? differenceInDays(date, today) : 0;
    } catch (error) {
      console.error('Error calculating days until due:', error);
      return 0;
    }
  }

  const getUrgencyColor = (daysUntil: number, paymentStatus: string, reminderStatus: string) => {
    if (reminderStatus === 'completed') return 'border-l-green-500 bg-green-50'
    if (paymentStatus === 'paid') return 'border-l-green-500 bg-green-50'
    if (daysUntil < 0) return 'border-l-red-500 bg-red-50'
    if (daysUntil <= 2) return 'border-l-orange-500 bg-orange-50'
    if (daysUntil <= 7) return 'border-l-yellow-500 bg-yellow-50'
    return 'border-l-blue-500 bg-blue-50'
  }

  const getUrgencyText = (daysUntil: number, paymentStatus: string, reminderStatus: string, paidAt: string | null, completionDate: string | null) => {
    if (reminderStatus === 'completed') {
      return `Completed ${completionDate ? formatSafeDate(completionDate, 'MMM d, yyyy') : ''}`
    }
    if (paymentStatus === 'paid') {
      return `Paid ${paidAt ? formatSafeDate(paidAt, 'MMM d, yyyy') : ''}`
    }
    if (daysUntil < 0) return `Overdue by ${Math.abs(daysUntil)} day(s)`
    if (daysUntil === 0) return 'Due today'
    if (daysUntil === 1) return 'Due tomorrow'
    return `Due in ${daysUntil} day(s)`
  }

  const renderTabButton = (tab: string, label: string, count?: number) => (
    <button
      onClick={() => setActiveTab(tab as any)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        activeTab === tab
          ? 'bg-primary-100 text-primary-700 border border-primary-200'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
          activeTab === tab ? 'bg-primary-200 text-primary-800' : 'bg-gray-200 text-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  )

  const renderReminderCard = (reminder: Reminder) => {
    const daysUntil = reminder.days_until ?? getDaysUntilDue(reminder.due_date)
    const urgencyColor = getUrgencyColor(daysUntil, reminder.payment_status || 'unpaid', reminder.reminder_status || 'active')
    const urgencyText = getUrgencyText(
      daysUntil, 
      reminder.payment_status || 'unpaid', 
      reminder.reminder_status || 'active', 
      reminder.paid_at, 
      reminder.completion_date
    )

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
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryColors[reminder.category] || categoryColors.other}`}>
                  {categoryLabels[reminder.category] || 'Other'}
                </span>
              )}
              {reminder.is_recurring && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                  🔄 {recurrenceLabels[reminder.recurrence_pattern || 'monthly']}
                  {reminder.recurrence_interval && reminder.recurrence_interval > 1 && ` (${reminder.recurrence_interval}x)`}
                </span>
              )}
            </div>

            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">Due:</span>{' '}
                {formatSafeDate(reminder.due_date)}
              </p>
              {reminder.amount && (
                <p>
                  <span className="font-medium">Amount:</span> ₹{reminder.amount.toLocaleString()}
                  {reminder.paid_amount && reminder.paid_amount !== reminder.amount && (
                    <span className="text-green-600 ml-2">(Paid: ₹{reminder.paid_amount.toLocaleString()})</span>
                  )}
                </p>
              )}
              <p className={`font-medium ${
                reminder.reminder_status === 'completed' || reminder.payment_status === 'paid' 
                  ? 'text-green-700' 
                  : 'text-gray-900'
              }`}>
                {urgencyText}
              </p>
              
              {activeTab === 'recurring' && reminder.next_occurrence_date && (
                <p>
                  <span className="font-medium">Next occurrence:</span>{' '}
                  {formatSafeDate(reminder.next_occurrence_date)}
                </p>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {reminder.reminder_status === 'completed' && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-medium">
                  ✓ Completed
                </span>
              )}
              {reminder.payment_status === 'paid' && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-medium">
                  💰 Paid
                </span>
              )}
              {activeTab === 'upcoming' && daysUntil <= 12 && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                  📅 Upcoming in {daysUntil} day(s)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {activeTab === 'active' && reminder.reminder_status === 'active' && (
              <>
                {reminder.payment_status === 'unpaid' && (
                  <button
                    onClick={() => handleMarkAsPaid(reminder.id)}
                    disabled={actionLoading === reminder.id}
                    className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                  >
                    {actionLoading === reminder.id ? 'Marking...' : 'Mark Paid'}
                  </button>
                )}
                <button
                  onClick={() => handleCompleteReminder(reminder.id)}
                  disabled={actionLoading === reminder.id}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading === reminder.id ? 'Completing...' : 'Complete'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Manual Trigger */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Reminders</h2>
        <button
          onClick={handleTriggerNotifications}
          disabled={triggerLoading}
          className="btn-secondary text-sm"
        >
          {triggerLoading ? 'Triggering...' : '📧 Send Notifications Now'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-gray-200 pb-4">
        {renderTabButton('active', 'Active', reminders.length)}
        {renderTabButton('upcoming', 'Upcoming (12 days)')}
        {renderTabButton('history', 'History')}
        {renderTabButton('recurring', 'Recurring Templates')}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading reminders...</p>
        </div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-6xl mb-4">
            {activeTab === 'active' && '📅'}
            {activeTab === 'upcoming' && '⏰'}
            {activeTab === 'history' && '📚'}
            {activeTab === 'recurring' && '🔄'}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {activeTab === 'active' && 'No active reminders'}
            {activeTab === 'upcoming' && 'No upcoming reminders'}
            {activeTab === 'history' && 'No completed reminders'}
            {activeTab === 'recurring' && 'No recurring templates'}
          </h3>
          <p className="text-gray-600">
            {activeTab === 'active' && 'Create your first reminder to get started.'}
            {activeTab === 'upcoming' && 'No reminders due in the next 12 days.'}
            {activeTab === 'history' && 'Complete some reminders to see them here.'}
            {activeTab === 'recurring' && 'Create recurring reminders to see templates here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map(renderReminderCard)}
        </div>
      )}
    </div>
  )
}
