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
    const { voter_id, nominee_id, category_id } = JSON.parse(event.body)

    // Check voter balance
    const { data: voter } = await supabase
      .from('voters')
      .select('balance, id')
      .eq('id', voter_id)
      .single()

    if (!voter) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Voter not found' })
      }
    }

    if (voter.balance < 1) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Insufficient coins. Please buy more.' })
      }
    }

    // Record vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert([{
        voter_id,
        nominee_id,
        category_id,
        used_coins: 1
      }])

    if (voteError) throw voteError

    // Deduct 1 coin from balance
    const { error: updateError } = await supabase
      .from('voters')
      .update({
        balance: voter.balance - 1,
        used_coins: voter.used_coins + 1
      })
      .eq('id', voter_id)

    if (updateError) throw updateError

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Vote recorded!' })
    }

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    }
  }
}