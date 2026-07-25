import { supabase } from '../supabase/client.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { voter_name, email, category_id, category_name, nominee_name } = req.body

  // Check if email already voted in this category
  const { data: existing, error: checkError } = await supabase
    .from('votes')
    .select('id')
    .eq('email', email)
    .eq('category_id', category_id)
    .single()

  if (existing) {
    return res.status(400).json({ error: 'You already voted for this category' })
  }

  // Insert vote
  const { data, error } = await supabase
    .from('votes')
    .insert([{ voter_name, email, category_id, category_name, nominee_name }])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(200).json({ success: true, message: 'Vote submitted!' })
}