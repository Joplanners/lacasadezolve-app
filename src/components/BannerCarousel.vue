<script setup>
import { onMounted, computed } from 'vue'
import { useBannersStore } from '@/stores/storeBanners'

const bannersStore = useBannersStore()

const banners = computed(() => bannersStore.banners)
const loading = computed(() => bannersStore.loading)
const error = computed(() => bannersStore.error)

// Estilos dinámicos SOLO para el carrusel (cuando hay más de 1 banner)
const trackStyle = computed(() => {
  if (banners.value.length > 1) {
    const totalBanners = banners.value.length
    return {
      // El track contiene los banners originales + los clones
      width: `${totalBanners * 2 * 100}%`,
      animationDuration: `${totalBanners * 5}s`, // 5 segundos por banner
    }
  }
  return {}
})

onMounted(() => {
  bannersStore.fetchActiveBanners()
})
</script>

<template>
  <div class="banner-container">
    <div v-if="loading" class="feedback-placeholder">
      <p>Cargando banners...</p>
    </div>

    <div v-else-if="error" class="feedback-placeholder error">
      <p>No se pudieron cargar los banners. Revisa la conexión.</p>
    </div>

    <div v-else-if="banners.length > 0">
      <div v-if="banners.length > 1" class="carousel">
        <div class="carousel-track" :style="{ ...trackStyle, '--banner-count': banners.length }">
          <a
            v-for="banner in banners"
            :key="banner.id"
            :href="banner.link_url || '#'"
            class="carousel-slide"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img :src="banner.image_url" :alt="banner.alt_text || 'Banner promocional'" />
          </a>
          <template v-if="banners.length > 1">
            <a
              v-for="banner in banners"
              :key="`${banner.id}-clone`"
              :href="banner.link_url || '#'"
              class="carousel-slide"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img :src="banner.image_url" :alt="banner.alt_text || 'Banner promocional'" />
            </a>
          </template>
        </div>
      </div>

      <a
        v-else
        :href="banners[0].link_url || '#'"
        class="static-banner"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img :src="banners[0].image_url" :alt="banners[0].alt_text || 'Banner promocional'" />
      </a>
    </div>
  </div>
</template>

<style scoped>
.banner-container {
  width: 100%;
  min-height: 150px;
  max-height: 400px;
  overflow: hidden;
  background-color: var(--color-background-mute);
  position: relative;
}

.feedback-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: var(--color-text);
  font-style: italic;
}
.feedback-placeholder.error {
  background-color: #f8d7da;
  color: #721c24;
}

/* --- ESTILOS PARA EL CARRUSEL (MÁS DE 1 IMAGEN) --- */
.carousel {
  width: 100%;
  height: 100%;
}
.carousel-track {
  display: flex;
  height: 100%;
  animation-name: slide;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@keyframes slide {
  from {
    transform: translateX(0%);
  }
  to {
    transform: translateX(-50%);
  }
}
.carousel-slide {
  flex-shrink: 0;
  width: calc(100% / (var(--banner-count, 1) * 2));
  height: 100%;
}
.carousel-slide img {
  width: 100%;
  height: 100%;
  max-height: 400px;
  object-fit: cover;
  object-position: center;
  display: block;
}

/* --- ESTILOS PARA LA IMAGEN ESTÁTICA (SOLO 1 IMAGEN) --- */
.static-banner {
  display: block;
  width: 100%;
  height: 100%;
}
.static-banner img {
  width: 100%;
  height: 100%;
  max-height: 400px;
  object-fit: cover; /* Esto es clave para que llene el espacio sin deformarse */
  object-position: center;
  display: block;
}
</style>
