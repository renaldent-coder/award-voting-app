import { supabase } from '../../supabase/client.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  // ===== GET BALANCE =====
  if (event.httpMethod === 'GET') {
    const voterId = event.queryStringParameters.voter_id

    if (!voterId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'voter_id required' })
      }
    }

    const { data: voter } = await supabase
      .from('voters')
      .select('balance')
      .eq('id', voterId)
      .single()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, balance: voter?.balance || 0 })
    }
  }

  // ===== BUY COINS =====
  if (event.httpMethod === 'POST') {
    try {
      const { voter_id, email, amount, coins, bonus, total } = JSON.parse(event.body)

      // Initialize Paystack transaction WITHOUT custom reference
      const paystackSecret = process.env.PAYSTACK_SECRET_KEY
      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          amount: amount * 100,
          callback_url: 'https://byspolyvotes.netlify.app/dashboard.html'
          // Let Paystack generate its own reference
        })
      })

      const paystackData = await paystackResponse.json()

      if (!paystackData.status) {
        throw new Error(paystackData.message)
      }

      // Get the reference Paystack generated
      const paystackReference = paystackData.data.reference

      // Save transaction with Paystack's reference
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert([{
          voter_id,
          amount,
          coins_bought: coins,
          bonus_coins: bonus,
          total_coins_added: total,
          payment_reference: paystackReference,  // Use Paystack's reference
          payment_status: 'pending'
        }])
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          authorization_url: paystackData.data.authorization_url,
          reference: paystackReference
        })
      }

    } catch (err) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: err.message })
      }
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ success: false, error: 'Method not allowed' })
  }
}