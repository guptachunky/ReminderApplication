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

    // Handle GET request (from payment links)
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const reminderId = url.searchParams.get('id')
      const token = url.searchParams.get('token')

      if (!reminderId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Reminder ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Simple token validation
      const expectedToken = btoa(reminderId).slice(0, 8)
      if (token !== expectedToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get reminder details for verification
      const { data: reminder, error: fetchError } = await supabase
        .from('reminders')
        .select('id, title, due_date, amount, payment_status')
        .eq('id', reminderId)
        .eq('is_active', true)
        .single()

      if (fetchError || !reminder) {
        return new Response(
          JSON.stringify({ success: false, error: 'Reminder not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (reminder.payment_status === 'paid') {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payment already marked as paid',
            reminder
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Mark as paid
      const { data, error } = await supabase.rpc('mark_payment_as_paid', {
        reminder_uuid: reminderId,
        paid_amount_param: null
      })

      if (error) {
        console.error('Error marking payment as paid:', error)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to mark payment as paid' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Handle POST request
    else if (req.method === 'POST') {
      const { reminderId, paidAmount } = await req.json()

      if (!reminderId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Reminder ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Call the database function to mark payment as paid
      const { data, error } = await supabase.rpc('mark_payment_as_paid', {
        reminder_uuid: reminderId,
        paid_amount_param: paidAmount || null
      })

      if (error) {
        console.error('Error marking payment as paid:', error)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to mark payment as paid' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
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
