import { supabase } from '../supabase/client.js'

export default async function handler(req, res) {
  const adminPassword = req.headers['x-admin-password']

  if (adminPassword !== 'SUGADMIN2026') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: votes, error } = await supabase
    .from('votes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  // Group by category and count nominees
  const categories = {}
  votes.forEach(vote => {
    if (!categories[vote.category_name]) {
      categories[vote.category_name] = {}
    }
    if (!categories[vote.category_name][vote.nominee_name]) {
      categories[vote.category_name][vote.nominee_name] = 0
    }
    categories[vote.category_name][vote.nominee_name]++
  })

  // Get top 5 per category
  const results = {}
  Object.keys(categories).forEach(category => {
    const sorted = Object.entries(categories[category])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
    results[category] = sorted
  })

  res.status(200).json({ results, total_votes: votes.length, votes })
}