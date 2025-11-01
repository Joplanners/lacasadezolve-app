<script setup>
import { ref, onMounted, computed } from 'vue'
import { useBannersStore } from '@/stores/storeBanners'

const bannersStore = useBannersStore()

const banners = computed(() => bannersStore.banners)
const loading = computed(() => bannersStore.loading)
const error = computed(() => bannersStore.error)
const secondsPerBanner = ref(5)

// --- 🔥 INICIO DE LA MEJORA (AHORA SÍ) 🔥 ---
// Esta computada revisa los banners y decide si son clickeables.
const processedBanners = computed(() => {
  return banners.value.map((banner) => {
    const url = banner.link_url ? banner.link_url.trim().toLowerCase() : null

    // Lista de URLs que queremos ignorar (la página de inicio)
    const ignoredUrls = [
      '/',
      'https://lacasadezolve.com',
      'https://lacasadezolve.com/',
      'http://lacasadezolve.com',
      'http://lacasadezolve.com/',
    ]

    // Un banner es linkeable SOLO si la URL existe Y NO está en nuestra lista de ignorados.
    const isLinkable = !!(url && !ignoredUrls.includes(url))

    return {
      ...banner,
      isLinkable: isLinkable,
      finalUrl: isLinkable ? banner.link_url.trim() : null, // Usamos el link original si es válido
    }
  })
})
// --- 🔥 FIN DE LA MEJORA 🔥 ---

const trackStyle = computed(() => {
  if (banners.value.length > 1) {
    const totalBanners = banners.value.length
    return {
      width: `${totalBanners * 2 * 100}%`,
      animationDuration: `${totalBanners * secondsPerBanner.value}s`,
    }
  }
  return {}
})

onMounted(() => {
  bannersStore.fetchActiveBanners()
  const mediaQuery = window.matchMedia('(min-width: 768px)')
  if (mediaQuery.matches) {
    secondsPerBanner.value = 8
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

    <div v-else-if="processedBanners.length > 0">
      <div v-if="processedBanners.length > 1" class="carousel">
        <div class="carousel-track" :style="{ ...trackStyle, '--banner-count': banners.length }">
          <component
            v-for="banner in processedBanners"
            :key="banner.id"
            :is="banner.isLinkable ? 'a' : 'div'"
            :href="banner.finalUrl"
            :target="banner.isLinkable ? '_blank' : null"
            :rel="banner.isLinkable ? 'noopener noreferrer' : null"
            class="carousel-slide"
          >
            <img :src="banner.image_url" :alt="banner.alt_text || 'Banner promocional'" />
          </component>

          <template v-if="banners.length > 1">
            <component
              v-for="banner in processedBanners"
              :key="`${banner.id}-clone`"
              :is="banner.isLinkable ? 'a' : 'div'"
              :href="banner.finalUrl"
              :target="banner.isLinkable ? '_blank' : null"
              :rel="banner.isLinkable ? 'noopener noreferrer' : null"
              class="carousel-slide"
            >
              <img :src="banner.image_url" :alt="banner.alt_text || 'Banner promocional'" />
            </component>
          </template>
        </div>
      </div>

      <component
        v-else
        :is="processedBanners[0].isLinkable ? 'a' : 'div'"
        :href="processedBanners[0].finalUrl"
        :target="processedBanners[0].isLinkable ? '_blank' : null"
        :rel="processedBanners[0].isLinkable ? 'noopener noreferrer' : null"
        class="static-banner"
      >
        <img
          :src="processedBanners[0].image_url"
          :alt="processedBanners[0].alt_text || 'Banner promocional'"
        />
      </component>
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
