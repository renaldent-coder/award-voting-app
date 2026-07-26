import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qzxrsvapvlkijgkeezsp.supabase.co'
const supabaseKey = 'sb_publishable_HONLI6rtWjXOue12FNkVOw_g3CJd6RA'

export const supabase = createClient(supabaseUrl, supabaseKey)