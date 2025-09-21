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

    // Check database connection
    const { data: dbCheck, error: dbError } = await supabase
      .from('scheduler_config')
      .select('config_name, config_value')
      .eq('config_name', 'daily_run_time')
      .single()

    // Check environment variables
    const envCheck = {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SERVICE_ROLE_KEY: !!Deno.env.get('SERVICE_ROLE_KEY'),
      BREVO_API_KEY: !!Deno.env.get('BREVO_API_KEY'),
      TELEGRAM_BOT_TOKEN: !!Deno.env.get('TELEGRAM_BOT_TOKEN'),
      TEXTBELT_KEY: !!Deno.env.get('TEXTBELT_KEY')
    }

    return new Response(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: !dbError,
          error: dbError ? dbError.message : null,
          config: dbCheck || null
        },
        environment: envCheck,
        version: '1.0.0'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Health check error:', error)
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
