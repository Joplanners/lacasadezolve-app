<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/storeCart'
import { storeToRefs } from 'pinia'

const props = defineProps({
  showNavbar: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['logout', 'navbar-height-change'])

const authStore = useAuthStore()
const cartStore = useCartStore()
const route = useRoute()

const { isLoggedIn, userRole, userDisplayName } = storeToRefs(authStore)
const cartItemCount = computed(() => cartStore.cartItemCount)

// --- Mobile menu ---
const isMobileMenuOpen = ref(false)
const isMobileView = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false)

// --- Navbar height calculation ---
const navbarRef = ref(null)

const calculateNavbarHeight = () => {
  if (navbarRef.value && props.showNavbar) {
    const height = navbarRef.value.offsetHeight
    emit('navbar-height-change', height)
    document.documentElement.style.setProperty('--app-header-actual-height', `${height}px`)
  } else {
    emit('navbar-height-change', 0)
  }
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
  nextTick(calculateNavbarHeight)
}

function closeMobileMenu() {
  if (isMobileMenuOpen.value) {
    isMobileMenuOpen.value = false
    nextTick(calculateNavbarHeight)
  }
}

function handleResize() {
  isMobileView.value = window.innerWidth < 768
  nextTick(calculateNavbarHeight)
}

// Close menu on route change
watch(
  () => route.path,
  () => {
    if (isMobileMenuOpen.value) closeMobileMenu()
  },
)

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
  nextTick(calculateNavbarHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

function onLogout() {
  closeMobileMenu()
  emit('logout')
}
</script>

<template>
  <header v-if="showNavbar" ref="navbarRef" class="app-navbar">
    <!-- Left: Logo -->
    <div class="navbar-left">
      <RouterLink :to="{ name: 'home' }" class="logo-link" @click="closeMobileMenu">
        <img src="/LogoZolve.webp" alt="Logo Zolve" class="navbar-logo" />
      </RouterLink>
    </div>

    <!-- Center: Nav links (desktop) -->
    <nav class="navbar-center" :class="{ 'mobile-menu-active': isMobileMenuOpen }">
      <router-link :to="{ name: 'home' }" @click="closeMobileMenu">Inicio</router-link>
      <router-link :to="{ name: 'bts-chile' }" @click="closeMobileMenu">BTS Chile</router-link>
      <!-- AR routes comentadas temporalmente
      <router-link :to="{ name: 'how-to' }" @click="closeMobileMenu">Cómo Usar</router-link>
      <router-link :to="{ name: 'ar-demo' }" @click="closeMobileMenu">Demo AR</router-link>
      -->
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
        <!-- Logout visible solo en menú móvil -->
        <button class="mobile-logout-link" @click="onLogout">Cerrar Sesión</button>
      </template>
    </nav>

    <!-- Right: User actions -->
    <div class="navbar-right">
      <span class="user-greeting" v-if="isLoggedIn && !isMobileView">
        Hola <strong>{{ userDisplayName }}</strong>
      </span>

      <router-link to="/carrito" class="cart-widget" aria-label="Ver carrito de compras">
        <font-awesome-icon :icon="['fas', 'shopping-cart']" />
        <span v-if="cartItemCount > 0" class="cart-count">{{ cartItemCount }}</span>
      </router-link>

      <button v-if="isLoggedIn && !isMobileView" @click="onLogout" class="btn-logout">
        Cerrar Sesión
      </button>

      <!-- Hamburger (mobile) -->
      <button
        class="mobile-menu-toggle"
        @click="toggleMobileMenu"
        :aria-expanded="isMobileMenuOpen.toString()"
        aria-label="Toggle navigation"
      >
        <span class="hamburger-icon"><span></span><span></span><span></span></span>
      </button>
    </div>
  </header>
</template>

<style scoped>
/* ===== UNIFIED NAVBAR ===== */
.app-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background-color: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  box-sizing: border-box;
  width: 100%;
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

/* --- LEFT: Logo --- */
.navbar-left {
  flex-shrink: 0;
}
.logo-link {
  display: flex;
  align-items: center;
}
.navbar-logo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

/* --- CENTER: Nav links --- */
.navbar-center {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}
.navbar-center a {
  text-decoration: none;
  color: var(--color-link);
  font-weight: 700;
  padding: 8px 12px;
  border-bottom: 2px solid transparent;
  transition: color 0.2s ease, border-color 0.2s ease;
}
.navbar-center a:hover {
  color: var(--color-link-hover);
}
.navbar-center a.router-link-exact-active {
  color: var(--color-link-hover);
  border-bottom-color: var(--color-link);
}

/* Hide mobile-only logout in desktop */
.mobile-logout-link {
  display: none;
}

/* --- RIGHT: User actions --- */
.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.user-greeting {
  color: var(--color-text);
  font-size: 0.9rem;
  white-space: nowrap;
}
.user-greeting strong {
  color: var(--color-heading);
  font-weight: var(--font-weight-medium);
}

.cart-widget {
  position: relative;
  font-size: 1.4rem;
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
  width: 20px;
  height: 20px;
  font-size: 0.7rem;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px solid var(--color-background-soft);
}

.btn-logout {
  padding: 6px 14px;
  background-color: var(--vt-c-indigo);
  color: var(--vt-c-white);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: opacity 0.2s ease;
}
.btn-logout:hover {
  opacity: 0.85;
}

/* --- HAMBURGER (hidden on desktop) --- */
.mobile-menu-toggle {
  display: none;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
}
.hamburger-icon {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  width: 22px;
  height: 16px;
}
.hamburger-icon span {
  display: block;
  width: 100%;
  height: 2.5px;
  background-color: var(--color-heading);
  border-radius: 1px;
  transition: all 0.3s ease-in-out;
}

/* ===== RESPONSIVE MOBILE ===== */
@media (max-width: 767px) {
  .app-navbar {
    flex-wrap: wrap;
    padding: 8px 12px;
  }

  /* Logo stays left, actions stay right */
  .navbar-left {
    order: 1;
  }
  .navbar-right {
    order: 2;
    margin-left: auto;
    gap: 12px;
  }

  /* Hide desktop-only elements */
  .user-greeting {
    display: none;
  }
  .btn-logout {
    display: none;
  }

  /* Hamburger visible */
  .mobile-menu-toggle {
    display: flex;
  }

  /* Nav becomes dropdown */
  .navbar-center {
    display: none;
    order: 3;
    flex-basis: 100%;
    flex-direction: column;
    background-color: var(--color-background-soft);
    border-top: 1px solid var(--color-border);
    margin-top: 8px;
    padding: 0;
  }
  .navbar-center.mobile-menu-active {
    display: flex;
  }
  .navbar-center a {
    padding: 14px 16px;
    border-bottom: 1px solid var(--color-border);
    margin: 0;
  }
  .navbar-center a:last-child {
    border-bottom: none;
  }
  .navbar-center a.router-link-exact-active {
    background-color: var(--color-background-mute);
    border-bottom: 1px solid var(--color-border);
  }

  /* Show mobile logout link in menu */
  .mobile-logout-link {
    display: block;
    width: 100%;
    padding: 14px 16px;
    background: none;
    border: none;
    border-top: 1px solid var(--color-border);
    color: var(--brand-pink);
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    text-align: left;
  }
  .mobile-logout-link:hover {
    background-color: var(--color-background-mute);
  }

  /* Hamburger animation */
  .mobile-menu-toggle[aria-expanded='true'] .hamburger-icon span:nth-child(1) {
    transform: translateY(6.5px) rotate(45deg);
  }
  .mobile-menu-toggle[aria-expanded='true'] .hamburger-icon span:nth-child(2) {
    opacity: 0;
  }
  .mobile-menu-toggle[aria-expanded='true'] .hamburger-icon span:nth-child(3) {
    transform: translateY(-6.5px) rotate(-45deg);
  }
}
</style>
