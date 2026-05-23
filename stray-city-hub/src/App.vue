<template>
  <div id="app-root">
    <!-- Noise texture overlay -->
    <div class="noise-overlay"></div>

    <!-- Header -->
    <AppHeader />

    <!-- Hero Banner -->
    <section class="hero-section">
      <div class="hero-bg"></div>
      <div class="container hero-content">
        <p class="hero-kicker">MANIFESTANDO STRAY CITY EN CHILE Y LATAM</p>
        <h2 class="hero-title glow-text">
          STRAY CITY<br />
          <span class="hero-accent">CHILE</span>
        </h2>
        <p class="hero-subtitle">
          El muro de manifestación más poderoso del fandom.<br />
          Enciende tu vela. Deja tu mensaje. Chile va a temblar. 🔥
        </p>
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-number">{{ messages.length }}</span>
            <span class="stat-label">Mensajes</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">{{ candleCount }}</span>
            <span class="stat-label">Velas</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">3</span>
            <span class="stat-label">Países</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Sales Tracker -->
    <SalesTracker />

    <!-- Altar LATAM -->
    <AltarLatam />

    <!-- Manifestation Grid (Mural Chile) -->
    <ManifestationGrid
      :messages="messages"
      @open-modal="showModal = true"
    />

    <!-- Message Modal -->
    <MessageModal
      :show="showModal"
      @close="showModal = false"
      @submit="addMessage"
    />

    <!-- Footer -->
    <footer class="app-footer">
      <div class="container footer-inner">
        <p class="footer-text">
          ⚡ Stray City — Muro de Manifestación
        </p>
        <p class="footer-brand">
          Hecho por <a href="https://lacasadezolve.com" target="_blank" rel="noopener">La Casa de Zolve</a> con 🖤 para las STAYs de Chile
        </p>
        <p class="footer-disclaimer">
          Este es un proyecto de fan. No estamos afiliados a JYP Entertainment ni a Stray Kids.
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue'
import AppHeader from './components/AppHeader.vue'
import SalesTracker from './components/SalesTracker.vue'
import AltarLatam from './components/AltarLatam.vue'
import ManifestationGrid from './components/ManifestationGrid.vue'
import MessageModal from './components/MessageModal.vue'
import { useLocalStorage } from './composables/useLocalStorage.js'
import { mockMessages } from './data/mockData.js'

// State con localStorage como caché/fallback
const showModal = ref(false)
const messages = useLocalStorage('skz-mural-messages', [...mockMessages])
const candleCount = useLocalStorage('skz-candle-count', 0)
const saleEvents = ref(null) // null = usar datos estáticos del componente

// Compartir candleCount con AltarLatam
provide('candleCount', candleCount)
provide('saleEvents', saleEvents)

// Cargar datos desde la API al montar
onMounted(async () => {
  try {
    const res = await fetch('/api/status')
    if (res.ok) {
      const data = await res.json()
      if (data.messages?.length) messages.value = data.messages
      if (typeof data.candleCount === 'number') candleCount.value = data.candleCount
      if (data.events?.length) saleEvents.value = data.events
    }
  } catch (err) {
    console.warn('[App] API no disponible, usando localStorage:', err.message)
  }
})

// Agregar mensaje via API (optimistic update)
async function addMessage(msg) {
  // Optimistic: agregar al estado local de inmediato
  messages.value = [msg, ...messages.value]

  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: msg.author,
        message: msg.message,
        tag: msg.tag,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.warn('[App] Error al guardar mensaje:', err.error)
    }
  } catch (err) {
    console.warn('[App] API no disponible:', err.message)
  }
}
</script>

<style scoped>
/* ══════════════════════════════════════════
   HERO SECTION
   ══════════════════════════════════════════ */
.hero-section {
  position: relative;
  padding: var(--space-3xl) 0;
  min-height: 50vh;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(211, 0, 0, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 50%, rgba(211, 0, 0, 0.05) 0%, transparent 50%),
    linear-gradient(180deg, var(--bg-asphalt), #0a0a0a);
  z-index: -1;
}

.hero-bg::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(to top, var(--bg-asphalt), transparent);
}

.hero-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.hero-kicker {
  font-family: var(--font-grunge);
  font-size: 0.85rem;
  color: var(--accent-blood);
  text-transform: uppercase;
  letter-spacing: 0.3em;
  animation: fadeInUp 0.6s ease;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(3rem, 10vw, 7rem);
  line-height: 0.95;
  letter-spacing: 0.08em;
  color: var(--text-primary);
  animation: fadeInUp 0.6s 0.1s ease both;
}

.hero-accent {
  color: var(--accent-blood);
  display: block;
  font-size: 1.1em;
}

.hero-subtitle {
  font-family: var(--font-grunge);
  font-size: 1.05rem;
  color: var(--text-secondary);
  max-width: 500px;
  line-height: 1.6;
  animation: fadeInUp 0.6s 0.2s ease both;
}

/* Hero stats */
.hero-stats {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
  margin-top: var(--space-md);
  padding: var(--space-lg) var(--space-2xl);
  background: rgba(30, 30, 30, 0.6);
  border: 1px solid var(--border-dark);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(8px);
  animation: fadeInUp 0.6s 0.3s ease both;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-number {
  font-family: var(--font-display);
  font-size: 2rem;
  color: var(--accent-blood);
  line-height: 1;
}

.stat-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: var(--border-dark);
}

/* ══════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════ */
.app-footer {
  padding: var(--space-2xl) 0;
  border-top: 1px solid var(--border-dark);
  background: #0a0a0a;
}

.footer-inner {
  text-align: center;
}

.footer-text {
  font-family: var(--font-grunge);
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.footer-brand {
  font-family: var(--font-grunge);
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: var(--space-sm);
}

.footer-brand a {
  color: var(--accent-blood);
  font-weight: 600;
  transition: color var(--transition-fast);
}

.footer-brand a:hover {
  color: var(--accent-ember);
  text-decoration: underline;
}

.footer-disclaimer {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: var(--space-sm);
}

@media (max-width: 480px) {
  .hero-stats {
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
  }
}
</style>
