<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore } from '@/stores/storeProducts'
import { useCartStore } from '@/stores/storeCart'
import { useToast } from 'vue-toastification'
import FileUploads from '@/components/FileUploads.vue'
import RelatedProducts from '@/components/RelatedProducts.vue'

// --- INICIO: AÑADIDO PARA COMPARTIR ---
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
// Importamos los 4 íconos (sin Facebook)
import { faWhatsapp, faXTwitter, faThreads, faPinterest } from '@fortawesome/free-brands-svg-icons'
// --- FIN: AÑADIDO PARA COMPARTIR ---

const route = useRoute()
const router = useRouter()
const productsStore = useProductsStore()
const cartStore = useCartStore()
const toast = useToast()

const product = ref(null)
const loading = ref(true)
const errorMsg = ref('')
const mainImageUrl = ref('')
const selectedQuantity = ref(1)

const changeMainImage = (url) => {
  mainImageUrl.value = url
}

// --- handleAddToCart (Sin cambios) ---
function handleAddToCart() {
  if (!product.value) return

  const quantityToAdd = Number(selectedQuantity.value)

  if (isNaN(quantityToAdd) || quantityToAdd < 1) {
    toast.error('Por favor, ingresa una cantidad válida (mínimo 1).')
    selectedQuantity.value = 1
    return
  }

  // --- INICIO DE VALIDACIÓN DE STOCK ---
  const stock = product.value.stock
  if (stock !== null && stock !== undefined) {
    if (stock <= 0) {
      toast.error('Lo sentimos, este producto está agotado.')
      selectedQuantity.value = 1
      return
    }
    if (quantityToAdd > stock) {
      toast.error(`Lo sentimos, solo quedan ${stock} unidades disponibles.`)
      selectedQuantity.value = stock
      return
    }
  }
  // --- FIN DE VALIDACIÓN ---

  cartStore.addToCart(product.value.id, quantityToAdd)
  toast.success(`"${product.value.name}" (x${quantityToAdd}) fue añadido al carrito!`)
}

// --- handleBuyNow (Sin cambios) ---
function handleBuyNow() {
  if (!product.value) return

  const quantityToAdd = Number(selectedQuantity.value)

  if (isNaN(quantityToAdd) || quantityToAdd < 1) {
    toast.error('Por favor, ingresa una cantidad válida (mínimo 1).')
    selectedQuantity.value = 1
    return
  }

  // --- INICIO DE VALIDACIÓN DE STOCK ---
  const stock = product.value.stock
  if (stock !== null && stock !== undefined) {
    if (stock <= 0) {
      toast.error('Lo sentimos, este producto está agotado.')
      selectedQuantity.value = 1
      return
    }
    if (quantityToAdd > stock) {
      toast.error(`Lo sentimos, solo quedan ${stock} unidades disponibles.`)
      selectedQuantity.value = stock
      return
    }
  }
  // --- FIN DE VALIDACIÓN ---

  cartStore.addToCart(product.value.id, quantityToAdd)
  toast.info(`"${product.value.name}" (x${quantityToAdd}) añadido. Redirigiendo al carrito...`)
  router.push({ name: 'cart' })
}

// --- onMounted (Sin cambios) ---
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

// --- formatPrice (Sin cambios) ---
const formatPrice = (value) => {
  if (typeof value !== 'number') return ''
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value)
}

// --- hasMultipleImages (Sin cambios) ---
const hasMultipleImages = computed(() => product.value?.image_urls?.length > 1)

// --- INICIO: LÓGICA PARA COMPARTIR (ACTUALIZADA) ---

// 1. URL actual (Sin cambios)
const currentPageUrl = computed(() => {
  return typeof window !== 'undefined' ? window.location.href : ''
})

// 2. Texto a compartir (Sin cambios)
const shareText = computed(() => {
  if (product.value) {
    const text = `¡Mira este producto de La Casa de Zolve: "${product.value.name}"! 🦊`
    return encodeURIComponent(text)
  }
  return encodeURIComponent('¡Mira este producto increíble en La Casa de Zolve! 🦊')
})

// 3. URLs de destino (ACTUALIZADAS SIN FACEBOOK)
const whatsappShareUrl = computed(() => {
  return `https://api.whatsapp.com/send?text=${shareText.value}%20${encodeURIComponent(currentPageUrl.value)}`
})

const xTwitterShareUrl = computed(() => {
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentPageUrl.value)}&text=${shareText.value}`
})

// --- Link de Threads ---
const threadsShareUrl = computed(() => {
  return `https://www.threads.net/intent/post?text=${shareText.value}%20${encodeURIComponent(currentPageUrl.value)}`
})

// --- Link de Pinterest ---
const pinterestShareUrl = computed(() => {
  if (product.value) {
    return `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(currentPageUrl.value)}&media=${encodeURIComponent(mainImageUrl.value)}&description=${shareText.value}`
  }
  return `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(currentPageUrl.value)}&description=${shareText.value}`
})

// --- FIN: LÓGICA PARA COMPARTIR (ACTUALIZADA) ---
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

    <template v-else-if="product">
      <div class="product-layout">
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
          <div class="quantity-selector">
            <label for="quantity">Cantidad:</label>
            <input
              type="number"
              id="quantity"
              v-model.number="selectedQuantity"
              min="1"
              :max="product.stock > 0 ? product.stock : undefined"
            />
          </div>
          <div class="stock-display" v-if="product.stock !== null && product.stock !== undefined">
            <p v-if="product.stock > 10" class="stock-info">
              Disponibles: <span class="stock-number">{{ product.stock }}</span>
            </p>
            <p v-else-if="product.stock > 0 && product.stock <= 10" class="stock-info low-stock">
              ¡Date prisa! Solo quedan
              <span class="stock-number">{{ product.stock }}</span> unidades.
            </p>
            <p v-else class="stock-info out-of-stock">Producto Agotado</p>
          </div>
          <FileUploads v-if="product.is_customizable" class="file-uploader" />

          <div class="actions-container">
            <div class="buttons-row">
              <button @click="handleAddToCart" class="btn btn-add-to-cart">
                🛒 Añadir al Carrito
              </button>
              <button @click="handleBuyNow" class="btn btn-buy-now">⚡ Comprar Ahora</button>
            </div>
          </div>
          <div class="social-share-container">
            <span class="share-label">¡Comparte este producto!</span>
            <div class="share-buttons">
              <a
                :href="whatsappShareUrl"
                class="share-btn whatsapp"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartir en WhatsApp"
              >
                <font-awesome-icon :icon="faWhatsapp" />
              </a>
              <a
                :href="xTwitterShareUrl"
                class="share-btn x-twitter"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartir en X"
              >
                <font-awesome-icon :icon="faXTwitter" />
              </a>
              <a
                :href="threadsShareUrl"
                class="share-btn threads"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartir en Threads"
              >
                <font-awesome-icon :icon="faThreads" />
              </a>
              <a
                :href="pinterestShareUrl"
                class="share-btn pinterest"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartir en Pinterest"
              >
                <font-awesome-icon :icon="faPinterest" />
              </a>
            </div>
          </div>
        </div>
      </div>
      <RelatedProducts
        v-if="product.category"
        :category-id="product.category.id"
        :current-product-id="product.id"
      />
    </template>
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
  display: flex;
  flex-direction: column;
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
/* --- AJUSTES PARA CANTIDAD Y BOTONES --- */
/* 1. Selector de cantidad */
.quantity-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 25px;
}

.quantity-selector label {
  font-weight: 500;
  color: var(--color-text);
  font-size: 1rem;
}

.quantity-selector input {
  width: 70px;
  padding: 8px 10px;
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  font-size: 1rem;
  font-family: var(--font-family-base);
}

/* 2. actions-container ahora es más simple */
.actions-container {
  width: 100%;
}

.buttons-row {
  display: flex;
  gap: 15px; /* Espacio entre los dos botones */
  width: 100%;
  justify-content: flex-start; /* Alineado a la izquierda, como el texto */
  flex-wrap: wrap; /* CLAVE para la responsividad */
}

/* 3. Estilos de botones (flex-basis es importante) */
.btn-add-to-cart,
.btn-buy-now {
  padding: 15px 30px;
  font-size: 1.1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  text-align: center;
  flex-grow: 1; /* Permite que crezcan */
  flex-basis: 200px; /* Ancho base: intentarán medir 200px */
  max-width: 250px; /* Ancho máximo en desktop */
}

.btn-add-to-cart:hover,
.btn-buy-now:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-add-to-cart {
  background-color: var(--brand-pink);
  color: white;
}

.btn-add-to-cart:hover {
  background-color: #e65c7a;
}

.btn-buy-now {
  background-color: var(--brand-turquoise);
  color: white;
}

.btn-buy-now:hover {
  background-color: var(--color-link-hover);
}

.stock-display {
  margin-bottom: 25px; /* Para que tenga el mismo espacio que los otros elementos */
  text-align: left;
}

.stock-info {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text);
  margin: 0;
}

.stock-info .stock-number {
  font-weight: bold;
}

.stock-info.low-stock {
  color: var(--brand-pink); /* ¡Color de urgencia! */
  font-weight: bold;
}

.stock-info.out-of-stock {
  color: #d93025; /* Un rojo estándar para "agotado" */
  font-weight: bold;
  text-transform: uppercase;
}

/* --- INICIO: ESTILOS PARA COMPARTIR --- */
.social-share-container {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
  text-align: left; /* Por defecto, alineado a la izquierda en desktop */
}

.share-label {
  font-weight: 500;
  color: var(--color-text);
  margin-right: 15px;
  display: block;
  margin-bottom: 10px;
}

.share-buttons {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-start; /* Por defecto, alineado a la izquierda en desktop */
}

.share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #fff;
  font-size: 1.2rem;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.share-btn:hover {
  transform: translateY(-2px);
  opacity: 0.9;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Colores de marca actualizados */
.share-btn.whatsapp {
  background-color: #25d366;
}
.share-btn.x-twitter {
  background-color: #000000;
}
.share-btn.threads {
  background-color: #000000;
}
.share-btn.pinterest {
  background-color: #e60023;
}
/* --- FIN: ESTILOS PARA COMPARTIR --- */

/* --- FIN DE AJUSTES --- */

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

  .btn-add-to-cart,
  .btn-buy-now {
    max-width: none;
  }

  /* --- INICIO: NUEVO AJUSTE MÓVIL PARA CENTRAR COMPARTIR --- */
  .social-share-container {
    text-align: center; /* Centra el texto "¡Comparte este producto!" */
  }

  .share-buttons {
    justify-content: center; /* Centra los botones dentro de su contenedor */
  }
  /* --- FIN: NUEVO AJUSTE MÓVIL --- */
}
</style>
