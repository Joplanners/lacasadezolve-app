import { createClient } from '@supabase/supabase-js'

async function test() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.log("Missing credentials");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: newRecord, error: insertError } = await supabase
        .from('user_digital_downloads')
        .insert({
          user_id: null,
          order_id: '12345678-1234-1234-1234-123456789012',
          product_id: '12345678-1234-1234-1234-123456789012',
          file_url: 'test',
          downloads_count: 0,
          max_downloads: 5
        })
        .select()
        .single()
        
  console.log("Keys:", Object.keys(insertError))
  console.log("Property Names:", Object.getOwnPropertyNames(insertError))
  console.log("Error details:", insertError.message, insertError.code, insertError.details, insertError.hint)
}

test()
