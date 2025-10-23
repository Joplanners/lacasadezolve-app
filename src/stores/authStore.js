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

  // --- GETTERS (COMPUTEDS) ---
  const user = computed(() => session.value?.user ?? null)
  const isLoggedIn = computed(() => !!user.value)
  const userRole = computed(() => userProfile.value?.role ?? null)

  // COMPUTED PARA MOSTRAR EL NOMBRE EN EL NAVBAR
  const userDisplayName = computed(() => {
    if (!userProfile.value) return 'Usuario'

    const firstName = userProfile.value.first_name
    const lastName = userProfile.value.last_name

    // Si tiene nombre completo
    if (firstName && lastName) return `${firstName} ${lastName}`
    // Si solo tiene nombre
    if (firstName) return firstName
    // Si solo tiene apellido
    if (lastName) return lastName
    // Si tiene email del user de Supabase
    if (user.value?.email) return user.value.email.split('@')[0]

    // Fallback
    return 'Usuario'
  })

  // --- ACCIONES ---

  // --- FUNCIÓN fetchUserProfile ---
  async function fetchUserProfile(userId) {
    if (!userId) {
      userProfile.value = null
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
    } catch (catchError) {
      console.error('Error al obtener el perfil del usuario:', catchError)
      userProfile.value = { role: 'user', first_name: null, last_name: null, avatar_url: null }
    }
  }

  // --- Listener de Supabase (CORREGIDO PARA IGNORAR USER_UPDATED TAMBIÉN) ---
  let lastSessionToken = null
  supabase.auth.onAuthStateChange(async (event, newSession) => {
    const cartStore = useCartStore()
    console.log('🔔 Auth event:', event, 'Session:', !!newSession)

    // PASSWORD_RECOVERY debe procesar y SALIR INMEDIATAMENTE
    if (event === 'PASSWORD_RECOVERY') {
      isPasswordRecoveryMode.value = true
      session.value = newSession
      await fetchUserProfile(newSession?.user?.id)
      if (resolveAuthReady) {
        resolveAuthReady()
        resolveAuthReady = null
      }
      return // SALIDA TEMPRANA CRÍTICO
    }

    // Ignorar INITIAL_SESSION y USER_UPDATED durante PASSWORD_RECOVERY
    if (isPasswordRecoveryMode.value && (event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) {
      console.log('⏭️ Ignorando', event, 'durante PASSWORD_RECOVERY')
      return // SALIDA TEMPRANA para evitar conflictos
    }

    // Manejo de token duplicado
    if (event === 'SIGNED_IN' && newSession?.access_token) {
      if (lastSessionToken === newSession.access_token) return
      lastSessionToken = newSession.access_token
    }

    if (event === 'SIGNED_OUT' || !newSession) {
      lastSessionToken = null
      isPasswordRecoveryMode.value = false
    }

    session.value = newSession
    await fetchUserProfile(newSession?.user?.id)

    // Lógica del carrito - Solo si NO estamos en PASSWORD_RECOVERY
    if (newSession && !isPasswordRecoveryMode.value) {
      await cartStore.syncCartOnLogin()
      await cartStore.fetchUserCart()
    } else if (!newSession) {
      cartStore.loadGuestCart()
    }

    // Auth Ready
    if (resolveAuthReady) {
      resolveAuthReady()
      resolveAuthReady = null
    }
  })

  // Acción signOut con redirección
  async function signOut() {
    const cartStore = useCartStore()
    lastSessionToken = null
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error al cerrar sesión en Supabase:', error)
    cartStore.clearCart()
    session.value = null
    userProfile.value = null
    router.push({ name: 'login' })
  }

  // Acción signOut SIN redirección (para password reset)
  async function signOutWithoutRedirect() {
    const cartStore = useCartStore()
    lastSessionToken = null
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error al cerrar sesión en Supabase:', error)
    cartStore.clearCart()
    session.value = null
    userProfile.value = null
    isPasswordRecoveryMode.value = false
    // NO hacemos router.push aquí
  }

  // 🔥 FUNCIÓN CORREGIDA PARA GOOGLE AUTH
  async function signInWithGoogle(redirectPath = '/bienvenida') {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectPath}`, // ✅ SIN barra extra
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

  // Lo que exponemos
  return {
    session: readonly(session),
    user,
    userProfile: readonly(userProfile),
    userRole,
    userDisplayName, // ✅ Exportamos el nombre para el navbar
    isLoggedIn,
    isPasswordRecoveryMode: readonly(isPasswordRecoveryMode),
    authReadyPromise,
    signOut,
    signOutWithoutRedirect,
    exitPasswordRecoveryMode,
    signInWithGoogle,
  }
})
