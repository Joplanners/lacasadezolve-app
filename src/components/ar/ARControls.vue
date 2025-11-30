<script setup>
defineProps({
  showARControls: Boolean,
  showExitFullscreenButton: Boolean
})

defineEmits(['prev', 'next', 'exit-fullscreen', 'go-home'])
</script>

<template>
  <!-- Navigation Controls (Prev/Next on sides) -->
  <div v-if="showARControls" class="navigation-controls">
    <button @click="$emit('prev')" class="ar-control-button prev-button">
      ‹
    </button>
    <button @click="$emit('next')" class="ar-control-button next-button">
      ›
    </button>
  </div>

  <!-- Back to Home Button -->
  <button
    @click="$emit('go-home')"
    class="back-home-button"
    aria-label="Volver al inicio"
  >
    <span class="button-text">Inicio</span>
  </button>

  <!-- Exit Fullscreen Button -->
  <button
    v-if="showExitFullscreenButton"
    @click="$emit('exit-fullscreen')"
    class="exit-fullscreen-button"
  >
    ✕
  </button>
</template>

<style scoped>
/* Navigation Controls - Positioned on sides */
.navigation-controls {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  pointer-events: none;
  z-index: 1000;
}

.ar-control-button {
  pointer-events: auto;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 32px;
  font-weight: 300;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
  font-family: 'Roboto', Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
}

.ar-control-button:hover {
  background-color: rgba(0, 0, 0, 0.8);
  border-color: var(--brand-turquoise, #4ecdc4);
  transform: scale(1.1);
}

/* Exit Fullscreen Button */
.exit-fullscreen-button {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 45px;
  height: 45px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  z-index: 1060;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.exit-fullscreen-button:hover {
  background-color: rgba(0, 0, 0, 0.8);
}

/* Back to Home Button */
.back-home-button {
  position: absolute;
  top: 20px;
  left: 20px;
  width: auto;
  min-width: 80px;
  height: 40px;
  padding: 0 15px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  z-index: 1060;
  background-color: var(--brand-turquoise, #4ecdc4);
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}

.back-home-button:hover {
  background-color: #45b8b0;
  transform: translateY(-2px);
}

.button-text {
  color: white;
  font-family: 'Roboto', Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
}
</style>
