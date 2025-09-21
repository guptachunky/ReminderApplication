import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle GET request (status check)
    if (req.method === 'GET') {
      // Get scheduler status
      const { data: schedulerStatus, error: statusError } = await supabase
        .from('scheduler_status')
        .select('*')

      if (statusError) {
        console.error('Error fetching scheduler status:', statusError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch scheduler status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

      return new Response(
        JSON.stringify({
          success: true,
          schedulerConfig: schedulerStatus,
          recentLogs: recentLogs || [],
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Handle POST request (trigger notifications)
    else if (req.method === 'POST') {
      const body = await req.json()
      const { forceRun = false, batchLimit = null } = body

      // Call the database function to trigger notifications
      const { data, error } = await supabase.rpc('trigger_reminder_notifications', {
        force_run: forceRun,
        batch_limit: batchLimit
      })

      if (error) {
        console.error('Error triggering notifications:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to trigger notifications', 
            details: error.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Notifications triggered successfully',
          data: data,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Handle unsupported methods
    else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('API error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
