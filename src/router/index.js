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
      path: '/bienvenida',
      name: 'welcome',
      component: () => import('../views/WelcomeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/actualizar-contrasena',
      name: 'update-password',
      component: () => import('../views/UpdatePasswordView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/mi-perfil/pedido/:orderId',
      name: 'order-detail',
      component: OrderDetail,
      meta: { requiresAuth: true },
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
      props: true,
      meta: { requiresAuth: false },
    },
    {
      path: '/carrito',
      name: 'cart',
      component: () => import('../views/CartView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/finalizar-compra',
      name: 'checkout',
      component: () => import('../views/CheckoutView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/pedido-transferencia/:orderId',
      name: 'transfer-pending',
      component: () => import('../views/TransferPendingView.vue'),
      props: true,
      meta: { requiresAuth: false },
    },
    {
      path: '/orden-confirmada/:orderId',
      name: 'order-confirmation',
      component: () => import('../views/OrderConfirmationView.vue'),
      props: true,
      meta: { requiresAuth: false },
    },
    {
      path: '/payment/return',
      name: 'payment-return',
      component: () => import('@/views/PaymentReturnView.vue'),
      meta: {
        requiresAuth: false,
        skipAuthCheck: true,
      },
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
          path: 'pedidos',
          name: 'admin-orders',
          component: () => import('../views/Admin/AdminOrdersListView.vue'),
        },
        {
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

// 🔥 GUARD CORREGIDO: Ahora espera a que la auth esté lista
router.beforeEach(async (to, from, next) => {
  console.log('🚦 Router Guard - Navegando a:', to.name, to.path)
  console.log('🚦 Router Guard - Desde:', from.name, from.path)

  // Si es payment-return, salta la verificación de auth
  if (to.meta.skipAuthCheck) {
    console.log('⏭️ Saltando verificación de auth para payment-return')
    next()
    return
  }

  const authStore = useAuthStore()

  // 🔥 CAMBIO CRÍTICO: Esperar a que la auth esté lista antes de verificar
  await authStore.authReadyPromise

  console.log('👤 isLoggedIn:', authStore.isLoggedIn)
  console.log('👤 userRole:', authStore.userRole)

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin)

  console.log('🔐 requiresAuth:', requiresAuth)
  console.log('🔐 requiresAdmin:', requiresAdmin)

  if (requiresAuth && !authStore.isLoggedIn) {
    console.warn('⚠️ Acceso denegado: No autenticado')
    console.log('🔄 Redirigiendo a /ingreso')
    next({ name: 'login' })
  } else if (requiresAdmin && authStore.userRole !== 'admin') {
    console.warn('⚠️ Acceso denegado: No es admin')
    console.log('🔄 Redirigiendo a /')
    next({ name: 'home' })
  } else {
    console.log('✅ Navegación permitida')
    next()
  }
})

export default router
