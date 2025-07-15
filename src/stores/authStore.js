import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // --- ESTADO ---
  const session = ref(null)
  const userRole = ref(null)
  const _isPasswordRecoveryMode = ref(false)
  const isPasswordRecoveryMode = readonly(_isPasswordRecoveryMode)

  // --> ¡SIMPLIFICACIÓN! Nos despedimos de la promesa 'authReady' manual.
  // El listener de Supabase se encargará de todo de forma natural.
  const authInitialized = ref(false)

  // --- GETTERS (COMPUTEDS) ---
  const user = computed(() => session.value?.user ?? null)
  const isLoggedIn = computed(() => !!user.value) // --> Usamos 'user' en lugar de 'session' para más precisión

  // --- ACCIONES ---

  // --> MEJORA: Esta función ahora es privada del store (no se retorna)
  // Será llamada únicamente por el listener, asegurando una única fuente de verdad.
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
        // PGRST116 es 'no rows returned', lo cual es normal
        throw error
      }
      userRole.value = data?.role || 'user'
    } catch (catchError) {
      console.error('AuthStore - fetchUserRole: Error:', catchError)
      userRole.value = 'user' // --> Asumimos 'user' como rol por defecto en caso de error
    }
  }

  // --> ¡ESTE ES EL CORAZÓN DE LA SOLUCIÓN!
  // El listener de Supabase se convierte en el único responsable
  // de manejar todos los cambios de autenticación.
  supabase.auth.onAuthStateChange(async (event, newSession) => {
    console.log('onAuthStateChange evento:', event) // Para depuración

    if (event === 'PASSWORD_RECOVERY') {
      _isPasswordRecoveryMode.value = true
      session.value = newSession // Guardamos la sesión de recuperación
      // Redirigimos al usuario para que actualice su contraseña.
      // La ruta debe estar protegida para solo permitir el acceso en este modo.
      router.push({ name: 'update-password' })
      return
    }

    session.value = newSession

    if (newSession?.user) {
      // Si hay un usuario, buscamos su rol
      await fetchUserRole(newSession.user.id)

      // Si venimos de un inicio de sesión o recuperación exitosa, redirigimos
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        _isPasswordRecoveryMode.value = false // Nos aseguramos de salir del modo recuperación

        // Esperamos un ciclo para que el router esté listo
        await router.isReady()

        if (router.currentRoute.value.name === 'login') {
          if (userRole.value === 'admin') {
            router.push({ name: 'admin-dashboard' })
          } else {
            router.push({ name: 'profile' })
          }
        }
      }
    } else {
      // Si no hay sesión, limpiamos el rol y nos aseguramos de estar en una ruta pública
      userRole.value = null
      _isPasswordRecoveryMode.value = false // Salimos del modo recuperación

      // Si el usuario cierra sesión activamente, lo llevamos al login
      if (event === 'SIGNED_OUT') {
        router.push({ name: 'login' })
      }
    }

    // --> Marcamos la autenticación como inicializada la primera vez que se recibe un evento
    if (!authInitialized.value) {
      authInitialized.value = true
    }
  })

  // --> ELIMINADO: `setSession`, `clearSession`, `checkSessionOnLoad`
  // Toda esta lógica ahora está centralizada y simplificada dentro de onAuthStateChange.

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  function exitPasswordRecoveryMode() {
    _isPasswordRecoveryMode.value = false
  }

  return {
    // Estado y Getters
    session: readonly(session), // Es buena práctica exponer el estado como readonly
    user,
    isLoggedIn,
    userRole: readonly(userRole),
    isPasswordRecoveryMode,
    authInitialized: readonly(authInitialized), // Exponemos si la auth ha sido chequeada

    // Acciones
    signOut,
    exitPasswordRecoveryMode,
  }
})
