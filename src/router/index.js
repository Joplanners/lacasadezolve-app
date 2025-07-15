import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import AuthView from '../views/AuthView.vue'
import AdminLayout from '../layouts/AdminLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ... Tu lista de rutas no cambia, la pego aquí para que quede completo ...
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/ingreso',
      name: 'login',
      component: AuthView,
      meta: { requiresAuth: false },
    },
    {
      path: '/actualizar-contrasena',
      name: 'update-password',
      component: () => import('../views/UpdatePasswordView.vue'),
      meta: { requiresAuth: false, requiresPasswordRecovery: true }, // --> NUEVO: Meta para proteger esta ruta
    },
    {
      path: '/como-usar-ar',
      name: 'how-to',
      component: () => import('../views/HowToView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/tienda',
      name: 'store',
      component: () => import('../views/StoreView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/experiencia-ar/:markerId',
      name: 'ar-experience',
      component: () => import('../views/ARExperienceView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/mi-perfil',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/terminos-y-condiciones',
      name: 'terms-conditions',
      component: () => import('../views/TermsConditionsView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/politica-de-privacidad',
      name: 'privacy-policy',
      component: () => import('../views/PrivacyPolicyView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/politica-de-cookies',
      name: 'cookies-policy',
      component: () => import('../views/CookiesPolicyView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/foto-magica/:overlayId',
      name: 'overlay-photo-capture',
      component: () => import('../views/OverlayPhotoCaptureView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('../views/Admin/AdminDashboardView.vue'),
        },
        // ... El resto de tus rutas de admin ...
      ],
    },
  ],
})

// --- ¡AQUÍ ESTÁ LA NUEVA GUARDIA DE NAVEGACIÓN! ---
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // --> PASO 1: Esperar a que la autenticación se haya inicializado.
  // Reemplaza la promesa manual por un chequeo robusto de la bandera `authInitialized`.
  if (!authStore.authInitialized) {
    await new Promise((resolve) => {
      const unsubscribe = authStore.$subscribe((mutation, state) => {
        if (state.authInitialized) {
          unsubscribe()
          resolve()
        }
      })
    })
  }

  // --> PASO 2: Obtenemos el estado ACTUAL y las reglas de la ruta a la que vamos.
  const isLoggedIn = authStore.isLoggedIn
  const isAdmin = authStore.userRole === 'admin'
  const isRecoveryMode = authStore.isPasswordRecoveryMode

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin)
  const requiresPasswordRecovery = to.matched.some((record) => record.meta.requiresPasswordRecovery)

  // --> PASO 3: Aplicamos las reglas de forma clara y ordenada.

  // Regla para la página de actualizar contraseña
  if (requiresPasswordRecovery && !isRecoveryMode) {
    return next({ name: 'home' }) // Si no estás en modo recuperación, no puedes entrar aquí
  }

  // Si intentas ir al login, pero ya estás logueado...
  if (to.name === 'login' && isLoggedIn) {
    if (isAdmin) return next({ name: 'admin-dashboard' }) // ... el admin va a su dashboard
    return next({ name: 'profile' }) // ... el usuario normal a su perfil
  }

  // Si la ruta requiere que seas admin y no lo eres...
  if (requiresAdmin && !isAdmin) {
    return next({ name: 'profile' }) // ... te mandamos a tu perfil (o a una página de no autorizado)
  }

  // Si la ruta requiere autenticación y no estás logueado...
  if (requiresAuth && !isLoggedIn) {
    return next({ name: 'login', query: { redirect: to.fullPath } }) // ... te mandamos al login
  }

  // Si ninguna de las reglas anteriores te bloqueó, puedes pasar.
  return next()
})

export default router
