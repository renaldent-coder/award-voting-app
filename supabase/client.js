import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://qzxrsvapvlkijgkeezsp.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_HONLI6rtWjXOue12FNkVOw_g3CJd6RA'

export const supabase = createClient(supabaseUrl, supabaseKey)