<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useProductsStore } from '@/stores/storeProducts'
import FileUploads from '@/components/FileUploads.vue'

const route = useRoute()
const productsStore = useProductsStore()

const product = ref(null)
const loading = ref(true)
const errorMsg = ref('')

const mainImageUrl = ref('')

const changeMainImage = (url) => {
  mainImageUrl.value = url
}

onMounted(async () => {
  const productId = route.params.id
  if (!productId) {
    errorMsg.value = 'No se especificó un producto.'
    loading.value = false
    return
  }

  const fetchedProduct = await productsStore.fetchProductById(productId)
  if (fetchedProduct) {
    product.value = fetchedProduct
    if (fetchedProduct.image_urls && fetchedProduct.image_urls.length > 0) {
      mainImageUrl.value = fetchedProduct.image_urls[0]
    } else {
      mainImageUrl.value = '/Zolve_Logo.png'
    }
  } else {
    errorMsg.value = '¡Ups! No pudimos encontrar este producto.'
  }
  loading.value = false
})

const formatPrice = (value) => {
  if (typeof value !== 'number') return ''
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value)
}

const hasMultipleImages = computed(() => product.value?.image_urls?.length > 1)
</script>

<template>
  <div class="product-detail-container">
    <div v-if="loading" class="feedback-container">
      <div class="spinner"></div>
      <p>Cargando producto...</p>
    </div>

    <div v-else-if="errorMsg" class="feedback-container error">
      <p>{{ errorMsg }}</p>
    </div>

    <div v-else-if="product" class="product-layout">
      <div class="product-image-gallery">
        <div class="main-image-wrapper">
          <img :src="mainImageUrl" :alt="product.name" class="main-image" />
        </div>
        <div v-if="hasMultipleImages" class="thumbnails">
          <button
            v-for="(url, index) in product.image_urls"
            :key="index"
            class="thumbnail-item"
            :class="{ active: url === mainImageUrl }"
            @click="changeMainImage(url)"
          >
            <img :src="url" :alt="`${product.name} - vista ${index + 1}`" />
          </button>
        </div>
      </div>

      <div class="product-info">
        <p class="product-category-detail">{{ product.category?.name || 'General' }}</p>
        <h1>{{ product.name }}</h1>
        <p class="product-description">{{ product.description }}</p>

        <div class="price-detail">
          <span>{{ formatPrice(product.price) }}</span>
        </div>

        <FileUploads v-if="product.is_customizable" class="file-uploader" />

        <button class="btn btn-add-to-cart">🛒 Añadir al Carrito</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-detail-container {
  padding: 20px 0;
}
.feedback-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
.feedback-container p {
  font-style: italic;
  color: #555;
  margin-top: 15px;
}
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid var(--brand-turquoise);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.product-layout {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 50px;
  align-items: flex-start;
}

.product-image-gallery {
  min-width: 0;
}
.product-info {
  display: flex;
  flex-direction: column;
}

.main-image-wrapper {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}
.main-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumbnails {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
}
.thumbnail-item {
  width: 80px;
  height: 80px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
  opacity: 0.7;
}
.thumbnail-item:hover {
  opacity: 1;
  border-color: var(--brand-turquoise);
}
.thumbnail-item.active {
  border-color: var(--brand-pink);
  opacity: 1;
  transform: scale(1.05);
}
.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info h1 {
  font-size: 2.2rem;
  margin: 0 0 15px 0;
  line-height: 1.2;
}
.product-category-detail {
  font-size: 0.85rem;
  color: var(--brand-pink);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  font-weight: bold;
}
.product-description {
  flex-grow: 1;
  line-height: 1.7;
  margin-bottom: 25px;
  color: var(--color-text);
}
.price-detail {
  font-size: 2rem;
  font-weight: bold;
  color: var(--brand-turquoise);
  margin-bottom: 30px;
}
.file-uploader {
  margin-bottom: 30px;
}

.btn-add-to-cart {
  width: auto;
  /* ¡LA CORRECCIÓN ESTÁ AQUÍ! Centramos el botón */
  align-self: center;
  padding: 15px 40px; /* Un poco más de padding para que se vea importante */
  font-size: 1.1rem;
  background-color: var(--brand-pink);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}
.btn-add-to-cart:hover {
  background-color: #e65c7a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@media (max-width: 800px) {
  .product-layout {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  .product-info h1 {
    font-size: 1.8rem;
  }
  .thumbnails {
    justify-content: center;
  }
  .btn-add-to-cart {
    width: 100%; /* En móvil, vuelve a ocupar todo el ancho para ser fácil de tocar */
  }
}
</style>
