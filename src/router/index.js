import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import AuthView from '../views/AuthView.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import OrderDetail from '../views/OrderDetail.vue'

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
      path: '/bienvenida', // La URL que verá el usuario
      name: 'welcome', // El nombre que usamos en router.push
      component: () => import('../views/WelcomeView.vue'),
      meta: { requiresAuth: true }, // Requiere estar logueado para verla
    },
    {
      path: '/actualizar-contrasena',
      name: 'update-password',
      component: () => import('../views/UpdatePasswordView.vue'),
      meta: { requiresAuth: false }, // Se manejará con la lógica del store
    },
    {
      path: '/mi-perfil/pedido/:orderId',
      name: 'order-detail',
      component: OrderDetail,
      meta: { requiresAuth: true }, // Opcional: si requiere inicio de sesión
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
      path: '/producto/:id',
      name: 'product-detail',
      component: () => import('../views/ProductDetailView.vue'),
      props: true, // Esto pasa el :id de la URL como un prop al componente
      meta: { requiresAuth: false },
    },
    {
      path: '/carrito',
      name: 'cart',
      component: () => import('../views/CartView.vue'),
      meta: { requiresAuth: false }, // Permitimos ver el carrito a invitados
    },
    {
      path: '/finalizar-compra', // La URL que verá el usuario
      name: 'checkout', // El nombre que usamos en router.push
      component: () => import('../views/CheckoutView.vue'),
      meta: { requiresAuth: false }, // Permitimos checkout a invitados
    },
    {
      path: '/pedido-transferencia/:orderId', // La URL que verá el usuario
      name: 'transfer-pending', // El nombre que usamos en router.push
      component: () => import('../views/TransferPendingView.vue'),
      props: true, // ¡Importante! Pasa :orderId como prop al componente
      meta: { requiresAuth: false }, // Permitimos verla a invitados
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
        {
          path: 'categorias',
          name: 'admin-categories',
          component: () => import('../views/Admin/AdminProductCategoriesView.vue'),
        },
        {
          path: 'productos',
          name: 'admin-products',
          component: () => import('../views/Admin/AdminProductListView.vue'),
        },
        {
          path: 'productos/nuevo',
          name: 'admin-product-new',
          component: () => import('../views/Admin/AdminProductFormView.vue'),
          props: { isEditMode: false },
        },
        {
          path: 'productos/editar/:id',
          name: 'admin-product-edit',
          component: () => import('../views/Admin/AdminProductFormView.vue'),
          props: { isEditMode: true },
        },
        {
          path: 'productos-destacados',
          name: 'admin-featured-products',
          component: () => import('@/views/Admin/AdminFeaturedProductsView.vue'),
        },
        {
          path: 'banners',
          name: 'admin-banners',
          component: () => import('@/views/Admin/AdminBannersView.vue'),
        },
        {
          path: 'cupones',
          name: 'admin-coupons',
          component: () => import('../views/Admin/AdminCouponsView.vue'),
        },
        {
          path: 'pedidos', // La URL será /admin/pedidos
          name: 'admin-orders',
          component: () => import('../views/Admin/AdminOrdersListView.vue'),
        },
        {
          // Cambiamos :id por :orderId para que coincida con los componentes
          path: 'pedidos/:orderId',
          name: 'admin-order-detail',
          component: () => import('../views/Admin/AdminOrderDetailView.vue'),
          props: true,
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/NotFoundView.vue'),
      meta: { requiresAuth: false },
    },
  ],
})

// Guardia de Navegación Global
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Esperamos a que la promesa 'authReady' se resuelva. Esto asegura que
  // el primer chequeo de onAuthStateChange de Supabase se ha completado.
  await authStore.authReadyPromise

  // Obtenemos el estado de autenticación DESPUÉS de que la promesa se resolvió.
  const isLoggedIn = authStore.isLoggedIn
  const userRole = authStore.userRole

  // Obtenemos los requisitos de la ruta a la que se intenta navegar.
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin)

  // REGLA 1: Si la ruta requiere ser admin y el usuario no lo es...
  if (requiresAdmin && userRole !== 'admin') {
    // Lo redirigimos a su perfil. No tiene permiso.
    return next({ name: 'profile' })
  }

  // REGLA 2: Si la ruta requiere estar logueado y el usuario no lo está...
  if (requiresAuth && !isLoggedIn) {
    // Lo redirigimos a la página de login.
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  // REGLA 3: Si el usuario intenta ir a la página de login pero ya está logueado...
  if (to.name === 'login' && isLoggedIn) {
    // Lo redirigimos a la página apropiada según su rol.
    if (userRole === 'admin') return next({ name: 'admin-dashboard' })
    return next({ name: 'profile' })
  }

  // Si ninguna de las reglas anteriores detuvo la navegación, permitimos el paso.
  next()
})

export default router
