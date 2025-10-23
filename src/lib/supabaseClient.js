import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ✅ SOLUCIÓN: Se recomienda quitar 'multiTab: false' para una mejor experiencia de usuario.
// Si un usuario inicia sesión en una pestaña, también lo estará en otras.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
  // multiTab: false, // <-- Esta línea es la que te recomiendo quitar o comentar.
})

console.log('Supabase client inicializado.')
