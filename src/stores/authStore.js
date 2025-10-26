import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import router from '@/router'
import { useCartStore } from './storeCart'

export const useAuthStore = defineStore('auth', () => {
  // --- ESTADO ---
  const session = ref(null)
  const userProfile = ref(null)
  const isPasswordRecoveryMode = ref(false)

  // Auth Ready Promise
  let resolveAuthReady
  const authReadyPromise = new Promise((resolve) => {
    resolveAuthReady = resolve
  })

  let isInitialLoad = true

  // --- GETTERS (COMPUTEDS) ---
  const user = computed(() => session.value?.user ?? null)
  const isLoggedIn = computed(() => !!user.value)

  // ✅ COMPUTED CON CACHE
  const userRole = computed(() => {
    if (userProfile.value?.role) {
      return userProfile.value.role
    }

    const cachedRole = localStorage.getItem('cached_user_role')
    if (cachedRole && isLoggedIn.value) {
      console.log('📦 Usando rol cacheado:', cachedRole)
      return cachedRole
    }

    return null
  })

  const userDisplayName = computed(() => {
    if (!userProfile.value) return 'Usuario'

    const firstName = userProfile.value.first_name
    const lastName = userProfile.value.last_name

    if (firstName && lastName) return `${firstName} ${lastName}`
    if (firstName) return firstName
    if (lastName) return lastName
    if (user.value?.email) return user.value.email.split('@')[0]

    return 'Usuario'
  })

  // --- ACCIONES ---

  async function fetchUserProfile(userId) {
    if (!userId) {
      userProfile.value = null
      localStorage.removeItem('cached_user_role')
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, first_name, last_name, avatar_url')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      userProfile.value = data ?? null
      if (!userProfile.value) {
        console.warn(
          `No se encontró perfil para el usuario ${userId}, asignando rol 'user' por defecto.`,
        )
        userProfile.value = { role: 'user', first_name: null, last_name: null, avatar_url: null }
      } else if (!userProfile.value.role) {
        userProfile.value.role = 'user'
      }

      if (userProfile.value?.role) {
        localStorage.setItem('cached_user_role', userProfile.value.role)
        console.log('💾 Rol guardado en cache:', userProfile.value.role)
      }
    } catch (catchError) {
      console.error('Error al obtener el perfil del usuario:', catchError)
      userProfile.value = { role: 'user', first_name: null, last_name: null, avatar_url: null }
    }
  }

  async function refreshSessionManually() {
    console.log('🔄 Verificando sesión manualmente...')
    isInitialLoad = true // Forzamos a que se rehaga la inicialización
    await initializeAuth()
    return isLoggedIn.value
  }

  // --- ACCIÓN DE INICIALIZACIÓN (Llamada desde main.js) ---
  async function initializeAuth() {
    console.log('🚀 [initializeAuth] Iniciando comprobación manual de sesión...')
    try {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession()
      if (error) throw error

      if (currentSession) {
        console.log(
          `🚀 [initializeAuth] Sesión encontrada (${currentSession.user.email}). Obteniendo perfil...`,
        )
        session.value = currentSession
        await fetchUserProfile(currentSession.user.id)
        console.log('🚀 [initializeAuth] Perfil cargado.')
      } else {
        console.log('🚀 [initializeAuth] No hay sesión.')
        session.value = null
        userProfile.value = null
      }
    } catch (err) {
      console.error('❌ Error en initializeAuth:', err)
    } finally {
      console.log('🚀 [initializeAuth] Comprobación finalizada. Resolviendo authReadyPromise.')
      if (resolveAuthReady) {
        resolveAuthReady()
        resolveAuthReady = null
      }
      isInitialLoad = false
      console.log('🚀 [initializeAuth] isInitialLoad ahora es false.')
    }
  }

  // --- Listener de Supabase (AJUSTADO) ---
  supabase.auth.onAuthStateChange(async (event, newSession) => {
    const cartStore = useCartStore()
    console.log(
      '🔔 Auth event (post-init):',
      event,
      'Session:',
      !!newSession,
      'isInitialLoad:',
      isInitialLoad,
    )

    // Si isInitialLoad es true, initializeAuth() tiene el control. IGNORAMOS.
    if (isInitialLoad && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
      console.log('⏭️ [Listener] Ignorando evento inicial. initializeAuth() está al mando.')
      return
    }

    // PASSWORD_RECOVERY
    if (event === 'PASSWORD_RECOVERY') {
      console.log('✅ [Listener] Procesando PASSWORD_RECOVERY.')
      isPasswordRecoveryMode.value = true
      session.value = newSession
      await fetchUserProfile(newSession?.user?.id)
      return
    }

    // SIGNED_IN (Login real del usuario, o background refresh)
    if (event === 'SIGNED_IN') {
      // 🔥 LA MAGIA FINAL ESTÁ AQUÍ 🔥
      // 'session.value' es el estado *antes* de este evento.
      // Si era 'null', es un login real. Si ya tenía datos, es un refresh.
      const isRealLogin = !session.value

      session.value = newSession // Actualizamos la sesión siempre

      if (isRealLogin) {
        // Solo si es un login REAL (de null a tener sesión) recargamos todo
        console.log('✅ [Listener] Procesando SIGNED_IN (login de usuario REAL).')
        await fetchUserProfile(newSession?.user?.id)
        await cartStore.syncCartOnLogin()
        await cartStore.fetchUserCart()
      } else {
        // Si ya estábamos logueados, solo es un refresh de token.
        console.log(
          '✅ [Listener] Procesando SIGNED_IN (background token refresh). No se recarga el perfil.',
        )
      }
    }

    // SIGNED_OUT
    if (event === 'SIGNED_OUT') {
      console.log('✅ [Listener] Procesando SIGNED_OUT.')
      isInitialLoad = true // Listo para la próxima recarga de página
      isPasswordRecoveryMode.value = false
      session.value = null
      userProfile.value = null
      localStorage.removeItem('cached_user_role')
      cartStore.clearCart()
      router.push({ name: 'login' })
    }

    // USER_UPDATED
    if (event === 'USER_UPDATED') {
      console.log('✅ [Listener] Procesando USER_UPDATED.')
      await fetchUserProfile(newSession.user.id)
    }

    // Cargar carrito de invitado
    if (!newSession && event !== 'SIGNED_OUT') {
      cartStore.loadGuestCart()
    }
  })

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error al cerrar sesión en Supabase:', error)
    // El listener onAuthStateChange se encargará del resto
  }

  async function signOutWithoutRedirect() {
    const cartStore = useCartStore()
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error al cerrar sesión en Supabase:', error)

    isInitialLoad = true
    isPasswordRecoveryMode.value = false
    session.value = null
    userProfile.value = null
    localStorage.removeItem('cached_user_role')
    cartStore.clearCart()
  }

  async function signInWithGoogle(redirectPath = '/bienvenida') {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectPath}`,
        },
      })
      if (error) {
        console.error('Error en login con Google:', error.message)
        throw error
      }
    } catch (err) {
      console.error('Error inesperado en login Google:', err)
      throw err
    }
  }

  function exitPasswordRecoveryMode() {
    isPasswordRecoveryMode.value = false
  }

  return {
    session: readonly(session),
    user,
    userProfile: readonly(userProfile),
    userRole,
    userDisplayName,
    isLoggedIn,
    isPasswordRecoveryMode: readonly(isPasswordRecoveryMode),
    authReadyPromise,
    initializeAuth,
    signOut,
    signOutWithoutRedirect,
    exitPasswordRecoveryMode,
    signInWithGoogle,
    refreshSessionManually,
  }
})
