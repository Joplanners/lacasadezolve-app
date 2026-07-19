<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProductsStore } from '@/stores/storeProducts'

// 1. IMPORTACIONES DE SWIPER
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation, Pagination, A11y } from 'swiper/modules'

// 2. IMPORTAR ESTILOS DE SWIPER
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const props = defineProps({
  categoryId: {
    type: [String, Number],
    required: true,
  },
  currentProductId: {
    type: [String, Number],
    required: true,
  },
})

const productsStore = useProductsStore()
const router = useRouter()

const relatedProducts = ref([])
const loading = ref(true)
const error = ref(null)

// 3. MÓDULOS DE SWIPER
const swiperModules = ref([Navigation, Pagination, A11y])

const fetchProducts = async () => {
  if (!props.categoryId || !props.currentProductId) return

  loading.value = true
  error.value = null
  try {
    // Esta función ya trae 10 productos (del store que modificamos)
    relatedProducts.value = await productsStore.fetchRelatedProducts(
      props.categoryId,
      props.currentProductId,
    )
  } catch (err) {
    console.error('Error al cargar productos relacionados:', err)
    error.value = 'No se pudieron cargar las sugerencias.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchProducts)
watch(() => [props.categoryId, props.currentProductId], fetchProducts)

const goToProduct = (productId) => {
  router.push({ name: 'product-detail', params: { id: productId } })
}
</script>

<template>
  <section v-if="!loading && relatedProducts.length > 0" class="related-products-section">
    <h2>También te podría interesar</h2>

    <swiper
      :modules="swiperModules"
      :slides-per-view="1.5"
      :space-between="15"
      :navigation="true"
      :pagination="{ clickable: true }"
      :breakpoints="{
        '600': { slidesPerView: 2.5, spaceBetween: 20 },
        '800': { slidesPerView: 3.5, spaceBetween: 20 },
        '1024': { slidesPerView: 4.3, spaceBetween: 20 },
        '1280': { slidesPerView: 4.3, spaceBetween: 20 },
      }"
      class="related-products-slider"
    >
      <swiper-slide v-for="product in relatedProducts" :key="product.id">
        <div class="product-card" @click="goToProduct(product.id)" tabindex="0" role="link">
          <div class="product-image" style="position: relative;">
            <img
              v-if="product.image_urls && product.image_urls[0]"
              :src="product.image_urls[0]"
              :alt="product.name"
            />
            <span v-if="product.is_downloadable" style="position: absolute; top: 10px; left: 10px; background-color: #f3e5f5; color: #9c27b0; padding: 5px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; border: 1px solid #e1bee7;">
              📥 Digital
            </span>
            <div v-else class="placeholder-image">🦊</div>
          </div>
          <div class="product-info">
            <h4>{{ product.name }}</h4>
            <p class="product-price">${{ product.price.toLocaleString('es-CL') }}</p>
          </div>
        </div>
      </swiper-slide>
    </swiper>
  </section>

  <div v-else-if="!loading && error" class="feedback-container error-state">
    <p>{{ error }}</p>
  </div>
</template>

<style scoped>
/* Sección principal */
.related-products-section {
  width: 100%;
  margin-top: 60px;
  padding: 40px 0; /* Ajustado para que el slider ocupe todo */
  background-color: var(--color-background);
  text-align: center;
  border-top: 1px solid var(--color-border);
  overflow: hidden; /* Evita que el slider se salga */
}

.related-products-section h2 {
  font-size: 2rem;
  margin-bottom: 30px;
  color: var(--color-heading);
}

/* Estados de feedback (Sin cambios) */
.feedback-container {
  padding: 40px 20px;
  color: var(--color-text);
  font-style: italic;
}
.error-state {
  color: #721c24;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
}

/* Estilos del carrusel */
.related-products-slider {
  padding: 10px 20px 50px 20px; /* Espacio para botones y paginación */
}

:deep(.swiper-slide) {
  height: auto;
  display: flex;
  justify-content: center;
}

/* Tarjeta (Tus estilos) */
.product-card {
  background-color: var(--color-background-soft);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  cursor: pointer;
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.product-card:hover,
.product-card:focus-visible {
  transform: translateY(-6px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.product-image {
  width: 100%;
  height: 180px;
  overflow: hidden;
  background-color: var(--color-background-mute);
}
.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.product-card:hover .product-image img {
  transform: scale(1.05);
}
.placeholder-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: var(--color-border);
  background-color: var(--color-background-mute);
}

.product-info {
  padding: 15px;
  flex-grow: 1;
}
.product-info h4 {
  font-size: 1rem;
  margin: 0 0 8px 0;
  color: var(--color-heading);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.6em;
}
.product-price {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--brand-turquoise);
  margin: 0;
}

/* Personalización de Swiper (con tus colores) */
.related-products-slider :deep(.swiper-button-next),
.related-products-slider :deep(.swiper-button-prev) {
  color: var(--brand-turquoise);
  width: 30px;
  height: 30px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
.related-products-slider :deep(.swiper-button-next::after),
.related-products-slider :deep(.swiper-button-prev::after) {
  font-size: 1rem;
  font-weight: bold;
}

@media (max-width: 767px) {
  .related-products-slider :deep(.swiper-button-next),
  .related-products-slider :deep(.swiper-button-prev) {
    display: none;
  }
}

.related-products-slider :deep(.swiper-pagination) {
  bottom: 10px;
}
.related-products-slider :deep(.swiper-pagination-bullet) {
  background-color: var(--color-border);
  opacity: 0.7;
}
.related-products-slider :deep(.swiper-pagination-bullet-active) {
  background-color: var(--brand-pink);
  opacity: 1;
}
</style>
