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
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')!
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const textbeltKey = Deno.env.get('TEXTBELT_KEY')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting reminder notification process...')

    // Get reminders that need notifications
    const { data: remindersToNotify, error: fetchError } = await supabase
      .rpc('get_reminders_to_notify')

    if (fetchError) {
      console.error('Error fetching reminders:', fetchError)
      throw fetchError
    }

    console.log(`Found ${remindersToNotify?.length || 0} reminders to process`)

    let successCount = 0
    let errorCount = 0

    // Process each reminder
    for (const reminder of remindersToNotify || []) {
      try {
        console.log(`Processing reminder: ${reminder.title} for user ${reminder.user_id}`)

        // Build notification message and payment link
        const dueDate = new Date(reminder.due_date).toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        const amountText = reminder.amount ? ` (₹${reminder.amount.toLocaleString()})` : ''
        const message = `🔔 Payment Reminder: ${reminder.title}${amountText} is due on ${dueDate} (${reminder.days_until} days remaining)`
        
        // Generate secure token for payment confirmation link
        const paymentToken = Buffer.from(reminder.id).toString('base64').slice(0, 8)
        const baseUrl = supabaseUrl.replace('.supabase.co', '.vercel.app') // Assuming Vercel deployment
        const paymentLink = `${baseUrl}/payment-confirm?id=${reminder.id}&token=${paymentToken}`

        // Send email notification via Brevo
        if (reminder.email) {
          try {
            const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
              method: 'POST',
              headers: {
                'api-key': brevoApiKey,
                'content-type': 'application/json'
              },
              body: JSON.stringify({
                sender: { 
                  name: 'Reminder App', 
                  email: 'noreply@reminderapp.com' 
                },
                to: [{ email: reminder.email }],
                subject: `Payment Reminder: ${reminder.title}`,
                htmlContent: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb; text-align: center;">Payment Reminder</h2>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <h3 style="margin: 0 0 10px 0; color: #1f2937;">${reminder.title}</h3>
                      <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDate}</p>
                      ${reminder.amount ? `<p style="margin: 5px 0;"><strong>Amount:</strong> ₹${reminder.amount.toLocaleString()}</p>` : ''}
                      <p style="margin: 5px 0;"><strong>Category:</strong> ${reminder.category || 'Other'}</p>
                      <p style="margin: 15px 0 5px 0; color: #dc2626; font-weight: bold;">
                        ${reminder.days_until === 0 ? 'Due Today!' : 
                          reminder.days_until === 1 ? 'Due Tomorrow!' : 
                          `${reminder.days_until} days remaining`}
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${paymentLink}" 
                         style="background-color: #16a34a; color: white; padding: 12px 24px; 
                                text-decoration: none; border-radius: 6px; font-weight: bold; 
                                display: inline-block;">
                        ✓ Mark as Paid
                      </a>
                    </div>
                    
                    <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                      <p style="margin: 0; font-size: 14px; color: #92400e;">
                        <strong>Quick Action:</strong> Click the button above to mark this payment as paid. 
                        You'll stop receiving reminders for this payment immediately.
                      </p>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px; text-align: center;">
                      This is an automated reminder from your Reminder App. 
                      <a href="${baseUrl}/dashboard" style="color: #2563eb;">
                        Manage your reminders
                      </a>
                    </p>
                  </div>
                `
              })
            })

            if (!emailResponse.ok) {
              const errorText = await emailResponse.text()
              console.error(`Email send failed for ${reminder.email}:`, errorText)
            } else {
              console.log(`Email sent successfully to ${reminder.email}`)
            }
          } catch (emailError) {
            console.error(`Email error for ${reminder.email}:`, emailError)
          }
        }

        // Send Telegram notification if chat_id is available
        if (reminder.telegram_chat_id && telegramBotToken) {
          try {
            const telegramMessage = `${message}\n\n💳 <b>Quick Action:</b>\n<a href="${paymentLink}">✓ Mark as Paid</a>\n\nClick the link above to mark this payment as completed and stop future reminders.`
            
            const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                chat_id: reminder.telegram_chat_id,
                text: telegramMessage,
                parse_mode: 'HTML',
                disable_web_page_preview: false
              })
            })

            if (!telegramResponse.ok) {
              const errorText = await telegramResponse.text()
              console.error(`Telegram send failed for chat ${reminder.telegram_chat_id}:`, errorText)
            } else {
              console.log(`Telegram message sent successfully to ${reminder.telegram_chat_id}`)
            }
          } catch (telegramError) {
            console.error(`Telegram error for ${reminder.telegram_chat_id}:`, telegramError)
          }
        }

        // Send SMS notification if phone is available and textbelt key is provided
        if (reminder.phone && textbeltKey) {
          try {
            const smsMessage = `${message.replace(/🔔/g, '')}\n\nMark as Paid: ${paymentLink}\n\nClick link to mark payment complete and stop reminders.`
            
            const smsResponse = await fetch('https://textbelt.com/text', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                phone: reminder.phone,
                message: smsMessage,
                key: textbeltKey
              })
            })

            const smsResult = await smsResponse.json()
            if (smsResult.success) {
              console.log(`SMS sent successfully to ${reminder.phone}`)
            } else {
              console.error(`SMS send failed for ${reminder.phone}:`, smsResult.error)
            }
          } catch (smsError) {
            console.error(`SMS error for ${reminder.phone}:`, smsError)
          }
        }

        // Record the notification as sent
        const { error: insertError } = await supabase
          .from('sent_notifications')
          .insert([{
            reminder_id: reminder.id,
            notification_type: reminder.notify_type,
            delivery_status: 'sent'
          }])

        if (insertError) {
          console.error(`Error recording notification for reminder ${reminder.id}:`, insertError)
        } else {
          console.log(`Notification recorded for reminder ${reminder.id}`)
        }

        successCount++

      } catch (reminderError) {
        console.error(`Error processing reminder ${reminder.id}:`, reminderError)
        errorCount++

        // Record failed notification
        try {
          await supabase
            .from('sent_notifications')
            .insert([{
              reminder_id: reminder.id,
              notification_type: reminder.notify_type,
              delivery_status: 'failed'
            }])
        } catch (recordError) {
          console.error(`Error recording failed notification:`, recordError)
        }
      }
    }

    const result = {
      success: true,
      message: `Processed ${remindersToNotify?.length || 0} reminders`,
      successCount,
      errorCount,
      timestamp: new Date().toISOString()
    }

    console.log('Notification process completed:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
