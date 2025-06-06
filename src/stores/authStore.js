import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const userRole = ref(null)
  const isPasswordRecoveryMode = ref(false)
  const isCheckingSession = ref(false)

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
      userRole.value = 'user'
    }
  }

  async function setSession(newSession) {
    const oldUserId = session.value?.user?.id
    session.value = newSession
    if (newSession?.user) {
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
      isCheckingSession.value = false
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
      isPasswordRecoveryMode.value = true
      router.push({ name: 'update-password' })
      return
    }
    if (event === 'USER_UPDATED') {
      isPasswordRecoveryMode.value = false
      return
    }
    if (event === 'SIGNED_OUT') {
      clearSession()
      if (router.currentRoute.value.meta.requiresAuth) {
        router.push({ name: 'login' })
      }
      return
    }
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      isPasswordRecoveryMode.value = false
      await setSession(newSession)
      if (!authHasInitialized && resolveAuthReady) {
        resolveAuthReady()
        authHasInitialized = true
      }
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
