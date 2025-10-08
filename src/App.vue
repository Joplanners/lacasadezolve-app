<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { RouterView, RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { storeToRefs } from 'pinia'
import VueCookieAcceptDecline from 'vue-cookie-accept-decline'
import 'vue-cookie-accept-decline/dist/vue-cookie-accept-decline.css'
import ZolveBotChat from './components/ZolveBotChat.vue'
import { supabase } from '@/lib/supabaseClient'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const { isLoggedIn, user, isPasswordRecoveryMode, userRole } = storeToRefs(authStore)

const isMobileMenuOpen = ref(false)
const isMobileView = ref(window.innerWidth < 768)
const isLandscape = ref(false)

const isARExperienceActive = computed(() => route.name === 'ar-experience')
const isOverlayPhotoCaptureActive = computed(() => route.name === 'overlay-photo-capture')

const appHeaderRef = ref(null)
const navContainerRef = ref(null)
const navbarCombinedHeight = ref(0)
const appHeaderActualHeight = ref(0)

const userDisplayName = computed(() => {
  if (user.value?.email) {
    const emailParts = user.value.email.split('@')
    const namePart = emailParts[0]
    return namePart.charAt(0).toUpperCase() + namePart.slice(1)
  }
  return 'Zolve'
})

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
  if (isPasswordRecoveryMode.value && route.name !== 'update-password') {
    return false
  }
  if (!isLoggedIn.value) {
    const publicRoutesWithNavbar = [
      'home',
      'login',
      'how-to',
      'store',
      'terms-conditions',
      'privacy-policy',
      'cookies-policy',
    ]
    return publicRoutesWithNavbar.includes(route.name)
  }
  if (isARExperienceActive.value) {
    if (!isMobileView.value) return true
    return !isLandscape.value
  }
  return !isPasswordRecoveryMode.value
})

const showFooter = computed(() => {
  return !isARExperienceActive.value && !isOverlayPhotoCaptureActive.value
})

const showZolveBot = computed(() => {
  return !isARExperienceActive.value && !isOverlayPhotoCaptureActive.value
})

// PARA RENOVAR SESIÓN Y CIERRE POR INACTIVIDAD
let lastActiveTime = Date.now()
const MAX_INACTIVE_TIME = 30 * 60 * 1000 // 30 minutos
let firstCheckDone = false

// Control de actividad del usuario para cerrar sesión por inactividad
const resetInactivityTimer = () => {
  lastActiveTime = Date.now()
}

// Escuchar eventos de actividad
window.addEventListener('mousemove', resetInactivityTimer)
window.addEventListener('keydown', resetInactivityTimer)
window.addEventListener('scroll', resetInactivityTimer)
window.addEventListener('click', resetInactivityTimer)

const handleVisibilityChange = async () => {
  if (document.visibilityState === 'visible') {
    const now = Date.now()
    const inactiveTime = now - lastActiveTime

    if (inactiveTime > MAX_INACTIVE_TIME) {
      console.log('⏰ Inactividad larga, intentando refrescar sesión...')

      try {
        // Renovar sesión antes de verificar
        const { data, error } = await supabase.auth.refreshSession()
        if (error) {
          console.warn('⚠️ Error refrescando sesión:', error.message)
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session && authStore.isLoggedIn) {
          if (firstCheckDone) {
            console.log('❌ Sesión expirada, cerrando sesión...')
            await authStore.signOut()
          } else {
            console.log('⚠️ Primera verificación sin sesión, esperando siguiente check')
          }
        } else if (session) {
          console.log('✅ Sesión válida tras refrescar')
        }
      } catch (e) {
        console.error('Error manejando visibilidad:', e)
      }

      firstCheckDone = true
    } else {
      console.log('✅ Pestaña visible, inactivo solo', Math.round(inactiveTime / 1000), 'segundos')
    }

    lastActiveTime = now
  } else if (document.visibilityState === 'hidden') {
    lastActiveTime = Date.now()
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
  if (isARExperienceActive.value || isOverlayPhotoCaptureActive.value) {
    const bodyEl = document.body
    const appRootEl = document.getElementById('app')
    const mainContentEl = document.querySelector('.main-content')
    bodyEl.classList.remove('ar-body-active', 'overlay-photo-body-active')
    if (appRootEl) appRootEl.classList.remove('ar-app-root-active', 'overlay-photo-app-root-active')
    Object.assign(bodyEl.style, {
      overflow: '',
      backgroundColor: '',
      margin: '',
      padding: '',
      height: '',
      width: '',
    })
    if (appRootEl) {
      Object.assign(appRootEl.style, {
        position: '',
        top: '',
        left: '',
        width: '',
        height: '',
        maxWidth: '',
        margin: '',
        padding: '',
        backgroundColor: '',
        overflow: '',
      })
    }
    if (mainContentEl) {
      Object.assign(mainContentEl.style, {
        padding: '',
        margin: '',
        height: '',
        width: '',
        overflow: '',
        position: '',
        top: '',
        left: '',
        zIndex: '',
      })
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
    if (isMobileMenuOpen.value) {
      closeMobileMenu()
    }
  },
)

const handleLogout = async () => {
  closeMobileMenu()
  try {
    await authStore.signOut()
    router.push({ name: 'home' })
  } catch (error) {
    window.location.assign('/')
  }
}

function cookieStatus(status) {
  // Tu lógica de cookies
}

function cookieRemoved() {
  // Tu lógica de cookies
}

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
      <div class="user-info" v-if="isLoggedIn && user">
        Hola <strong>{{ userDisplayName }}</strong>
      </div>
      <button v-if="isLoggedIn" @click="handleLogout" class="btn-logout-header">
        Cerrar Sesión
      </button>
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
        <router-link v-if="!isLoggedIn" :to="{ name: 'login' }" @click="closeMobileMenu">
          Login/Registro
        </router-link>
        <template v-if="isLoggedIn">
          <router-link
            v-if="userRole === 'admin'"
            :to="{ name: 'admin-dashboard' }"
            @click="closeMobileMenu"
          >
            Panel Admin
          </router-link>
          <router-link v-else :to="{ name: 'profile' }" @click="closeMobileMenu">
            Mi Perfil
          </router-link>
        </template>
      </nav>
    </div>

    <main class="main-content" :style="{ paddingTop: mainContentPaddingTop }">
      <RouterView />
    </main>

    <footer class="app-footer" v-if="showFooter">
      <div class="footer-content">
        <div class="social-icons">
          <!-- Tu contenido de footer -->
        </div>
      </div>
    </footer>

    <vue-cookie-accept-decline
      @status="cookieStatus"
      @removed="cookieRemoved"
      :position="'bottom'"
      :type="'floating'"
      :transitionName="'slideFromBottom'"
    >
      <template #message>
        Usamos cookies para mejorar tu experiencia.
        <router-link :to="{ name: 'cookies-policy' }" class="cookie-link">
          Más información
        </router-link>
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
:root {
  --app-header-actual-height: 57px; /* Fallback, JS lo actualiza. Ajusta este valor a tu altura de header por defecto real */
}
#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: var(--font-family-base);
  background-color: var(--color-background);
  color: var(--color-text);
}
#app-container.ar-mode-active,
#app-container.overlay-photo-mode-active {
  width: 100%;
  height: 100vh;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden;
  background-color: #000 !important;
}
#app-container.ar-mode-active .main-content.ar-main-content-active,
#app-container.overlay-photo-mode-active .main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  width: 100%;
  background-color: transparent;
}
#app-container.ar-mode-active .main-content.ar-main-content-active {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
}
#app-container.ar-mode-active .app-header,
#app-container.ar-mode-active .nav-container,
#app-container.overlay-photo-mode-active .app-header,
#app-container.overlay-photo-mode-active .nav-container {
  position: fixed;
  left: 0;
  width: 100%;
  box-sizing: border-box;
}
#app-container.ar-mode-active .app-header,
#app-container.overlay-photo-mode-active .app-header {
  top: 0;
  z-index: 1010;
  background-color: rgba(30, 30, 30, 0.85);
  border-bottom: 1px solid rgba(70, 70, 70, 0.5);
  color: #eee;
}
#app-container.ar-mode-active .app-header .user-info strong,
#app-container.overlay-photo-mode-active .app-header .user-info strong {
  color: #fff;
}
#app-container.ar-mode-active .hamburger-icon span,
#app-container.overlay-photo-mode-active .hamburger-icon span {
  background-color: #eee;
}
#app-container.ar-mode-active .nav-container,
#app-container.overlay-photo-mode-active .nav-container {
  top: var(--app-header-actual-height);
  z-index: 1005;
  background-color: rgba(40, 40, 40, 0.85);
  border-bottom: 1px solid rgba(70, 70, 70, 0.5);
}
#app-container.ar-mode-active .main-nav a,
#app-container.overlay-photo-mode-active .main-nav a {
  color: #ccc;
}
#app-container.ar-mode-active .main-nav a:hover,
#app-container.overlay-photo-mode-active .main-nav a:hover {
  color: #fff;
}
#app-container.ar-mode-active .main-nav a.router-link-exact-active,
#app-container.overlay-photo-mode-active .main-nav a.router-link-exact-active {
  color: #fff;
  border-bottom-color: #fff;
}
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 20px;
  background-color: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9em;
  flex-shrink: 0;
  height: var(--app-header-actual-height);
  box-sizing: border-box;
}
.logo-link-header {
  display: inline-block;
  vertical-align: middle;
}
.header-logo-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}
.user-info {
  color: var(--color-text);
  margin-left: auto;
  margin-right: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
.user-info strong {
  color: var(--color-heading);
  font-weight: var(--font-weight-medium);
}
.btn-logout-header {
  padding: 6px 14px;
  background-color: var(--vt-c-indigo);
  color: var(--vt-c-white);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  font-family: var(--font-family-base);
  font-weight: var(--font-weight-medium);
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}
.btn-logout-header:hover {
  background-color: var(--vt-c-black-soft);
}
.nav-container {
  background-color: var(--color-background-mute);
  border-bottom: 1px solid var(--color-border);
  padding: 0 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  min-height: 50px;
  box-sizing: border-box;
}
.mobile-menu-toggle {
  display: none;
  background: 0 0;
  border: none;
  cursor: pointer;
  padding: 15px;
  z-index: 1006;
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
  font-family: var(--font-family-base);
  font-weight: 700;
  padding: 8px 0;
  transition: color 0.2s ease;
  border-bottom: 2px solid transparent;
}
.main-nav a:hover {
  color: var(--color-link-hover);
}
.main-nav a.router-link-exact-active {
  color: var(--color-link-hover);
  border-bottom-color: var(--color-link);
}
.main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}
.app-footer {
  background-color: var(--color-background-mute);
  padding: 25px 20px;
  text-align: center;
  font-size: 0.85em;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}
.footer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  max-width: 800px;
  margin: 0 auto;
}
.social-icons {
  display: flex;
  gap: 20px;
}
.social-icons a {
  color: var(--color-text);
  font-size: 1.5em;
  transition: color 0.2s ease;
}
.social-icons a:hover {
  color: var(--brand-pink);
}
.copyright-text p {
  margin: 2px 0;
}
.footer-links {
  display: flex;
  gap: 10px 20px;
  flex-wrap: wrap;
  justify-content: center;
}
.footer-links a {
  color: var(--color-link);
  text-decoration: none;
  transition: color 0.2s ease;
}
.footer-links a:hover {
  color: var(--brand-pink);
  text-decoration: underline;
}

@media (max-width: 767px) {
  .app-header {
    height: var(--app-header-actual-height);
  }
  .user-info {
    display: none;
  }
  .btn-logout-header {
    margin-left: auto;
  }
  .nav-container {
    justify-content: flex-start;
  }
  #app-container.ar-mode-active .nav-container,
  #app-container.overlay-photo-mode-active .nav-container {
    top: var(--app-header-actual-height);
  }
  .mobile-menu-toggle {
    display: flex;
    margin-right: auto;
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
    padding: 0;
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  #app-container.ar-mode-active .main-nav.mobile-menu-active,
  #app-container.overlay-photo-mode-active .main-nav.mobile-menu-active {
    background-color: rgba(45, 45, 45, 0.98);
    border-color: rgba(70, 70, 70, 0.7);
  }
  .main-nav.mobile-menu-active {
    display: flex;
  }
  .main-nav a {
    margin: 0;
    padding: 15px 20px;
    width: 100%;
    box-sizing: border-box;
    border-bottom: 1px solid var(--color-border);
    text-align: left;
    font-weight: 700;
    color: var(--color-link);
  }
  .main-nav a:last-child {
    border-bottom: none;
  }
  .main-nav a.router-link-exact-active {
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-background-mute);
    color: var(--color-link-hover);
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
  .app-footer {
    padding: 20px 15px;
    font-size: 0.8em;
  }
  .footer-content {
    gap: 12px;
  }
  .social-icons {
    gap: 15px;
  }
  .social-icons a {
    font-size: 1.4em;
  }
  .footer-links {
    gap: 8px 15px;
  }
}
</style>
