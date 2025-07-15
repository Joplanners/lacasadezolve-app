import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // --- ESTADO ---
  const session = ref(null)
  const userRole = ref(null)
  const _isPasswordRecoveryMode = ref(false)

  // La promesa que detendrá el router hasta que tengamos una respuesta de Supabase.
  let resolveAuthReady
  const authReadyPromise = new Promise((resolve) => {
    resolveAuthReady = resolve
  })

  // --- GETTERS (COMPUTEDS) ---
  const user = computed(() => session.value?.user ?? null)
  const isLoggedIn = computed(() => !!user.value)

  // --- ACCIONES ---

  // Función interna para obtener el rol del usuario desde la tabla 'profiles'.
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
        // Ignora el error "no rows found", es normal si el perfil aún no se crea.
        throw error
      }
      userRole.value = data?.role || 'user'
    } catch (catchError) {
      console.error('Error al obtener el rol del usuario:', catchError)
      userRole.value = 'user' // Asigna 'user' por defecto en caso de error.
    }
  }

  // Listener de Supabase: nuestra única fuente de verdad para la autenticación.
  supabase.auth.onAuthStateChange(async (event, newSession) => {
    // Actualizamos el estado de la sesión local.
    session.value = newSession

    // Obtenemos el rol del usuario si hay una nueva sesión.
    await fetchUserRole(newSession?.user?.id)

    // Si la promesa 'authReady' aún no se ha resuelto, la resolvemos.
    // Esto solo ocurrirá una vez, la primera vez que la app carga.
    // Esto desbloqueará el router para que continúe la navegación.
    if (resolveAuthReady) {
      resolveAuthReady()
      resolveAuthReady = null // Prevenimos que se resuelva de nuevo.
    }
  })

  // Acción para cerrar la sesión.
  async function signOut() {
    // Primero, limpiamos el estado local para que la UI reaccione al instante.
    session.value = null
    userRole.value = null
    // Luego, le pedimos a Supabase que invalide el token en el servidor.
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error al cerrar sesión en Supabase:', error)
    }
    // Finalmente, redirigimos al usuario a la página de login.
    router.push({ name: 'login' })
  }

  // Función para salir manualmente del modo de recuperación de contraseña.
  function exitPasswordRecoveryMode() {
    _isPasswordRecoveryMode.value = false
  }

  // Lo que exponemos al resto de la aplicación.
  return {
    // Estado reactivo
    session: readonly(session),
    user,
    userRole: readonly(userRole),
    isLoggedIn,
    isPasswordRecoveryMode: readonly(_isPasswordRecoveryMode),

    // Promesa para el router
    authReadyPromise,

    // Acciones
    signOut,
    exitPasswordRecoveryMode,
  }
})
