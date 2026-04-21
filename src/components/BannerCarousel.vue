<script setup>
import { ref, onMounted, computed } from 'vue'
import { useBannersStore } from '@/stores/storeBanners'

// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, Navigation, Pagination, A11y } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const bannersStore = useBannersStore()

const banners = computed(() => bannersStore.banners)
const loading = computed(() => bannersStore.loading)
const error = computed(() => bannersStore.error)

const swiperModules = [Autoplay, Navigation, Pagination, A11y]

// Process banners to determine if they are clickable
const processedBanners = computed(() => {
  return banners.value.map((banner) => {
    const url = banner.link_url ? banner.link_url.trim().toLowerCase() : null
    const ignoredUrls = [
      '/',
      'https://lacasadezolve.com',
      'https://lacasadezolve.com/',
      'http://lacasadezolve.com',
      'http://lacasadezolve.com/',
    ]
    const isLinkable = !!(url && !ignoredUrls.includes(url))
    return {
      ...banner,
      isLinkable,
      finalUrl: isLinkable ? banner.link_url.trim() : null,
    }
  })
})

onMounted(() => {
  bannersStore.fetchActiveBanners()
})
</script>

<template>
  <div class="banner-carousel-wrapper">
    <!-- Loading state -->
    <div v-if="loading" class="banner-feedback">
      <p>Cargando banners...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="banner-feedback banner-error">
      <p>No se pudieron cargar los banners.</p>
    </div>

    <!-- Swiper carousel -->
    <div v-else-if="processedBanners.length > 0" class="banner-swiper-container">
      <Swiper
        :modules="swiperModules"
        :slides-per-view="1"
        :space-between="0"
        :loop="processedBanners.length > 1"
        :autoplay="{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }"
        :navigation="processedBanners.length > 1"
        :pagination="processedBanners.length > 1 ? { clickable: true } : false"
        :a11y="{ prevSlideMessage: 'Banner anterior', nextSlideMessage: 'Siguiente banner' }"
        :grab-cursor="processedBanners.length > 1"
        class="banner-swiper"
      >
        <SwiperSlide v-for="banner in processedBanners" :key="banner.id">
          <component
            :is="banner.isLinkable ? 'a' : 'div'"
            :href="banner.finalUrl"
            :target="banner.isLinkable ? '_blank' : null"
            :rel="banner.isLinkable ? 'noopener noreferrer' : null"
            class="banner-slide"
          >
            <img
              :src="banner.image_url"
              :alt="banner.alt_text || 'Banner promocional'"
              loading="lazy"
            />
          </component>
        </SwiperSlide>
      </Swiper>
    </div>
  </div>
</template>

<style scoped>
/* ===== FULL-WIDTH BANNER WRAPPER ===== */
.banner-carousel-wrapper {
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
  overflow: hidden;
  background-color: var(--color-background-mute);
}

/* ===== FEEDBACK STATES ===== */
.banner-feedback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: var(--color-text);
  font-style: italic;
}
.banner-error {
  background-color: #f8d7da;
  color: #721c24;
}

/* ===== SWIPER CONTAINER ===== */
.banner-swiper-container {
  width: 100%;
}

.banner-swiper {
  width: 100%;
}

/* ===== SLIDES ===== */
.banner-slide {
  display: block;
  width: 100%;
}
.banner-slide img {
  width: 100%;
  height: auto;
  max-height: 600px;
  object-fit: cover;
  object-position: center;
  display: block;
}

/* ===== NAVIGATION ARROWS ===== */
.banner-swiper :deep(.swiper-button-next),
.banner-swiper :deep(.swiper-button-prev) {
  color: white;
  width: 44px;
  height: 44px;
  background-color: rgba(0, 0, 0, 0.35);
  border-radius: 50%;
  transition: background-color 0.2s ease;
}
.banner-swiper :deep(.swiper-button-next:hover),
.banner-swiper :deep(.swiper-button-prev:hover) {
  background-color: rgba(0, 0, 0, 0.6);
}
.banner-swiper :deep(.swiper-button-next::after),
.banner-swiper :deep(.swiper-button-prev::after) {
  font-size: 1.1rem;
  font-weight: bold;
}

/* ===== PAGINATION DOTS ===== */
.banner-swiper :deep(.swiper-pagination) {
  bottom: 12px;
}
.banner-swiper :deep(.swiper-pagination-bullet) {
  background-color: rgba(255, 255, 255, 0.6);
  opacity: 1;
  width: 10px;
  height: 10px;
  transition: all 0.2s ease;
}
.banner-swiper :deep(.swiper-pagination-bullet-active) {
  background-color: var(--brand-pink);
  width: 28px;
  border-radius: 5px;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 767px) {
  .banner-slide img {
    max-height: 260px;
  }

  /* Hide arrows on mobile — touch/swipe is the interaction */
  .banner-swiper :deep(.swiper-button-next),
  .banner-swiper :deep(.swiper-button-prev) {
    display: none;
  }

  .banner-swiper :deep(.swiper-pagination-bullet) {
    width: 8px;
    height: 8px;
  }
  .banner-swiper :deep(.swiper-pagination-bullet-active) {
    width: 22px;
  }
}
</style>
