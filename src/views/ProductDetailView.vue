<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore } from '@/stores/storeProducts'
import { useCartStore } from '@/stores/storeCart'
import { useToast } from 'vue-toastification'
import FileUploads from '@/components/FileUploads.vue'
import RelatedProducts from '@/components/RelatedProducts.vue'
import { useSeoMeta } from '@/composables/useSeoMeta'

// Imports para compartir
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faWhatsapp, faXTwitter, faThreads, faPinterest } from '@fortawesome/free-brands-svg-icons'

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

// --- SEO DINÁMICO ---
const seoTitle = computed(() => product.value?.name || 'Producto')
const seoDescription = computed(() => {
  if (!product.value?.description) return 'Descubre este producto en La Casa de Zolve.'
  // Extraer texto plano del HTML de la descripción
  const text = product.value.description.replace(/<[^>]*>/g, '').trim()
  return text.length > 160 ? text.substring(0, 157) + '...' : text
})
const seoImage = computed(() =>
  product.value?.image_urls?.length > 0 ? product.value.image_urls[0] : undefined
)

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  image: seoImage,
  url: computed(() => `/producto/${route.params.id}`),
  type: 'product',
})

// --- 🔥 INICIO: LÓGICA DE PRECIOS Y OFERTAS ---

// Computed para saber si la oferta está activa
const onOffer = computed(() => {
  if (!product.value) return false
  const now = new Date()

  // 1. ¿Tiene un precio de oferta válido?
  const hasOfferPrice =
    product.value.offer_price &&
    product.value.offer_price > 0 &&
    product.value.offer_price < product.value.price
  // 2. ¿Tiene un porcentaje de descuento válido?
  const hasPercentage = product.value.discount_percentage && product.value.discount_percentage > 0

  // Si no tiene ninguno de los dos, no hay oferta
  if (!hasOfferPrice && !hasPercentage) {
    return false
  }

  // 3. Revisar fechas de la oferta
  const hasStartDate = !!product.value.discount_start_date
  const hasEndDate = !!product.value.discount_end_date
  const startDate = hasStartDate ? new Date(product.value.discount_start_date) : null
  const endDate = hasEndDate ? new Date(product.value.discount_end_date) : null

  // Si tiene fecha de inicio y aún no empieza -> NO hay oferta
  if (startDate && now < startDate) return false
  // Si tiene fecha de fin y ya pasó -> NO hay oferta
  if (endDate && now > endDate) return false

  // Si pasó todas las validaciones, ¡SÍ hay oferta!
  return true
})

// Computed para mostrar el precio FINAL (el que se cobra)
const displayPrice = computed(() => {
  if (!product.value) return ''

  // Si la oferta está activa...
  if (onOffer.value) {
    // Prioriza el descuento por porcentaje si existe
    if (product.value.discount_percentage) {
      const discounted = product.value.price * (1 - product.value.discount_percentage / 100)
      return formatPrice(discounted)
    }
    // Si no, usa el precio de oferta fijo
    if (product.value.offer_price) {
      return formatPrice(product.value.offer_price) // Tu precio de 5990
    }
  }

  // Si no hay oferta, muestra el precio normal
  return formatPrice(product.value.price) // Tu precio de 6990
})

// Computed para mostrar el precio ORIGINAL (tachado)
const originalPrice = computed(() => {
  if (onOffer.value) {
    return formatPrice(product.value.price) // El precio normal (6990)
  }
  return null // No hay precio que tachar
})

// Computed para la etiqueta de descuento (ej: "-15%")
const discountBadgeText = computed(() => {
  if (onOffer.value && product.value.discount_percentage) {
    return `-${product.value.discount_percentage}%`
  }
  // Calculamos el % si solo hay precio fijo
  if (onOffer.value && product.value.offer_price) {
    const percent = Math.round(
      ((product.value.price - product.value.offer_price) / product.value.price) * 100,
    )
    return `-${percent}%`
  }
  return null
})

// --- 🔥 FIN: LÓGICA DE PRECIOS Y OFERTAS ---

// 🔥 Refs para personalización
const customizationFiles = ref([])
const customizationNotes = ref('') // 🔥 NUEVO: Ref para las notas

const changeMainImage = (url) => {
  mainImageUrl.value = url
}

// 🔥 Función que recibe los archivos del componente FileUploads
const handleFilesUpdate = (updatedFiles) => {
  customizationFiles.value = updatedFiles
  console.log(
    'Archivos de personalización actualizados en ProductDetail:',
    customizationFiles.value,
  )
}

// 🔥 MODIFICADO: handleAddToCart ahora pasa notas Y archivos
function handleAddToCart() {
  if (!product.value) return
  const quantityToAdd = Number(selectedQuantity.value)

  // Validaciones de cantidad y stock
  if (isNaN(quantityToAdd) || quantityToAdd < 1) {
    toast.error('Por favor, ingresa una cantidad válida (mínimo 1).')
    selectedQuantity.value = 1
    return
  }
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

  // Pasa archivos Y notas al store
  cartStore.addToCart(
    product.value.id,
    quantityToAdd,
    customizationFiles.value,
    customizationNotes.value,
  )

  toast.success(`"${product.value.name}" (x${quantityToAdd}) añadido al carrito!`)

  // Limpia archivos Y notas
  customizationFiles.value = []
  customizationNotes.value = ''
  // Aquí podríamos necesitar llamar a un método 'reset' en FileUploads si exponemos uno
}

// 🔥 MODIFICADO: handleBuyNow ahora pasa notas Y archivos
function handleBuyNow() {
  if (!product.value) return
  const quantityToAdd = Number(selectedQuantity.value)

  // Validaciones de cantidad y stock
  if (isNaN(quantityToAdd) || quantityToAdd < 1) {
    toast.error('Por favor, ingresa una cantidad válida (mínimo 1).')
    selectedQuantity.value = 1
    return
  }
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

  // Pasa archivos Y notas al store
  cartStore.addToCart(
    product.value.id,
    quantityToAdd,
    customizationFiles.value,
    customizationNotes.value,
  )

  toast.info(`"${product.value.name}" (x${quantityToAdd}) añadido. Redirigiendo...`)

  // Limpia archivos Y notas
  customizationFiles.value = []
  customizationNotes.value = ''
  router.push({ name: 'cart' })
}

onMounted(async () => {
  const productId = route.params.id
  if (!productId) {
    // Si no hay ID, redirigir a 404
    router.replace({ name: 'NotFound' })
    return
  }
  // Asegúrate que fetchProductById traiga la nueva columna 'requires_customization_notes'
  const fetchedProduct = await productsStore.fetchProductById(productId)
  if (fetchedProduct) {
    product.value = fetchedProduct
    if (fetchedProduct.image_urls && fetchedProduct.image_urls.length > 0) {
      mainImageUrl.value = fetchedProduct.image_urls[0]
    } else {
      mainImageUrl.value = '/Zolve_Logo.png' // Imagen por defecto
    }
  } else {
    // Producto no encontrado → redirigir a la página 404
    router.replace({ name: 'NotFound' })
    return
  }
  loading.value = false
})

const formatPrice = (value) => {
  if (typeof value !== 'number') return ''
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value)
}

const hasMultipleImages = computed(() => product.value?.image_urls?.length > 1)

// Lógica para compartir
const currentPageUrl = computed(() => (typeof window !== 'undefined' ? window.location.href : ''))
const shareText = computed(() => {
  if (product.value) {
    const text = `¡Mira este producto de La Casa de Zolve: "${product.value.name}"! 🦊`
    return encodeURIComponent(text)
  }
  return encodeURIComponent('¡Mira este producto increíble en La Casa de Zolve! 🦊')
})
const whatsappShareUrl = computed(
  () =>
    `https://api.whatsapp.com/send?text=${shareText.value}%20${encodeURIComponent(currentPageUrl.value)}`,
)
const xTwitterShareUrl = computed(
  () =>
    `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentPageUrl.value)}&text=${shareText.value}`,
)
const threadsShareUrl = computed(
  () =>
    `https://www.threads.net/intent/post?text=${shareText.value}%20${encodeURIComponent(currentPageUrl.value)}`,
)
const pinterestShareUrl = computed(() => {
  if (product.value) {
    return `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(currentPageUrl.value)}&media=${encodeURIComponent(mainImageUrl.value)}&description=${shareText.value}`
  }
  return `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(currentPageUrl.value)}&description=${shareText.value}`
})
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

          <div class="product-description-html" v-html="product.description"></div>

          <div class="price-detail">
            <span class="display-price">{{ displayPrice }}</span>

            <span v-if="originalPrice" class="original-price-striked">
              {{ originalPrice }}
            </span>

            <span v-if="discountBadgeText" class="discount-badge-detail">
              {{ discountBadgeText }}
            </span>
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

          <FileUploads
            v-if="product.is_customizable"
            class="file-uploader"
            @update:files="handleFilesUpdate"
          />

          <div v-if="product.requires_customization_notes" class="customization-notes-section">
            <label for="customNotes">Detalles Adicionales:</label>
            <textarea
              id="customNotes"
              v-model="customizationNotes"
              rows="4"
              maxlength="1000"
              placeholder="Indica aquí el orden de tus imágenes (1: Portada...) u otras instrucciones."
            ></textarea>
            <div class="char-counter">{{ customizationNotes.length }} / 1000</div>
          </div>

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
                ><font-awesome-icon :icon="faWhatsapp"
              /></a>
              <a
                :href="xTwitterShareUrl"
                class="share-btn x-twitter"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartir en X"
                ><font-awesome-icon :icon="faXTwitter"
              /></a>
              <a
                :href="threadsShareUrl"
                class="share-btn threads"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartir en Threads"
                ><font-awesome-icon :icon="faThreads"
              /></a>
              <a
                :href="pinterestShareUrl"
                class="share-btn pinterest"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartir en Pinterest"
                ><font-awesome-icon :icon="faPinterest"
              /></a>
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
/* Estilos generales */
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
  margin: 0 0 15px;
  line-height: 1.2;
}
.product-category-detail {
  font-size: 0.85rem;
  color: var(--brand-pink);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  font-weight: 700;
}
/* Estilos v-html */
.product-description-html {
  flex-grow: 1;
  line-height: 1.7;
  margin-bottom: 25px;
  color: var(--color-text);
  white-space: pre-wrap;
}
.product-description-html :deep(p) {
  margin-bottom: 1em;
}
.product-description-html :deep(ul),
.product-description-html :deep(ol) {
  margin-left: 20px;
  margin-bottom: 1em;
  padding-left: 1.5em;
}
.product-description-html :deep(li) {
  margin-bottom: 0.5em;
}
.product-description-html :deep(a) {
  color: var(--color-link);
  text-decoration: underline;
}
.product-description-html :deep(strong),
.product-description-html :deep(b) {
  font-weight: 700;
}
.product-description-html :deep(em),
.product-description-html :deep(i) {
  font-style: italic;
}
.product-description-html :deep(u) {
  text-decoration: underline;
}

/* 🔥 INICIO: ESTILOS DE PRECIO Y OFERTA */
.price-detail {
  /* Modificamos el contenedor para alinear los precios */
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 30px; /* Margen que tenía el .price-detail original */
}

.price-detail .display-price {
  /* Este es el precio final, grande y en color */
  font-size: 2rem;
  font-weight: 700;
  color: var(--brand-turquoise);
  line-height: 1; /* Asegura alineación */
}

.price-detail .original-price-striked {
  /* Este es el precio tachado */
  font-size: 1.4rem;
  color: #888;
  text-decoration: line-through;
  font-weight: 400;
  line-height: 1; /* Asegura alineación */
}

.price-detail .discount-badge-detail {
  /* Esta es la etiqueta rosa de % */
  background-color: var(--brand-pink);
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 0.9rem;
  font-weight: bold;
}
/* 🔥 FIN: ESTILOS DE PRECIO Y OFERTA */

.file-uploader {
  margin-bottom: 30px;
}
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
.actions-container {
  width: 100%;
}
.buttons-row {
  display: flex;
  gap: 15px;
  width: 100%;
  justify-content: flex-start;
  flex-wrap: wrap;
}
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
  flex-grow: 1;
  flex-basis: 200px;
  max-width: 250px;
}
.btn-add-to-cart:hover,
.btn-buy-now:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.btn-add-to-cart {
  background-color: var(--brand-pink);
  color: #fff;
}
.btn-add-to-cart:hover {
  background-color: #e65c7a;
}
.btn-buy-now {
  background-color: var(--brand-turquoise);
  color: #fff;
}
.btn-buy-now:hover {
  background-color: var(--color-link-hover);
}
.stock-display {
  margin-bottom: 25px;
  text-align: left;
}
.stock-info {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text);
  margin: 0;
}
.stock-info .stock-number {
  font-weight: 700;
}
.stock-info.low-stock {
  color: var(--brand-pink);
  font-weight: 700;
}
.stock-info.out-of-stock {
  color: #d93025;
  font-weight: 700;
  text-transform: uppercase;
}
/* Estilos compartir */
.social-share-container {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
  text-align: left;
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
  justify-content: flex-start;
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
.share-btn.whatsapp {
  background-color: #25d366;
}
.share-btn.x-twitter {
  background-color: #000;
}
.share-btn.threads {
  background-color: #000;
}
.share-btn.pinterest {
  background-color: #e60023;
}
/* 🔥 Estilos Notas Adicionales */
.customization-notes-section {
  margin-top: 20px;
  margin-bottom: 30px;
}
.customization-notes-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 1rem;
  color: var(--color-text);
}
.customization-notes-section textarea {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  font-size: 1rem;
  font-family: var(--font-family-base);
  background-color: var(--color-background);
  color: var(--color-text);
  box-sizing: border-box;
  min-height: 100px;
  resize: vertical;
}
.customization-notes-section textarea::placeholder {
  color: var(--color-text-mute);
  opacity: 0.7;
}
.char-counter {
  text-align: right;
  font-size: 0.8em;
  color: var(--color-text-mute);
  margin-top: 4px;
}
/* Media Query */
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
  .social-share-container {
    text-align: center;
  }
  .share-buttons {
    justify-content: center;
  }
}
</style>
