import { createClient } from '@supabase/supabase-js'

// Hardcoded for frontend use (browser-safe since RLS is enabled)
const supabaseUrl = 'https://qzxrsvapvlkijgkeezsp.supabase.co'
const supabaseKey = 'sb_publishable_HONLI6rtWjXOue12FNkVOw_g3CJd6RA'

export const supabase = createClient(supabaseUrl, supabaseKey)