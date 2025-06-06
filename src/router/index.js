import { createRouter, createWebHistory } from 'vue-router'
import AuthView from '../views/AuthView.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
      meta: { requiresAuth: false },
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
        {
          path: 'usuarios',
          name: 'admin-users',
          component: () => import('../views/Admin/AdminUserListView.vue'),
        },
        {
          path: 'marcadores',
          name: 'admin-markers',
          component: () => import('../views/Admin/AdminMarkersListView.vue'),
        },
        {
          path: 'marcadores/nuevo',
          name: 'admin-marker-new',
          component: () => import('../views/Admin/AdminMarkerFormView.vue'),
          props: { isEditMode: false },
        },
        {
          path: 'marcadores/editar/:id',
          name: 'admin-marker-edit',
          component: () => import('../views/Admin/AdminMarkerFormView.vue'),
          props: { isEditMode: true },
        },
        {
          path: 'contenidos',
          name: 'admin-contents',
          component: () => import('../views/Admin/AdminContentsListView.vue'),
        },
        {
          path: 'contenidos/nuevo',
          name: 'admin-content-new',
          component: () => import('../views/Admin/AdminContentFormView.vue'),
          props: { isEditMode: false },
        },
        {
          path: 'contenidos/editar/:id',
          name: 'admin-content-edit',
          component: () => import('../views/Admin/AdminContentFormView.vue'),
          props: { isEditMode: true },
        },
        {
          path: 'superposiciones',
          name: 'admin-overlay-images',
          component: () => import('../views/Admin/AdminOverlayImageListView.vue'),
        },
        {
          path: 'superposiciones/nueva',
          name: 'admin-overlay-image-new',
          component: () => import('../views/Admin/AdminOverlayImageFormView.vue'),
          props: { isEditMode: false },
        },
        {
          path: 'superposiciones/editar/:id',
          name: 'admin-overlay-image-edit',
          component: () => import('../views/Admin/AdminOverlayImageFormView.vue'),
          props: { isEditMode: true },
        },
      ],
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  await authStore.waitForAuthReady()

  const isLoggedIn = authStore.isLoggedIn
  const userRole = authStore.userRole
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (to.name === 'update-password') {
    return next()
  }

  if (isLoggedIn) {
    if (to.name === 'login') {
      return next({ name: userRole === 'admin' ? 'admin-dashboard' : 'profile' })
    }
    const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin)
    if (requiresAdmin && userRole !== 'admin') {
      return next({ name: 'profile' })
    }
    return next()
  } else {
    if (requiresAuth) {
      return next({ name: 'login', query: { redirect: to.fullPath } })
    }
    return next()
  }
})

export default router
