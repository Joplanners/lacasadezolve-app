import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const userRole = ref(null)
  const isPasswordRecoveryMode = ref(false)
  const isCheckingSession = ref(false) // <-- Nueva guarda para evitar ejecuciones simultáneas

  let resolveAuthReady
  const authReadyPromise = new Promise((resolve) => {
    resolveAuthReady = resolve
  })
  let authHasInitialized = false

  const user = computed(() => session.value?.user || null)
  const isLoggedIn = computed(() => !!session.value)

  async function fetchUserRole(userId) {
    if (!userId) {
      userRole.value = null
      return
    }
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error && status !== 406) {
        throw error
      }
      userRole.value = data?.role || 'user'
    } catch (catchError) {
      console.error('AuthStore - fetchUserRole: Error:', catchError)
      userRole.value = 'user' // Asignar un rol por defecto en caso de error
    }
  }

  async function setSession(newSession) {
    const oldUserId = session.value?.user?.id
    session.value = newSession

    if (newSession?.user) {
      // Si es un nuevo usuario o el rol no ha sido cargado, lo buscamos.
      if (newSession.user.id !== oldUserId || !userRole.value) {
        await fetchUserRole(newSession.user.id)
      }
    } else {
      userRole.value = null
    }
  }

  function clearSession() {
    session.value = null
    userRole.value = null
    isPasswordRecoveryMode.value = false
    if (!authHasInitialized && resolveAuthReady) {
      resolveAuthReady()
      authHasInitialized = true
    }
  }

  async function checkSessionOnLoad() {
    // Si ya hay una comprobación en curso, no hacemos nada.
    if (isCheckingSession.value) {
      return
    }

    isCheckingSession.value = true
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      await setSession(data.session)
    } catch (error) {
      console.error('AuthStore: Error en checkSessionOnLoad catch:', error)
      clearSession()
    } finally {
      isCheckingSession.value = false // Liberamos la guarda
      if (!authHasInitialized && resolveAuthReady) {
        resolveAuthReady()
        authHasInitialized = true
      }
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    // onAuthStateChange se encargará de limpiar el estado
  }

  supabase.auth.onAuthStateChange(async (event, newSession) => {
    console.log(`AuthStore - onAuthStateChange Event: ${event}`)

    if (event === 'PASSWORD_RECOVERY') {
      clearSession()
      isPasswordRecoveryMode.value = true
      router.push({ name: 'update-password' })
      return
    }
    if (event === 'USER_UPDATED') {
      // El usuario actualizó su contraseña, por ejemplo.
      // Forzamos la salida del modo de recuperación.
      isPasswordRecoveryMode.value = false
      return // No necesitamos procesar la sesión completa de nuevo aquí
    }

    // Si la sesión se cierra, limpiamos todo
    if (event === 'SIGNED_OUT') {
      clearSession()
      // Si la ruta actual requiere autenticación, redirigimos al login
      if (router.currentRoute.value.meta.requiresAuth) {
        router.push({ name: 'login' })
      }
      return
    }

    // Para SIGNED_IN y INITIAL_SESSION, procesamos la sesión
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      isPasswordRecoveryMode.value = false
      await setSession(newSession)

      if (!authHasInitialized && resolveAuthReady) {
        resolveAuthReady()
        authHasInitialized = true
      }

      // Lógica de redirección post-login
      const isLoginPage = router.currentRoute.value.name === 'login'
      if (event === 'SIGNED_IN' && isLoginPage) {
        if (userRole.value === 'admin') {
          router.push({ name: 'admin-dashboard' })
        } else {
          router.push({ name: 'profile' })
        }
      }
    }
  })

  async function waitForAuthReady() {
    return authReadyPromise
  }

  // Iniciar la primera comprobación
  checkSessionOnLoad()

  return {
    session,
    user,
    isLoggedIn,
    userRole: readonly(userRole),
    isPasswordRecoveryMode: readonly(isPasswordRecoveryMode),
    waitForAuthReady,
    checkSessionOnLoad,
    signOut,
  }
})
