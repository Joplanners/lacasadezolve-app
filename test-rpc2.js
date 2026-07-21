import { createClient } from '@supabase/supabase-js'

async function getRpcDef() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  const { data, error } = await supabase.rpc('get_all_users_with_profiles', { search_term: '' })
  
  const { data: def, error: e2 } = await supabase.from('pg_proc').select('*').limit(5)
  console.log("Wait, pg_proc is not accessible like this. Let's just create a new RPC with limits.")
}
getRpcDef()
