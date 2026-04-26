<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import StackSection from '@/components/StackSection.vue'
import { btsChileCards } from '@/data/btsChileCards'
import { useScrollStacking } from '@/composables/useScrollStacking'

const { initStacking, initFadeInBlocks, initHeroAnimation, destroyStacking } = useScrollStacking()

// Refs
const heroRef = ref(null)
const stackSections = ref([])
const contestRef = ref(null)

// Z-index por sección (cada una cubre la anterior)
const zIndexMap = { entradas: 2, planners: 3, polera: 4, poleron: 5 }

function setSectionRef(el, index) {
  if (el) stackSections.value[index] = el
}

onMounted(async () => {
  if (typeof window === 'undefined') return
  await nextTick()

  // Auto-scroll al hero para que el navbar quede arriba fuera de vista
  if (heroRef.value) {
    heroRef.value.scrollIntoView({ behavior: 'instant' })
  }

  // Hero: logo bounce + text fade
  initHeroAnimation(heroRef.value)

  // Stacking: product sections
  initStacking(stackSections.value)

  // Contest: simple fade-in
  if (contestRef.value) {
    const blocks = contestRef.value.querySelectorAll('.contest-block')
    initFadeInBlocks(Array.from(blocks))
  }
})

onUnmounted(() => destroyStacking())
</script>

<template>
  <div class="bts-page">
    <!-- ===== HERO ===== -->
    <section ref="heroRef" class="hero-section">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <div class="hero-top">
          <div class="hero-logo">
            <img src="/images/bts/ZolveBTS.png" alt="Zolve BTS" class="hero-logo-img" />
          </div>
          <div class="hero-text-block">
            <h2 class="hero-title">BTS ARIRANG TOUR 2026</h2>
            <h1 class="hero-text">
              <span class="hero-line hero-line--glow" data-typewriter>Después de 9 años...</span>
              <span class="hero-line hero-line--glow" data-typewriter>Este octubre, el momento que esperabas llegó.</span>
              <span class="hero-line hero-line--cta hero-shimmer" data-typewriter>¡Vívelo en La Casa de Zolve!</span>
            </h1>
          </div>
        </div>
        <div class="hero-scroll-hint">
          <span>↓</span>
        </div>
      </div>
    </section>

    <!-- ===== STACKING PRODUCT SECTIONS ===== -->
    <StackSection
      v-for="(card, index) in btsChileCards"
      :key="card.id"
      :ref="(el) => setSectionRef(el?.$el || el, index)"
      :title="card.title"
      :bg-image="card.bgImage"
      :layout="card.layout"
      :items="card.items"
      :z-index="zIndexMap[card.id] || 1"
    />

    <!-- ===== CONCURSO ===== -->
    <section ref="contestRef" class="contest-section">
      <div class="contest-inner">
        <h2 class="contest-block">🎉 Concurso: El Gran Premio Especial</h2>

        <div class="contest-block contest-banner">
          <img
            src="/images/bts/concert-bg.png"
            alt="Banner concurso BTS"
            class="contest-banner-img"
          />
        </div>

        <div class="contest-block contest-info">
          <h3>🏆 El Gran Premio</h3>
          <p style="margin-bottom: 1.5rem; color: #e2c0e8;">Un solo ganador se llevará el Pack Definitivo:</p>
          <ul style="margin-bottom: 2rem;">
            <li><strong>1 Planner Diario BTS:</strong> Portadas Personalizables.</li>
            <li><strong>1 Polera Temática:</strong> Diseño conmemorativo.</li>
            <li><strong>1 Regalo Sorpresa:</strong> ¡Exclusivo de de parte de Zolve!</li>
          </ul>

          <h3>🌟 ¿Cómo participar?</h3>
          <ol>
            <li><strong>Paso 1:</strong> Síguenos en Instagram en <a href="https://instagram.com/zolve_fox" target="_blank" style="color: #c8a2d4;">@zolve_fox</a>.</li>
            <li><strong>Paso 2:</strong> Dale "Me gusta" a nuestra publicación del concurso.</li>
            <li><strong>Paso 3:</strong> Comparte la publicación en tus historias etiquetándonos (¡tu perfil debe estar público para que podamos verlo!).</li>
            <li><strong>🎁 Multiplica tu suerte (Opcional):</strong> Cada vez que realices una compra en nuestra web, ingresa tu usuario de Instagram al pagar. ¡Cada compra suma opciones adicionales automáticas a tu nombre!</li>
          </ol>
        </div>

        <div class="contest-block contest-conditions" style="margin-bottom: 4rem;">
          <h3>📜 Condiciones Oficiales</h3>
          <ul>
            <li>El sorteo se realizará en vivo el <strong>30 de Septiembre de 2026</strong>.</li>
            <li>El costo de envío del Gran Premio corre por cuenta de la persona ganadora (por pagar).</li>
            <li>Sorteo válido únicamente para residentes dentro del territorio nacional (Chile).</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Google Fonts — import programmatically */
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');

/* ===== PAGE BASE ===== */
.bts-page {
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  overflow-x: hidden;
  background-color: #1a0a2e;
  color: #f0f0f0;
}

/* ===== HERO ===== */
.hero-section {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1a0a2e 0%, #4a1a54 40%, #7b2d8e 70%, #c8a2d4 100%);
  background-image: url('/images/bts/hero-bg.png');
  background-size: cover;
  background-position: center;
  z-index: 0;
}
.hero-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(26, 10, 46, 0.5);
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: 0 40px;
  max-width: 1100px;
  width: 100%;
}

.hero-top {
  display: flex;
  align-items: center;
  gap: 3rem;
}

.hero-logo {
  flex-shrink: 0;
}
.hero-logo-img {
  width: 220px;
  height: auto;
  filter: drop-shadow(0 0 25px rgba(123, 45, 142, 0.6));
  transform: scale(0);
  opacity: 0;
}

.hero-text-block {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hero-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 3.5rem;
  letter-spacing: 0.15em;
  color: #c8a2d4;
  text-shadow: 0 0 30px rgba(123, 45, 142, 0.6);
  opacity: 0;
  transform: translateY(20px);
  margin: 0;
}

.hero-text {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  font-family: 'Playfair Display', serif;
  font-size: 1.8rem;
  font-weight: 700;
  font-style: italic;
  line-height: 1.4;
  text-align: left;
  margin: 0;
}

.hero-line {
  display: block;
  opacity: 0;
}

/* Glow border effect on emotional lines */
.hero-line--glow {
  color: #ffffff;
  text-shadow:
    0 2px 4px rgba(0, 0, 0, 0.6),
    0 0 20px rgba(200, 162, 212, 0.5),
    0 0 40px rgba(123, 45, 142, 0.3);
}

/* CTA line in Bebas Neue */
.hero-line--cta {
  font-family: 'Bebas Neue', sans-serif;
  font-style: normal;
  font-size: 2.5rem;
  letter-spacing: 0.08em;
  margin-top: 0.5rem;
}

/* Typewriter cursor */
.hero-line .typewriter-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: #c8a2d4;
  margin-left: 2px;
  animation: blink 0.7s infinite;
  vertical-align: text-bottom;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Shimmer effect */
.hero-shimmer {
  background: linear-gradient(
    90deg,
    #f0f0f0 0%,
    #f0f0f0 40%,
    #c8a2d4 50%,
    #f0f0f0 60%,
    #f0f0f0 100%
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-position: 0% center;
}

.hero-scroll-hint {
  margin-top: 3rem;
  text-align: center;
  animation: float 2s ease-in-out infinite;
  font-size: 1.5rem;
  opacity: 0.6;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(10px); }
}

/* ===== CONTEST ===== */
.contest-section {
  position: relative;
  z-index: 6;
  background: linear-gradient(180deg, #2d1445 0%, #4a1a54 40%, #7b2d8e 100%);
  padding: 80px 0;
  width: 100%;
}

.contest-inner {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
}

.contest-block {
  margin-bottom: 2.5rem;
}

.contest-section h2 {
  font-size: 2.2rem;
  text-align: center;
  color: #f0f0f0;
  text-shadow: 0 2px 15px rgba(123, 45, 142, 0.4);
}

.contest-banner-img {
  width: 100%;
  border-radius: 12px;
  max-height: 300px;
  object-fit: cover;
}

.contest-info,
.contest-conditions {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px 28px;
}
.contest-info h3,
.contest-conditions h3 {
  color: #c8a2d4;
  font-size: 1.3rem;
  margin-bottom: 1rem;
}
.contest-info ol,
.contest-conditions ul {
  padding-left: 1.5rem;
  line-height: 2;
  color: #d0d0d0;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 767px) {
  .hero-top {
    flex-direction: column;
    text-align: center;
  }
  .hero-title {
    font-size: 2.2rem;
    text-align: center;
  }
  .hero-text {
    font-size: 1.3rem;
    text-align: center;
  }
  .hero-logo-img {
    width: 150px;
  }
  .contest-section {
    padding: 50px 0;
  }
}
</style>
