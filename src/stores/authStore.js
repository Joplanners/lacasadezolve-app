import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // --- ESTADO ---
  const session = ref(null)
  const userRole = ref(null)
  const isPasswordRecoveryMode = ref(false)

  // La promesa que detendrá el router hasta que tengamos una respuesta de Supabase
  let resolveAuthReady
  const authReadyPromise = new Promise((resolve) => {
    resolveAuthReady = resolve
  })

  // --- GETTERS COMPUTEDS ---
  const user = computed(() => session.value?.user ?? null)
  const isLoggedIn = computed(() => !!user.value)

  // --- ACCIONES ---
  // Función interna para obtener el rol del usuario desde la tabla profiles
  async function fetchUserRole(userId) {
    if (!userId) {
      userRole.value = null
      return
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      userRole.value = data?.role || 'user'
    } catch (catchError) {
      console.error('Error al obtener el rol del usuario:', catchError)
      userRole.value = 'user'
    }
  }

  // ✅ Listener de Supabase con lógica anti-duplicados
  let lastSessionToken = null

  supabase.auth.onAuthStateChange(async (event, newSession) => {
    console.log('🔔 Auth event:', event, 'Session:', !!newSession)

    // 🔑 Ignorar eventos SIGNED_IN redundantes si el token no cambió
    if (event === 'SIGNED_IN' && newSession?.access_token) {
      if (lastSessionToken === newSession.access_token) {
        console.log('⏭️ Sesión sin cambios (mismo token), ignorando evento')
        return
      }
      // Actualizar el último token conocido
      lastSessionToken = newSession.access_token
    }

    // Si la sesión se cerró, limpiar el token guardado
    if (event === 'SIGNED_OUT' || !newSession) {
      lastSessionToken = null
    }

    // Actualizamos el estado de la sesión local
    session.value = newSession

    // Obtenemos el rol del usuario si hay una nueva sesión
    await fetchUserRole(newSession?.user?.id)

    // Si la promesa authReady aún no se ha resuelto, la resolvemos
    if (resolveAuthReady) {
      resolveAuthReady()
      resolveAuthReady = null
    }
  })

  // Acción para cerrar la sesión
  async function signOut() {
    // Limpiar token local antes de cerrar sesión
    lastSessionToken = null

    // Primero, limpiamos el estado local
    session.value = null
    userRole.value = null

    // Luego, le pedimos a Supabase que invalide el token
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error al cerrar sesión en Supabase:', error)
    }

    // Finalmente, redirigimos al usuario a la página de login
    router.push({ name: 'login' })
  }

  // Acción para login con Google (NUEVO)
  async function signInWithGoogle(redirectPath = '/mi-perfil') {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + redirectPath,
        },
      })
      if (error) {
        console.error('Error en login con Google:', error.message)
      }
    } catch (err) {
      console.error('Error inesperado en login Google:', err)
    }
  }

  // Función para salir manualmente del modo de recuperación de contraseña
  function exitPasswordRecoveryMode() {
    isPasswordRecoveryMode.value = false
  }

  // Lo que exponemos al resto de la aplicación
  return {
    // Estado reactivo
    session: readonly(session),
    user,
    userRole: readonly(userRole),
    isLoggedIn,
    isPasswordRecoveryMode: readonly(isPasswordRecoveryMode),
    // Promesa para el router
    authReadyPromise,
    // Acciones
    signOut,
    exitPasswordRecoveryMode,
    signInWithGoogle, // <--- Ya puedes usarla desde tus componentes
  }
})
