import { supabase } from '../../supabase/client.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // Log the raw request for debugging
    console.log('🔔 Webhook received!')
    console.log('📦 Raw body:', event.body)
    console.log('📋 Headers:', JSON.stringify(event.headers))

    // Check if body is empty
    if (!event.body) {
      console.log('❌ Empty request body')
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Empty request body' })
      }
    }

    // Parse JSON body
    let payload
    try {
      payload = JSON.parse(event.body)
    } catch (parseError) {
      console.log('❌ Invalid JSON:', parseError.message)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid JSON' })
      }
    }

    console.log('📦 Payload:', JSON.stringify(payload, null, 2))

    // Verify Paystack signature (optional but recommended)
    const signature = event.headers['x-paystack-signature']
    const crypto = await import('crypto')
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
    hash.update(JSON.stringify(payload))
    const expectedSignature = hash.digest('hex')

    if (signature && signature !== expectedSignature) {
      console.log('❌ Invalid signature')
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid signature' })
      }
    }

    const { event: eventType, data } = payload

    if (eventType === 'charge.success') {
      const reference = data.reference
      console.log('💰 Payment successful! Reference:', reference)

      // Find transaction in Supabase
      const { data: transaction, error: findError } = await supabase
        .from('transactions')
        .select('*')
        .eq('payment_reference', reference)
        .single()

      if (findError || !transaction) {
        console.log('❌ Transaction not found:', reference)
        console.log('Error:', findError)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Transaction not found' })
        }
      }

      console.log('✅ Transaction found:', transaction.id)

      // Update transaction status
      await supabase
        .from('transactions')
        .update({ payment_status: 'paid' })
        .eq('payment_reference', reference)

      // Add coins to voter
      const { data: voter } = await supabase
        .from('voters')
        .select('balance, total_coins')
        .eq('id', transaction.voter_id)
        .single()

      const newBalance = (voter?.balance || 0) + transaction.total_coins_added
      const newTotal = (voter?.total_coins || 0) + transaction.total_coins_added

      await supabase
        .from('voters')
        .update({
          balance: newBalance,
          total_coins: newTotal
        })
        .eq('id', transaction.voter_id)

      console.log('✅ Coins added! New balance:', newBalance)
    } else {
      console.log('📌 Event type not handled:', eventType)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    }

  } catch (err) {
    console.error('❌ Webhook error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    }
  }
}