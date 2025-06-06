import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const userRole = ref(null)
  const isPasswordRecoveryMode = ref(false)

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
      if (error && status !== 406) throw error
      userRole.value = data?.role || 'user'
    } catch (catchError) {
      console.error('AuthStore - fetchUserRole: Error:', catchError)
      userRole.value = 'user'
    }
  }

  supabase.auth.onAuthStateChange(async (event, newSession) => {
    session.value = newSession

    if (newSession) {
      // Si hay sesión, siempre nos aseguramos de tener el rol
      await fetchUserRole(newSession.user.id)
    } else {
      // Si no hay sesión, limpiamos el rol
      userRole.value = null
    }

    // Lógica para modo recuperación de contraseña
    if (event === 'PASSWORD_RECOVERY') {
      isPasswordRecoveryMode.value = true
      // No redirigimos desde aquí para evitar conflictos con el router guard
    } else if (event !== 'USER_UPDATED') {
      // Cualquier otro evento que no sea solo una actualización de usuario
      // desactiva el modo de recuperación.
      isPasswordRecoveryMode.value = false
    }

    // Resolvemos la promesa de "autenticación lista" la primera vez que se ejecuta esto.
    // Esto es crucial para que el router sepa cuándo puede empezar a navegar.
    if (!authHasInitialized) {
      resolveAuthReady()
      authHasInitialized = true
    }
  })

  async function waitForAuthReady() {
    return authReadyPromise
  }

  async function signOut() {
    await supabase.auth.signOut()
    // onAuthStateChange se encargará de limpiar el estado y el router de redirigir
  }

  return {
    session,
    user,
    isLoggedIn,
    userRole: readonly(userRole),
    isPasswordRecoveryMode: readonly(isPasswordRecoveryMode),
    waitForAuthReady,
    signOut,
  }
})
