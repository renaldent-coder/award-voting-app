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
    const payload = JSON.parse(event.body)

    // Verify Paystack signature
    const signature = event.headers['x-paystack-signature']
    const crypto = await import('crypto')
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    hash.update(JSON.stringify(payload))
    const expectedSignature = hash.digest('hex')

    console.log('Signature:', signature)
    console.log('Expected:', expectedSignature)

    if (signature !== expectedSignature) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid signature' })
      }
    }

    const { event: eventType, data } = payload

    console.log('Event:', eventType)
    console.log('Data:', data)

    if (eventType === 'charge.success') {
      const reference = data.reference

      // Find transaction
      const { data: transaction, error: findError } = await supabase
        .from('transactions')
        .select('*')
        .eq('payment_reference', reference)
        .single()

      if (findError || !transaction) {
        console.log('Transaction not found:', reference)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Transaction not found' })
        }
      }

      // Update transaction status
      await supabase
        .from('transactions')
        .update({ payment_status: 'paid' })
        .eq('payment_reference', reference)

      // Add coins to voter balance
      const { data: voter } = await supabase
        .from('voters')
        .select('balance, total_coins')
        .eq('id', transaction.voter_id)
        .single()

      await supabase
        .from('voters')
        .update({
          balance: (voter?.balance || 0) + transaction.total_coins_added,
          total_coins: (voter?.total_coins || 0) + transaction.total_coins_added
        })
        .eq('id', transaction.voter_id)

      console.log('Coins added successfully!')
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    }

  } catch (err) {
    console.error('Webhook error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    }
  }
}