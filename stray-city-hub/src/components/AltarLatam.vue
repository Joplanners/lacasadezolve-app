<template>
  <section id="altar" class="section altar-section">
    <div class="container altar-container">
      <h2 class="section-title">🕯️ Altar LATAM</h2>
      <p class="altar-desc">Enciende una vela virtual y manifiesta la llegada de SKZ a Chile</p>

      <div class="altar-stage">
        <!-- Candle visual -->
        <div class="candle-wrapper" ref="candleRef">
          <div class="candle-body">
            <div class="candle-flame" :class="{ lit: isLit }">
              <div class="flame-inner"></div>
              <div class="flame-outer"></div>
            </div>
            <div class="candle-wax"></div>
            <div class="candle-stick"></div>
          </div>
          <div class="candle-glow" :class="{ active: isLit }"></div>
        </div>

        <!-- Ignite button -->
        <button class="ignite-btn" @click="lightCandle" :class="{ pulsing: !isLit }">
          <span class="btn-icon">🔥</span>
          <span class="btn-text">Encender una vela</span>
        </button>

        <!-- Counter -->
        <div class="candle-counter">
          <span class="counter-number glow-text" ref="counterRef">{{ candleCount }}</span>
          <span class="counter-label">velas encendidas</span>
        </div>

        <!-- Sparkle particles (generated on click) -->
        <div class="sparkles" ref="sparklesRef">
          <span
            v-for="spark in sparkles"
            :key="spark.id"
            class="spark"
            :style="spark.style"
          ></span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import gsap from 'gsap'

// Recibir candleCount del padre (App.vue) via provide/inject
const candleCount = inject('candleCount')
const isLit = ref(false)
const sparkles = ref([])
const candleRef = ref(null)
const counterRef = ref(null)

let sparkId = 0

async function lightCandle() {
  isLit.value = true
  // Optimistic update inmediato
  candleCount.value++

  // Counter punch animation
  if (counterRef.value) {
    gsap.fromTo(
      counterRef.value,
      { scale: 1.6, color: '#ff1a1a' },
      { scale: 1, color: '#f0f0f0', duration: 0.5, ease: 'elastic.out(1, 0.4)' },
    )
  }

  // Candle shake
  if (candleRef.value) {
    gsap.fromTo(
      candleRef.value,
      { rotation: -3 },
      { rotation: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' },
    )
  }

  // Sparkles
  createSparkles()

  // Llamar a la API para persistir
  try {
    const res = await fetch('/api/candle', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      // Sincronizar con el valor real de la DB
      if (typeof data.count === 'number') candleCount.value = data.count
    }
  } catch (err) {
    console.warn('[Altar] API no disponible:', err.message)
  }

  // Apagar llama después de 2.5s
  setTimeout(() => {
    isLit.value = false
  }, 2500)
}

function createSparkles() {
  const newSparks = []
  for (let i = 0; i < 8; i++) {
    newSparks.push({
      id: sparkId++,
      style: {
        '--x': `${(Math.random() - 0.5) * 120}px`,
        '--y': `${-Math.random() * 100 - 30}px`,
        '--delay': `${Math.random() * 0.3}s`,
        '--size': `${Math.random() * 4 + 2}px`,
      },
    })
  }
  sparkles.value = newSparks
  setTimeout(() => {
    sparkles.value = []
  }, 1000)
}

onMounted(() => {
  if (candleRef.value) {
    gsap.from(candleRef.value, {
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
    })
  }
})
</script>

<style scoped>
.altar-section {
  background: linear-gradient(180deg, var(--bg-asphalt), #0d0d0d);
  position: relative;
  overflow: hidden;
}

.altar-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(211, 0, 0, 0.05) 0%, transparent 70%);
  pointer-events: none;
}

.altar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.altar-desc {
  font-family: var(--font-grunge);
  color: var(--text-muted);
  margin-top: -0.8rem;
  margin-bottom: var(--space-2xl);
  font-size: 0.95rem;
}

/* Stage */
.altar-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xl);
  position: relative;
}

/* Candle */
.candle-wrapper {
  position: relative;
  width: 100px;
  height: 180px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.candle-body {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.candle-stick {
  width: 36px;
  height: 80px;
  background: linear-gradient(180deg, #e8d5b7, #c4a882);
  border-radius: 4px 4px 6px 6px;
  position: relative;
  box-shadow: inset -4px 0 8px rgba(0, 0, 0, 0.2);
}

.candle-wax {
  width: 42px;
  height: 10px;
  background: linear-gradient(180deg, #f0e0c8, #e8d5b7);
  border-radius: 50%;
  margin-bottom: -4px;
  z-index: 1;
}

/* Flame */
.candle-flame {
  position: relative;
  width: 20px;
  height: 36px;
  margin-bottom: -2px;
  z-index: 2;
  opacity: 0;
  transform: scale(0);
  transition: all 0.4s ease;
}

.candle-flame.lit {
  opacity: 1;
  transform: scale(1);
}

.flame-inner {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 22px;
  background: #fff8e1;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  animation: flicker 0.3s infinite alternate;
}

.flame-outer {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 34px;
  background: radial-gradient(ellipse, rgba(255, 120, 0, 0.8), rgba(211, 0, 0, 0.6), transparent);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  filter: blur(2px);
  animation: flicker 0.5s infinite alternate-reverse;
}

/* Glow */
.candle-glow {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(255, 100, 0, 0.15) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.5s ease;
  pointer-events: none;
}

.candle-glow.active {
  opacity: 1;
}

/* Button */
.ignite-btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-xl);
  background: linear-gradient(135deg, var(--accent-blood), #a00000);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}

.ignite-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.ignite-btn:hover::before {
  transform: translateX(100%);
}

.ignite-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 30px rgba(211, 0, 0, 0.4);
}

.ignite-btn:active {
  transform: scale(0.97);
}

.ignite-btn.pulsing {
  animation: pulse-red 2s infinite;
}

.btn-icon {
  font-size: 1.3rem;
}

/* Counter */
.candle-counter {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.counter-number {
  font-family: var(--font-display);
  font-size: 3.5rem;
  color: var(--text-primary);
  line-height: 1;
}

.counter-label {
  font-family: var(--font-grunge);
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

/* Sparkles */
.sparkles {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
}

.spark {
  position: absolute;
  width: var(--size);
  height: var(--size);
  background: var(--accent-ember);
  border-radius: 50%;
  animation: sparkle 0.8s var(--delay) ease-out forwards;
}

@keyframes sparkle {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(var(--x), var(--y)) scale(0);
  }
}
</style>
