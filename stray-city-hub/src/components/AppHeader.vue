<template>
  <header class="app-header">
    <div class="header-scanline"></div>
    <div class="container header-inner">
      <!-- Logo / Title -->
      <div class="header-brand">
        <span class="brand-icon">⚡</span>
        <div>
          <h1 class="brand-title glow-text">Stray City</h1>
          <p class="brand-subtitle">Muro de Manifestación</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="header-nav" :class="{ open: menuOpen }">
        <a href="#sales" class="nav-link" @click="closeMenu">
          <span class="nav-icon">📡</span> Ventas
        </a>
        <a href="#altar" class="nav-link" @click="closeMenu">
          <span class="nav-icon">🕯️</span> Altar
        </a>
        <a href="#mural" class="nav-link" @click="closeMenu">
          <span class="nav-icon">📌</span> Mural
        </a>
      </nav>

      <!-- Hamburger (mobile) -->
      <button
        class="hamburger"
        :class="{ active: menuOpen }"
        @click="menuOpen = !menuOpen"
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'

const menuOpen = ref(false)

function closeMenu() {
  menuOpen.value = false
}
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(18, 18, 18, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-dark);
}

.header-scanline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent-blood), transparent);
  animation: flicker 3s infinite;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
}

/* Brand */
.header-brand {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.brand-icon {
  font-size: 1.8rem;
  animation: float 3s ease-in-out infinite;
}

.brand-title {
  font-family: var(--font-display);
  font-size: 1.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-blood);
  line-height: 1;
}

.brand-subtitle {
  font-family: var(--font-grunge);
  font-size: 0.75rem;
  color: var(--text-secondary);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

/* Nav */
.header-nav {
  display: flex;
  gap: var(--space-lg);
}

.nav-link {
  font-family: var(--font-body);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-link:hover {
  color: var(--accent-blood);
  background: rgba(211, 0, 0, 0.08);
}

.nav-icon {
  font-size: 1rem;
}

/* Hamburger */
.hamburger {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  padding: 6px;
  z-index: 110;
}

.hamburger span {
  display: block;
  width: 24px;
  height: 2px;
  background: var(--text-primary);
  border-radius: 2px;
  transition: all var(--transition-base);
}

.hamburger.active span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}
.hamburger.active span:nth-child(2) {
  opacity: 0;
}
.hamburger.active span:nth-child(3) {
  transform: rotate(-45deg) translate(5px, -5px);
}

@media (max-width: 768px) {
  .hamburger {
    display: flex;
  }

  .header-nav {
    position: fixed;
    top: 0;
    right: 0;
    width: 260px;
    height: 100vh;
    background: rgba(18, 18, 18, 0.98);
    backdrop-filter: blur(20px);
    flex-direction: column;
    padding: 100px var(--space-xl) var(--space-xl);
    gap: var(--space-md);
    transform: translateX(100%);
    transition: transform var(--transition-slow);
    border-left: 1px solid var(--border-dark);
  }

  .header-nav.open {
    transform: translateX(0);
  }

  .nav-link {
    font-size: 1rem;
    padding: var(--space-sm) var(--space-md);
  }
}
</style>
