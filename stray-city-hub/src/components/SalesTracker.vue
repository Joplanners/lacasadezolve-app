<template>
  <section id="sales" class="section sales-section">
    <div class="container">
      <h2 class="section-title">
        📡 Monitor de Ventas LATAM
      </h2>
      <p class="sales-subtitle">Estado en tiempo real de las fechas de venta en Latinoamérica</p>

      <div class="sales-grid">
        <div
          v-for="event in activeEvents"
          :key="event.id"
          class="sale-card card torn-edge"
        >
          <div class="tape"></div>

          <!-- Status light -->
          <div class="status-light-wrapper">
            <div class="status-light" :class="event.status"></div>
            <span class="status-label">{{ statusLabel(event.status) }}</span>
          </div>

          <!-- Country -->
          <div class="sale-country">
            <span class="country-flag">{{ event.flag }}</span>
            <div>
              <h3 class="country-name">{{ event.country }}</h3>
              <p class="country-city">{{ event.city }}</p>
            </div>
          </div>

          <!-- Date -->
          <div class="sale-date">
            <span class="date-icon">📅</span>
            <span class="date-text">{{ event.date }}</span>
          </div>

          <!-- Venue -->
          <div class="sale-venue">
            <span class="venue-icon">🏟️</span>
            <span class="venue-text">{{ event.venue }}</span>
          </div>

          <!-- Status detail from Gemini AI -->
          <p v-if="event.status_detail || event.statusDetail" class="ai-detail">
            💬 {{ event.status_detail || event.statusDetail }}
          </p>

          <!-- Status bar -->
          <div class="status-bar-track">
            <div class="status-bar-fill" :class="event.status" :style="{ width: barWidth(event) }">
              <span class="bar-label">{{ barText(event) }}</span>
            </div>
          </div>

          <!-- Countdown -->
          <div class="countdown-badge" :class="event.status">
            <span class="countdown-number">{{ getDaysLeft(event) }}</span>
            <span class="countdown-label">días</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, inject } from 'vue'
import { saleEvents as fallbackEvents } from '../data/mockData.js'

// Datos dinámicos de Supabase (inyectados por App.vue)
const apiEvents = inject('saleEvents')

// Usar datos de la API si están disponibles, sino fallback
const activeEvents = computed(() => {
  if (apiEvents.value && apiEvents.value.length) {
    return apiEvents.value.map((ev) => ({
      ...ev,
      flag: ev.country?.match(/[\u{1F1E0}-\u{1F1FF}]{2}/u)?.[0] || '',
      date: formatSaleDate(ev.sale_date),
    }))
  }
  return fallbackEvents
})

function formatSaleDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getDaysLeft(event) {
  const saleDate = event.sale_date || null
  if (!saleDate) return event.daysLeft || '?'
  const now = new Date()
  const target = new Date(saleDate + 'T12:00:00')
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

function statusLabel(status) {
  const map = { upcoming: 'Próximamente', on_sale: '🎫 EN VENTA', hot: '🔥 HOT', sold_out: 'AGOTADO' }
  return map[status] || status
}

function barWidth(event) {
  const map = { upcoming: '35%', on_sale: '55%', hot: '70%', sold_out: '100%' }
  return map[event.status] || '0%'
}

function barText(event) {
  const map = { upcoming: 'Preventa pronto', on_sale: 'En venta', hot: 'Alta demanda', sold_out: 'SOLD OUT' }
  return map[event.status] || ''
}
</script>

<style scoped>
.sales-section {
  position: relative;
}

.sales-subtitle {
  font-family: var(--font-grunge);
  color: var(--text-muted);
  margin-top: -0.8rem;
  margin-bottom: var(--space-2xl);
  font-size: 0.95rem;
}

.sales-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-xl);
}

/* Card */
.sale-card {
  position: relative;
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  border: 1px solid var(--border-grunge);
  background: linear-gradient(145deg, var(--bg-carbon) 0%, #1a1a1a 100%);
}

.sale-card:hover {
  border-color: var(--accent-blood);
}

/* Status light (semáforo) */
.status-light-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.status-light {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: relative;
}

.status-light.upcoming {
  background: #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
}

.status-light.on_sale {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
  animation: pulse-red 1.5s infinite;
}

.status-light.hot {
  background: var(--accent-blood);
  box-shadow: 0 0 8px rgba(211, 0, 0, 0.5);
  animation: pulse-red 1.5s infinite;
}

.status-light.sold_out {
  background: var(--text-muted);
}

.status-label {
  font-family: var(--font-grunge);
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* AI detail from Gemini */
.ai-detail {
  font-family: var(--font-grunge);
  font-size: 0.8rem;
  color: var(--accent-ember);
  padding: 6px 10px;
  background: rgba(211, 0, 0, 0.08);
  border-left: 3px solid var(--accent-blood);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

/* Country */
.sale-country {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.country-flag {
  font-size: 2.4rem;
}

.country-name {
  font-family: var(--font-display);
  font-size: 1.6rem;
  letter-spacing: 0.05em;
  color: var(--text-primary);
}

.country-city {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Date & Venue */
.sale-date,
.sale-venue {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.date-icon,
.venue-icon {
  font-size: 1.1rem;
}

.date-text,
.venue-text {
  font-weight: 500;
}

/* Status bar */
.status-bar-track {
  width: 100%;
  height: 28px;
  background: var(--bg-asphalt);
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border-dark);
}

.status-bar-fill {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: width 1s ease;
  position: relative;
}

.status-bar-fill.upcoming {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.status-bar-fill.hot {
  background: linear-gradient(90deg, var(--accent-blood), var(--accent-ember));
  animation: flicker 2s infinite;
}

.status-bar-fill.sold {
  background: var(--text-muted);
}

.bar-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: white;
  white-space: nowrap;
}

/* Countdown badge */
.countdown-badge {
  display: flex;
  align-items: baseline;
  gap: 4px;
  align-self: flex-end;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  background: rgba(211, 0, 0, 0.1);
  border: 1px solid rgba(211, 0, 0, 0.2);
}

.countdown-badge.upcoming {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.2);
}

.countdown-number {
  font-family: var(--font-display);
  font-size: 1.8rem;
  color: var(--accent-blood);
  line-height: 1;
}

.countdown-badge.upcoming .countdown-number {
  color: #f59e0b;
}

.countdown-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

@media (max-width: 768px) {
  .sales-grid {
    grid-template-columns: 1fr;
  }
}
</style>
