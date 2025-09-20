'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface PaymentResult {
  success: boolean
  message?: string
  error?: string
  reminder?: {
    id: string
    title: string
    due_date: string
    amount: number
    payment_status: string
  }
}

export default function PaymentConfirm() {
  const [result, setResult] = useState<PaymentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    const confirmPayment = async () => {
      const id = searchParams.get('id')
      const token = searchParams.get('token')

      if (!id || !token) {
        setResult({
          success: false,
          error: 'Invalid payment confirmation link'
        })
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/mark-paid?id=${id}&token=${token}`)
        const data = await response.json()
        setResult(data)
      } catch (error) {
        setResult({
          success: false,
          error: 'Failed to confirm payment'
        })
      } finally {
        setLoading(false)
      }
    }

    confirmPayment()
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Confirming payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="card text-center">
          {result?.success ? (
            <>
              <div className="text-green-500 text-6xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Confirmed!
              </h1>
              <p className="text-gray-600 mb-6">
                {result.message || 'Your payment has been marked as paid successfully.'}
              </p>
              
              {result.reminder && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-semibold text-gray-900 mb-2">Payment Details:</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Title:</span> {result.reminder.title}</p>
                    <p><span className="font-medium">Due Date:</span> {new Date(result.reminder.due_date).toLocaleDateString()}</p>
                    {result.reminder.amount && (
                      <p><span className="font-medium">Amount:</span> ₹{result.reminder.amount.toLocaleString()}</p>
                    )}
                    <p><span className="font-medium">Status:</span> 
                      <span className="ml-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Paid
                      </span>
                    </p>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-500 mb-6">
                You will no longer receive reminders for this payment.
              </p>
            </>
          ) : (
            <>
              <div className="text-red-500 text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Confirmation Failed
              </h1>
              <p className="text-gray-600 mb-6">
                {result?.error || 'Unable to confirm payment. Please try again.'}
              </p>
            </>
          )}
          
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="w-full btn-primary block text-center"
            >
              Go to Dashboard
            </Link>
            
            <Link
              href="/"
              className="w-full btn-secondary block text-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            If you have any issues, please contact support or manage your reminders from the dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}
