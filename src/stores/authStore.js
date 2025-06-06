import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const _isPasswordRecoveryMode = ref(false)
  const isPasswordRecoveryMode = readonly(_isPasswordRecoveryMode)
  const userRole = ref(null)
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
    userRole.value = null
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
      userRole.value = 'user'
    }
  }

  async function setSession(newSession, calledDuringRecovery = false) {
    const oldUserId = session.value?.user?.id
    session.value = newSession
    let roleCheckPromise = Promise.resolve()
    if (!newSession) {
      userRole.value = null
    }
    if (newSession?.user) {
      if (!calledDuringRecovery && (newSession.user.id !== oldUserId || userRole.value === null)) {
        roleCheckPromise = fetchUserRole(newSession.user.id)
      } else if (calledDuringRecovery) {
        userRole.value = null
      }
    } else if (session.value === null) {
      userRole.value = null
    }
    await roleCheckPromise
  }

  function clearSession() {
    setSession(null)
    _isPasswordRecoveryMode.value = false
    if (!authHasInitialized && resolveAuthReady) {
      resolveAuthReady()
      authHasInitialized = true
    }
  }

  async function checkSessionOnLoad() {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      await setSession(data.session)
    } catch (error) {
      console.error('AuthStore: Error en checkSessionOnLoad catch:', error)
      clearSession()
    } finally {
      if (!authHasInitialized && resolveAuthReady) {
        resolveAuthReady()
        authHasInitialized = true
      }
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  supabase.auth.onAuthStateChange(async (event, newSession) => {
    if (event === 'PASSWORD_RECOVERY') {
      clearSession()
      _isPasswordRecoveryMode.value = true
      router.push({ name: 'update-password' })
      setTimeout(
        () => {
          if (_isPasswordRecoveryMode.value) _isPasswordRecoveryMode.value = false
        },
        10 * 60 * 1000,
      )
      return
    }

    if (event === 'SIGNED_OUT') {
      clearSession()
      // ¡AQUÍ ESTÁ LA MAGIA!
      // Después de limpiar la sesión, redirigimos explícitamente al login.
      router.push({ name: 'login' })
      return
    }

    if (_isPasswordRecoveryMode.value) {
      if (event === 'SIGNED_IN' && newSession?.user) {
        _isPasswordRecoveryMode.value = false
      }
      return
    }

    await setSession(newSession)

    if (
      !authHasInitialized &&
      (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
      resolveAuthReady
    ) {
      resolveAuthReady()
      authHasInitialized = true
    }

    if (event === 'SIGNED_IN' && router.currentRoute.value.name === 'login') {
      await new Promise((resolve) => setTimeout(resolve, 0))
      if (userRole.value === 'admin') {
        router.push({ name: 'admin-dashboard' })
      } else {
        router.push({ name: 'profile' })
      }
    }
  })

  async function waitForAuthReady() {
    return authReadyPromise
  }

  function exitPasswordRecoveryMode() {
    _isPasswordRecoveryMode.value = false
  }

  checkSessionOnLoad()

  return {
    session,
    user,
    isLoggedIn,
    userRole: readonly(userRole),
    isPasswordRecoveryMode,
    waitForAuthReady,
    exitPasswordRecoveryMode,
    checkSessionOnLoad,
    signOut,
  }
})
