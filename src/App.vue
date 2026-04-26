<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { storeToRefs } from 'pinia'

import ZolveBotChat from './components/ZolveBotChat.vue'
import AppFooter from './components/AppFooter.vue'
import AppNavbar from './components/AppNavbar.vue'
import { supabase } from '@/lib/supabaseClient'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const { isLoggedIn, isPasswordRecoveryMode } = storeToRefs(authStore)

// --- Layout visibility ---
const isMobileView = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
const isLandscape = ref(false)

const isARExperienceActive = computed(() =>
  ['ar-experience', 'ar-experience-demo'].includes(route.name),
)
const isOverlayPhotoCaptureActive = computed(() => route.name === 'overlay-photo-capture')

const showNavbar = computed(() => {
  if (route.meta.blankLayout) return false
  if (isPasswordRecoveryMode.value && route.name !== 'update-password') return false
  const publicRoutesWithNavbar = [
    'home',
    'login',
    // 'how-to',   // AR - comentado temporalmente
    // 'ar-demo',  // AR - comentado temporalmente
    'store',
    'bts-chile',
    'terms-conditions',
    'privacy-policy',
    'cookies-policy',
    'product-detail',
    'cart',
  ]
  if (!isLoggedIn.value) return publicRoutesWithNavbar.includes(route.name)
  if (isARExperienceActive.value) return !isMobileView.value || !isLandscape.value
  return !isPasswordRecoveryMode.value
})

const showFooter = computed(() => {
  if (route.meta.blankLayout) return false
  return !isARExperienceActive.value && !isOverlayPhotoCaptureActive.value
})

const showZolveBot = computed(() => {
  if (route.meta.blankLayout) return false
  return !isARExperienceActive.value && !isOverlayPhotoCaptureActive.value
})

// --- Session inactivity ---
let lastActiveTime = Date.now()
const MAX_INACTIVE_TIME = 30 * 60 * 1000

const resetInactivityTimer = () => {
  lastActiveTime = Date.now()
}

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

// --- Resize / orientation ---
function handleResizeAndOrientation() {
  isMobileView.value = window.innerWidth < 768
  if (screen.orientation && typeof screen.orientation.type !== 'undefined') {
    isLandscape.value = screen.orientation.type.startsWith('landscape')
  } else {
    isLandscape.value = window.matchMedia('(orientation: landscape)').matches
  }
}

// --- Navbar height for special views ---
const navbarHeight = ref(0)
function onNavbarHeightChange(height) {
  navbarHeight.value = height
}

const mainContentPaddingTop = computed(() => {
  if (isOverlayPhotoCaptureActive.value || (isARExperienceActive.value && showNavbar.value)) {
    return `${navbarHeight.value}px`
  }
  return ''
})

// --- Lifecycle ---
onMounted(() => {
  handleResizeAndOrientation()
  window.addEventListener('resize', handleResizeAndOrientation)
  window.addEventListener('mousemove', resetInactivityTimer)
  window.addEventListener('keydown', resetInactivityTimer)
  window.addEventListener('scroll', resetInactivityTimer)
  window.addEventListener('click', resetInactivityTimer)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  if (screen.orientation) {
    screen.orientation.addEventListener('change', handleResizeAndOrientation)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResizeAndOrientation)
  window.removeEventListener('mousemove', resetInactivityTimer)
  window.removeEventListener('keydown', resetInactivityTimer)
  window.removeEventListener('scroll', resetInactivityTimer)
  window.removeEventListener('click', resetInactivityTimer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (screen.orientation) {
    screen.orientation.removeEventListener('change', handleResizeAndOrientation)
  }
})

// --- Handlers ---
const handleLogout = async () => {
  await authStore.signOut()
  router.push({ name: 'home' })
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
    <AppNavbar
      :showNavbar="showNavbar"
      @logout="handleLogout"
      @navbar-height-change="onNavbarHeightChange"
    />

    <main class="main-content" :style="{ paddingTop: mainContentPaddingTop }">
      <RouterView :key="$route.fullPath" />
    </main>

    <AppFooter v-if="showFooter" />


    <ZolveBotChat v-if="showZolveBot" />
  </div>
</template>



<style scoped>
#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: var(--font-family-base);
  background-color: var(--color-background);
  color: var(--color-text);
}

.main-content {
  flex-grow: 1;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  box-sizing: border-box;
}

@media (max-width: 767px) {
  .main-content {
    padding: 2rem 15px;
  }
}

/* AR mode overrides */
.ar-mode-active {
  background-color: transparent !important;
}
.ar-mode-active .main-content {
  padding: 0 !important;
  max-width: none !important;
}
body:has(.ar-mode-active),
html:has(body .ar-mode-active) {
  background-color: transparent !important;
}
</style>
