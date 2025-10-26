<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { RouterView, RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from './stores/storeCart'
import { storeToRefs } from 'pinia'
import VueCookieAcceptDecline from 'vue-cookie-accept-decline'
import 'vue-cookie-accept-decline/dist/vue-cookie-accept-decline.css'
import ZolveBotChat from './components/ZolveBotChat.vue'
import { supabase } from '@/lib/supabaseClient'
import AppFooter from './components/AppFooter.vue'

const authStore = useAuthStore()
const cartStore = useCartStore()
const router = useRouter()
const route = useRoute() // <-- ¡Perfecto que ya lo tenías!

// =======================================================================
// <-- ¡CAMBIO CLAVE AQUÍ! -->
// Importamos el userDisplayName DIRECTAMENTE del store.
const { isLoggedIn, isPasswordRecoveryMode, userRole, userDisplayName } = storeToRefs(authStore)
// =======================================================================

const cartItemCount = computed(() => cartStore.cartItemCount)

const isMobileMenuOpen = ref(false)
const isMobileView = ref(window.innerWidth < 768)
const isLandscape = ref(false)

const isARExperienceActive = computed(() => route.name === 'ar-experience')
const isOverlayPhotoCaptureActive = computed(() => route.name === 'overlay-photo-capture')

const appHeaderRef = ref(null)
const navContainerRef = ref(null)
const navbarCombinedHeight = ref(0)
const appHeaderActualHeight = ref(0)

// =======================================================================
// <-- ¡HEMOS ELIMINADO EL userDisplayName LOCAL DE AQUÍ! -->
// Ya no es necesario, porque lo traemos directamente del store.
// =======================================================================

const calculateNavbarHeights = () => {
  let totalCombinedH = 0
  let currentHeaderH = 0
  if (showNavbar.value) {
    if (appHeaderRef.value && typeof appHeaderRef.value.offsetHeight === 'number') {
      currentHeaderH = appHeaderRef.value.offsetHeight
      totalCombinedH += currentHeaderH
    }
    if (navContainerRef.value && typeof navContainerRef.value.offsetHeight === 'number') {
      if (navContainerRef.value.offsetParent !== null) {
        const navStyle = getComputedStyle(navContainerRef.value)
        if (navStyle.display !== 'none' && navStyle.visibility !== 'hidden') {
          totalCombinedH += navContainerRef.value.offsetHeight
        }
      }
    }
  }
  navbarCombinedHeight.value = totalCombinedH
  appHeaderActualHeight.value = currentHeaderH
  if (currentHeaderH > 0 && showNavbar.value) {
    document.documentElement.style.setProperty('--app-header-actual-height', `${currentHeaderH}px`)
  }
}

const showNavbar = computed(() => {
  // 🔥 =================== ¡AQUÍ ESTÁ EL CAMBIO! =================== 🔥
  // Si la ruta pide un layout "en blanco" (como payment-return),
  // ocultamos el navbar y no seguimos revisando.
  if (route.meta.blankLayout) return false
  // 🔥 ============================================================= 🔥

  if (isPasswordRecoveryMode.value && route.name !== 'update-password') return false
  const publicRoutesWithNavbar = [
    'home',
    'login',
    'how-to',
    'store',
    'terms-conditions',
    'privacy-policy',
    'cookies-policy',
    'product-detail',
    'cart',
    // 'payment-return', // <-- Lo quitamos de aquí, ahora lo maneja blankLayout
  ]
  if (!isLoggedIn.value) return publicRoutesWithNavbar.includes(route.name)
  if (isARExperienceActive.value) return !isMobileView.value || !isLandscape.value
  return !isPasswordRecoveryMode.value
})

const showFooter = computed(() => {
  // 🔥 =================== ¡AQUÍ ESTÁ EL CAMBIO! =================== 🔥
  if (route.meta.blankLayout) return false
  // 🔥 ============================================================= 🔥

  return !isARExperienceActive.value && !isOverlayPhotoCaptureActive.value
})

const showZolveBot = computed(() => {
  // 🔥 =================== ¡AQUÍ ESTÁ EL CAMBIO! =================== 🔥
  if (route.meta.blankLayout) return false
  // 🔥 ============================================================= 🔥

  return !isARExperienceActive.value && !isOverlayPhotoCaptureActive.value
})

let lastActiveTime = Date.now()
const MAX_INACTIVE_TIME = 30 * 60 * 1000

const resetInactivityTimer = () => {
  lastActiveTime = Date.now()
}
window.addEventListener('mousemove', resetInactivityTimer)
window.addEventListener('keydown', resetInactivityTimer)
window.addEventListener('scroll', resetInactivityTimer)
window.addEventListener('click', resetInactivityTimer)

const handleVisibilityChange = async () => {
  if (document.visibilityState === 'visible') {
    const now = Date.now()
    const inactiveTime = now - lastActiveTime
    if (inactiveTime > MAX_INACTIVE_TIME) {
      try {
        await supabase.auth.refreshSession()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session && authStore.isLoggedIn) {
          await authStore.signOut()
        }
      } catch (e) {
        console.error('Error manejando visibilidad:', e)
      }
    }
    lastActiveTime = now
  }
}

onMounted(() => {
  handleResizeAndOrientation()
  window.addEventListener('resize', handleResizeAndOrientation)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  if (screen.orientation) {
    screen.orientation.addEventListener('change', handleResizeAndOrientation)
  } else {
    const mediaQuery = window.matchMedia('(orientation: landscape)')
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleResizeAndOrientation)
    } else {
      mediaQuery.addListener(handleResizeAndOrientation)
    }
  }
  nextTick(calculateNavbarHeights)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResizeAndOrientation)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (screen.orientation) {
    screen.orientation.removeEventListener('change', handleResizeAndOrientation)
  } else {
    const mediaQuery = window.matchMedia('(orientation: landscape)')
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleResizeAndOrientation)
    } else {
      mediaQuery.removeListener(handleResizeAndOrientation)
    }
  }
})

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
  nextTick(calculateNavbarHeights)
}

function closeMobileMenu() {
  if (isMobileMenuOpen.value) {
    isMobileMenuOpen.value = false
    nextTick(calculateNavbarHeights)
  }
}

watch(
  () => route.path,
  () => {
    if (isMobileMenuOpen.value) closeMobileMenu()
  },
)

const handleLogout = async () => {
  closeMobileMenu()
  await authStore.signOut()
  router.push({ name: 'home' })
}

function cookieStatus() {}
function cookieRemoved() {}

const mainContentPaddingTop = computed(() => {
  if (isOverlayPhotoCaptureActive.value || (isARExperienceActive.value && showNavbar.value)) {
    return `${navbarCombinedHeight.value}px`
  }
  return ''
})

function handleResizeAndOrientation() {
  isMobileView.value = window.innerWidth < 768
  if (screen.orientation && typeof screen.orientation.type !== 'undefined') {
    isLandscape.value = screen.orientation.type.startsWith('landscape')
  } else {
    isLandscape.value = window.matchMedia('(orientation: landscape)').matches
  }
  nextTick(calculateNavbarHeights)
}
</script>

<template>
  <div
    id="app-container"
    :class="{
      'ar-mode-active': isARExperienceActive,
      'overlay-photo-mode-active': isOverlayPhotoCaptureActive,
    }"
  >
    <header ref="appHeaderRef" class="app-header" v-if="showNavbar">
      <div class="logo-container">
        <RouterLink :to="{ name: 'home' }" class="logo-link-header" @click="closeMobileMenu">
          <img src="/LogoZolve.png" alt="Logo Zolve" class="header-logo-img" />
        </RouterLink>
      </div>

      <div class="user-actions">
        <div class="user-info" v-if="isLoggedIn">
          Hola <strong>{{ userDisplayName }}</strong>
        </div>

        <router-link to="/carrito" class="cart-widget" aria-label="Ver carrito de compras">
          <font-awesome-icon :icon="['fas', 'shopping-cart']" />
          <span v-if="cartItemCount > 0" class="cart-count">{{ cartItemCount }}</span>
        </router-link>

        <button v-if="isLoggedIn" @click="handleLogout" class="btn-logout-header">
          Cerrar Sesión
        </button>
      </div>
    </header>

    <div ref="navContainerRef" class="nav-container" v-if="showNavbar">
      <button
        class="mobile-menu-toggle"
        @click="toggleMobileMenu"
        :aria-expanded="isMobileMenuOpen.toString()"
        aria-label="Toggle navigation"
      >
        <span class="hamburger-icon"><span></span><span></span><span></span></span>
      </button>
      <nav class="main-nav" :class="{ 'mobile-menu-active': isMobileMenuOpen }">
        <router-link :to="{ name: 'home' }" @click="closeMobileMenu">Inicio</router-link>
        <router-link :to="{ name: 'how-to' }" @click="closeMobileMenu">Cómo Usar</router-link>
        <router-link :to="{ name: 'store' }" @click="closeMobileMenu">Tienda</router-link>
        <router-link v-if="!isLoggedIn" :to="{ name: 'login' }" @click="closeMobileMenu"
          >Login/Registro</router-link
        >
        <template v-if="isLoggedIn">
          <router-link
            v-if="userRole === 'admin'"
            :to="{ name: 'admin-dashboard' }"
            @click="closeMobileMenu"
            >Panel Admin</router-link
          >
          <router-link v-else :to="{ name: 'profile' }" @click="closeMobileMenu"
            >Mi Perfil</router-link
          >
        </template>
      </nav>
    </div>

    <main class="main-content" :style="{ paddingTop: mainContentPaddingTop }">
      <RouterView />
    </main>

    <AppFooter v-if="showFooter" />

    <vue-cookie-accept-decline
      :elementId="'cookieConsentBanner'"
      @status="cookieStatus"
      @removed="cookieRemoved"
      position="bottom"
      type="floating"
      transitionName="slideFromBottom"
    >
      <template #message>
        Usamos cookies para mejorar tu experiencia.
        <router-link :to="{ name: 'cookies-policy' }" class="cookie-link"
          >Más información</router-link
        >
      </template>
      <template #acceptContent>Entendido!</template>
      <template #declineContent>Rechazar</template>
    </vue-cookie-accept-decline>

    <ZolveBotChat v-if="showZolveBot" />
  </div>
</template>

<style>
#cookieConsentBanner {
  background-color: var(--vt-c-black-soft) !important;
  color: var(--vt-c-white-soft) !important;
  padding: 15px 25px !important;
  font-size: 0.9em !important;
  line-height: 1.4 !important;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3) !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 15px !important;
  z-index: 2000 !important;
}
#cookieConsentBanner .cookie__text {
  margin-right: 15px;
  flex-grow: 1;
}
#cookieConsentBanner .cookie__link {
  color: var(--brand-turquoise) !important;
  text-decoration: underline !important;
  font-weight: 700 !important;
}
#cookieConsentBanner .cookie__link:hover {
  color: var(--brand-pink) !important;
}
#cookieConsentBanner .cookie__button {
  background-color: var(--brand-pink) !important;
  color: var(--vt-c-white) !important;
  border: none !important;
  border-radius: 5px !important;
  padding: 10px 20px !important;
  font-weight: var(--font-weight-medium) !important;
  cursor: pointer !important;
  margin-left: 10px !important;
  white-space: nowrap !important;
}
#cookieConsentBanner .cookie__button:hover {
  background-color: #e65c7a !important;
}
#cookieConsentBanner .cookie__button_decline {
  background-color: #6c757d !important;
  color: var(--vt-c-white) !important;
  border: none !important;
  border-radius: 5px !important;
  padding: 10px 20px !important;
  font-weight: var(--font-weight-medium) !important;
  cursor: pointer !important;
  white-space: nowrap !important;
}
#cookieConsentBanner .cookie__button_decline:hover {
  background-color: #5a6268 !important;
}
@media (max-width: 767px) {
  #cookieConsentBanner {
    flex-direction: column !important;
    padding: 15px !important;
    text-align: center !important;
  }
  #cookieConsentBanner .cookie__text {
    margin-right: 0 !important;
    margin-bottom: 10px !important;
  }
  #cookieConsentBanner .cookie__buttons {
    display: flex !important;
    gap: 10px !important;
    width: 100% !important;
    justify-content: center !important;
  }
  #cookieConsentBanner .cookie__button,
  #cookieConsentBanner .cookie__button_decline {
    margin-left: 0 !important;
    flex-grow: 1;
  }
}
</style>

<style scoped>
#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: var(--font-family-base);
  background-color: var(--color-background);
  color: var(--color-text);
}

.app-header,
.nav-container {
  width: 100%;
  flex-shrink: 0;
}

.main-content {
  flex-grow: 1;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  box-sizing: border-box;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 20px;
  background-color: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  box-sizing: border-box;
}
.header-logo-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}
.btn-logout-header {
  padding: 6px 14px;
  background-color: var(--vt-c-indigo);
  color: var(--vt-c-white);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.nav-container {
  background-color: var(--color-background-mute);
  border-bottom: 1px solid var(--color-border);
  padding: 0 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 50px;
  box-sizing: border-box;
}
.mobile-menu-toggle {
  display: none;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 15px;
}
.hamburger-icon {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  width: 24px;
  height: 18px;
}
.hamburger-icon span {
  display: block;
  width: 100%;
  height: 3px;
  background-color: var(--color-heading);
  border-radius: 1px;
  transition: all 0.3s ease-in-out;
}
.main-nav {
  display: flex;
  justify-content: center;
  padding: 10px 0;
  flex-wrap: wrap;
  width: 100%;
}
.main-nav a {
  margin: 5px 15px;
  text-decoration: none;
  color: var(--color-link);
  font-weight: 700;
  padding: 8px 0;
  border-bottom: 2px solid transparent;
}
.main-nav a:hover {
  color: var(--color-link-hover);
}
.main-nav a.router-link-exact-active {
  color: var(--color-link-hover);
  border-bottom-color: var(--color-link);
}

/* --- ESTILOS PARA LAS ACCIONES DE USUARIO Y CARRITO --- */
.user-actions {
  display: flex;
  align-items: center;
  gap: 20px; /* Espacio entre saludo, carrito y logout */
}

.user-info {
  color: var(--color-text);
}
.user-info strong {
  color: var(--color-heading);
  font-weight: var(--font-weight-medium);
}

.cart-widget {
  position: relative;
  font-size: 1.5rem;
  color: var(--brand-pink);
  text-decoration: none;
  transition: transform 0.2s ease;
}
.cart-widget:hover {
  transform: scale(1.1);
}

.cart-count {
  position: absolute;
  top: -5px;
  right: -10px;
  background-color: var(--brand-turquoise);
  color: white;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  font-size: 0.75rem;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px solid var(--color-background-soft); /* Borde del color de fondo del header */
}
/* --- FIN DE ESTILOS NUEVOS --- */

/* --- BLOQUE RESPONSIVE CORREGIDO --- */
@media (max-width: 767px) {
  .main-content {
    padding: 2rem 15px;
  }

  /* El logo se queda a la izquierda, las acciones a la derecha */
  .logo-container {
    margin-left: 0;
  }
  .user-actions {
    margin-right: 0;
  }
  .user-info {
    display: none; /* Ocultamos saludo en móvil */
  }

  /* Movemos el botón de logout al final dentro de las acciones */
  .btn-logout-header {
    order: 3; /* Le damos orden alto para que quede al final */
    margin-left: 0; /* Reseteamos margen */
  }

  .nav-container {
    justify-content: flex-start; /* Alinea hamburguesa a la izquierda */
  }
  .mobile-menu-toggle {
    display: flex;
  }
  .main-nav {
    display: none;
    flex-direction: column;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: var(--color-background-soft);
    border: 1px solid var(--color-border);
    border-top: none;
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  .main-nav.mobile-menu-active {
    display: flex;
  }
  .main-nav a {
    margin: 0;
    padding: 15px 20px;
    border-bottom: 1px solid var(--color-border);
  }
  .main-nav a:last-child {
    border-bottom: none;
  }
  .main-nav a.router-link-exact-active {
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-background-mute);
  }
  .mobile-menu-toggle[aria-expanded='true'] .hamburger-icon span:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
  }
  .mobile-menu-toggle[aria-expanded='true'] .hamburger-icon span:nth-child(2) {
    opacity: 0;
  }
  .mobile-menu-toggle[aria-expanded='true'] .hamburger-icon span:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
  }
}
/* --- FIN DEL BLOQUE RESPONSIVE --- */
</style>
