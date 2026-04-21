<script setup>
/**
 * StackSection — Sección reutilizable con fondo de imagen + overlay + cards de producto.
 * Soporta layout 'dual' (2 side by side) y 'single' (1 centrada).
 * Soporta flip on hover cuando el item tiene backImage.
 * Diseñada para usarse con useScrollStacking para el efecto de stacking.
 */
defineProps({
  title: { type: String, required: true },
  bgImage: { type: String, required: true },
  layout: { type: String, default: 'single', validator: (v) => ['single', 'dual'].includes(v) },
  items: { type: Array, required: true },
  zIndex: { type: Number, default: 1 },
})
</script>

<template>
  <section
    class="stack-section"
    :style="{ backgroundImage: `url(${bgImage})`, zIndex }"
  >
    <div class="stack-overlay"></div>
    <div class="stack-content">
      <h2 class="stack-title">{{ title }}</h2>

      <!-- Dual: 2 cards side by side -->
      <div v-if="layout === 'dual'" class="stack-grid stack-grid--dual">
        <router-link
          v-for="item in items"
          :key="item.name"
          :to="item.link"
          class="product-card"
        >
          <div
            class="product-card__image"
            :class="{ 'product-card__image--flippable': item.backImage }"
          >
            <img :src="item.image" :alt="item.name" loading="lazy" class="product-card__front" />
            <img
              v-if="item.backImage"
              :src="item.backImage"
              :alt="item.name + ' (reverso)'"
              loading="lazy"
              class="product-card__back"
            />
            <div v-if="item.comingSoon" class="coming-soon-overlay">
              <span class="coming-soon-text">Próximamente</span>
            </div>
          </div>
          <span class="product-card__name">{{ item.name }}</span>
          <span v-if="item.backImage" class="product-card__flip-hint">🔄 Dale vuelta</span>
        </router-link>
      </div>

      <!-- Single: 1 card centered -->
      <div v-else class="stack-grid stack-grid--single">
        <router-link :to="items[0].link" class="product-card product-card--large">
          <div
            class="product-card__image"
            :class="{ 'product-card__image--flippable': items[0].backImage }"
          >
            <img :src="items[0].image" :alt="items[0].name" loading="lazy" class="product-card__front" />
            <img
              v-if="items[0].backImage"
              :src="items[0].backImage"
              :alt="items[0].name + ' (reverso)'"
              loading="lazy"
              class="product-card__back"
            />
            <div v-if="items[0].comingSoon" class="coming-soon-overlay">
              <span class="coming-soon-text">Próximamente</span>
            </div>
          </div>
          <span class="product-card__name">{{ items[0].name }}</span>
          <span v-if="items[0].backImage" class="product-card__flip-hint">🔄 Dale vuelta</span>
        </router-link>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stack-section {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
}

.stack-overlay {
  position: absolute;
  inset: 0;
  background: rgba(26, 10, 46, 0.65);
  z-index: 0;
}

.stack-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 60px 24px;
  width: 100%;
  max-width: 900px;
}

.stack-title {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 2.5rem;
  color: #f0f0f0;
  text-shadow: 0 2px 20px rgba(123, 45, 142, 0.5);
}

/* ===== PRODUCT CARDS ===== */
.stack-grid {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.stack-grid--dual .product-card {
  flex: 1;
  max-width: 360px;
  min-width: 260px;
}

.product-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: #f0f0f0;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 24px;
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  backdrop-filter: blur(4px);
  cursor: pointer;
  perspective: 800px;
}
.product-card:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(200, 162, 212, 0.4);
  box-shadow: 0 12px 40px rgba(123, 45, 142, 0.3);
}

.product-card--large {
  max-width: 400px;
}

/* ===== IMAGE CONTAINER ===== */
.product-card__image {
  width: 100%;
  aspect-ratio: 1;
  max-width: 280px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 1rem;
  position: relative;
}

.product-card__front,
.product-card__back {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ===== FLIP EFFECT ===== */
.product-card__image--flippable {
  overflow: visible !important; /* OVERFLOW HIDDEN ROMPE PRESERVE-3D EN CSS */
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}

.product-card:hover .product-card__image--flippable {
  transform: rotateY(180deg);
}

.product-card__image--flippable .product-card__front,
.product-card__image--flippable .product-card__back {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.product-card__image--flippable .product-card__front {
  transform: rotateY(0deg);
  z-index: 2;
}

.product-card__image--flippable .product-card__back {
  transform: rotateY(180deg);
  z-index: 1;
}

.product-card__name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #c8a2d4;
}

.product-card__flip-hint {
  font-size: 0.75rem;
  color: rgba(200, 162, 212, 0.5);
  margin-top: 0.4rem;
  transition: color 0.3s ease;
}
.product-card:hover .product-card__flip-hint {
  color: rgba(200, 162, 212, 0.9);
}

/* ===== COMING SOON OVERLAY ===== */
.coming-soon-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  pointer-events: none;
  border-radius: 12px;
}

.coming-soon-text {
  font-family: 'Bebas Neue', 'Arial Black', sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(123, 45, 142, 0.45);
  padding: 8px 40px;
  transform: rotate(-35deg);
  white-space: nowrap;
  width: 150%;
  text-align: center;
  text-shadow:
    0 0 15px rgba(200, 162, 212, 0.7),
    0 2px 4px rgba(0, 0, 0, 0.5);
  box-shadow:
    0 2px 20px rgba(123, 45, 142, 0.3);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  animation: comingSoonPulse 3s ease-in-out infinite;
}

@keyframes comingSoonPulse {
  0%, 100% {
    background: rgba(123, 45, 142, 0.45);
    text-shadow:
      0 0 15px rgba(200, 162, 212, 0.7),
      0 2px 4px rgba(0, 0, 0, 0.5);
  }
  50% {
    background: rgba(123, 45, 142, 0.55);
    text-shadow:
      0 0 25px rgba(200, 162, 212, 0.9),
      0 0 50px rgba(123, 45, 142, 0.4),
      0 2px 4px rgba(0, 0, 0, 0.5);
  }
}

/* ===== RESPONSIVE ===== */
@media (max-width: 767px) {
  .stack-title {
    font-size: 1.7rem;
  }
  .stack-grid--dual .product-card {
    min-width: 100%;
  }
  .product-card__image {
    max-width: 200px;
  }
}
</style>
