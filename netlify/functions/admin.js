import { supabase } from '../../supabase/client.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // Get admin stats
    const [voters, votes, transactions, votersWithCoins] = await Promise.all([
      supabase.from('voters').select('id'),
      supabase.from('votes').select('id, used_coins'),
      supabase.from('transactions').select('amount'),
      supabase.from('voters').select('used_coins')
    ])

    const totalVoters = voters.data?.length || 0
    const totalVotes = votes.data?.length || 0
    const totalCoinsUsed = votes.data?.reduce((sum, v) => sum + (v.used_coins || 0), 0) || 0
    const revenue = transactions.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0

    // Get top 5 per category
    const { data: votesWithNames } = await supabase
      .from('votes')
      .select(`
        *,
        nominees (name),
        categories (name)
      `)

    const categories = {}
    votesWithNames?.forEach(v => {
      const catName = v.categories?.name || 'Unknown'
      const nomName = v.nominees?.name || 'Unknown'
      if (!categories[catName]) categories[catName] = {}
      if (!categories[catName][nomName]) categories[catName][nomName] = 0
      categories[catName][nomName]++
    })

    const results = Object.keys(categories).map(catName => {
      const sorted = Object.entries(categories[catName])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))
      return { category: catName, top5: sorted }
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        stats: {
          totalVoters,
          totalVotes,
          totalCoinsUsed,
          revenue
        },
        results
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