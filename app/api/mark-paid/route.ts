import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { reminderId, paidAmount } = await request.json()

    if (!reminderId) {
      return NextResponse.json(
        { success: false, error: 'Reminder ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Call the database function to mark payment as paid
    const { data, error } = await supabase.rpc('mark_payment_as_paid', {
      reminder_uuid: reminderId,
      paid_amount_param: paidAmount || null
    })

    if (error) {
      console.error('Error marking payment as paid:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to mark payment as paid' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reminderId = searchParams.get('id')
    const token = searchParams.get('token')

    if (!reminderId) {
      return NextResponse.json(
        { success: false, error: 'Reminder ID is required' },
        { status: 400 }
      )
    }

    // Simple token validation (in production, use proper JWT or signed tokens)
    const expectedToken = Buffer.from(reminderId).toString('base64').slice(0, 8)
    if (token !== expectedToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    // Get reminder details for verification
    const { data: reminder, error: fetchError } = await supabase
      .from('reminders')
      .select('id, title, due_date, amount, payment_status')
      .eq('id', reminderId)
      .eq('is_active', true)
      .single()

    if (fetchError || !reminder) {
      return NextResponse.json(
        { success: false, error: 'Reminder not found' },
        { status: 404 }
      )
    }

    if (reminder.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        message: 'Payment already marked as paid',
        reminder
      })
    }

    // Mark as paid
    const { data, error } = await supabase.rpc('mark_payment_as_paid', {
      reminder_uuid: reminderId,
      paid_amount_param: null
    })

    if (error) {
      console.error('Error marking payment as paid:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to mark payment as paid' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Payment marked as paid successfully',
      reminder: {
        ...reminder,
        payment_status: 'paid'
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
