<script setup>
// 🔥 NUEVO: Importamos 'ref'
import { ref, onMounted, computed } from 'vue'
import { useBannersStore } from '@/stores/storeBanners'

const bannersStore = useBannersStore()

const banners = computed(() => bannersStore.banners)
const loading = computed(() => bannersStore.loading)
const error = computed(() => bannersStore.error)

// 🔥 NUEVO: Creamos una variable reactiva para la duración
// 5 segundos será el valor por defecto (móvil)
const secondsPerBanner = ref(5)

// Estilos dinámicos SOLO para el carrusel
const trackStyle = computed(() => {
  if (banners.value.length > 1) {
    const totalBanners = banners.value.length
    return {
      width: `${totalBanners * 2 * 100}%`,
      // ✨ CAMBIO: Usamos nuestra variable reactiva en lugar del '5' fijo
      animationDuration: `${totalBanners * secondsPerBanner.value}s`,
    }
  }
  return {}
})

onMounted(() => {
  bannersStore.fetchActiveBanners()

  // 🔥 NUEVO: Chequeamos el tamaño de la pantalla al cargar
  const mediaQuery = window.matchMedia('(min-width: 768px)') // 768px es un breakpoint común para 'desktop'

  if (mediaQuery.matches) {
    // Si la pantalla es ancha (desktop), cambiamos la duración
    secondsPerBanner.value = 8 // Por ejemplo, 8 segundos. ¡Juega con este número!
  }
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
