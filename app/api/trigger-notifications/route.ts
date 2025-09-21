import { createServerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // Check if user is authenticated
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { forceRun = false, batchLimit = null } = body

    // Call the database function to trigger notifications
    const { data, error } = await supabase.rpc('trigger_reminder_notifications', {
      force_run: forceRun,
      batch_limit: batchLimit
    })

    if (error) {
      console.error('Error triggering notifications:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to trigger notifications', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications triggered successfully',
      data: data,
      timestamp: new Date().toISOString()
    })

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
    const supabase = createServerClient()
    
    // Check if user is authenticated
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get scheduler status
    const { data: schedulerStatus, error: statusError } = await supabase
      .from('scheduler_status')
      .select('*')

    if (statusError) {
      console.error('Error fetching scheduler status:', statusError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch scheduler status' },
        { status: 500 }
      )
    }

    // Get recent notification logs
    const { data: recentLogs, error: logsError } = await supabase
      .from('sent_notifications')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(10)

    if (logsError) {
      console.error('Error fetching notification logs:', logsError)
    }

    return NextResponse.json({
      success: true,
      schedulerConfig: schedulerStatus,
      recentLogs: recentLogs || [],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
