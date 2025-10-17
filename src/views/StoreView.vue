<script setup>
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useProductsStore } from '@/stores/storeProducts'

const productsStore = useProductsStore()

// --- ESTADO PARA LA PAGINACIÓN ---
const currentPage = ref(1)
const productsPerPage = 9
const totalPages = computed(() => {
  if (productsStore.totalProducts === 0) return 1
  return Math.ceil(productsStore.totalProducts / productsPerPage)
})

const selectedCategoryId = ref(null)
const sortOption = ref('created_at_desc')
const sortOptions = [
  { value: 'created_at_desc', text: 'Más Nuevos' },
  { value: 'price_asc', text: 'Precio: Menor a Mayor' },
  { value: 'price_desc', text: 'Precio: Mayor a Menor' },
  { value: 'offer_desc', text: 'Mejores Ofertas' },
  { value: 'created_at_asc', text: 'Más Antiguos' },
]

// --- FUNCIONES ---

async function fetchProducts() {
  await productsStore.fetchProducts(
    currentPage.value,
    productsPerPage,
    selectedCategoryId.value,
    sortOption.value,
  )
}

function formatPrice(value) {
  if (typeof value !== 'number') return ''
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value)
}

function getProductDisplayInfo(product) {
  const now = new Date()
  let isOnSale = false
  let finalPrice = product.price
  let discountPercent = null
  const hasPotentialOffer = product.offer_price || product.discount_percentage

  if (hasPotentialOffer) {
    let isOfferActive = true
    if (product.discount_start_date && now < new Date(product.discount_start_date)) {
      isOfferActive = false
    }
    if (product.discount_end_date && now > new Date(product.discount_end_date)) {
      isOfferActive = false
    }
    if (isOfferActive) {
      isOnSale = true
      if (product.discount_percentage) {
        finalPrice = product.price * (1 - product.discount_percentage / 100)
        discountPercent = product.discount_percentage
      } else if (product.offer_price) {
        finalPrice = product.offer_price
      }
    }
  }

  return {
    finalPrice: formatPrice(finalPrice),
    originalPrice: formatPrice(product.price),
    isOnSale,
    discountPercent,
  }
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
  fetchProducts()
}

function selectCategory(categoryId) {
  currentPage.value = 1
  selectedCategoryId.value = categoryId
  fetchProducts()
}

function onCategoryChangeMobile(event) {
  currentPage.value = 1
  const categoryId = event.target.value === 'null' ? null : event.target.value
  selectCategory(categoryId)
}

function onSortChange() {
  currentPage.value = 1
  fetchProducts()
}

onMounted(() => {
  productsStore.fetchCategories()
  fetchProducts()
})
</script>

<template>
  <div class="store-view-container">
    <div class="store-header">
      <h1>Nuestra Tienda</h1>
      <p class="store-subtitle">Descubre nuestros productos únicos y personalizables.</p>
    </div>
    <div class="store-layout">
      <aside class="store-sidebar">
        <h3>Categorías</h3>
        <ul class="category-list">
          <li>
            <button @click="selectCategory(null)" :class="{ active: selectedCategoryId === null }">
              ✨ Todas
            </button>
          </li>
          <li v-for="category in productsStore.categories" :key="category.id">
            <button
              @click="selectCategory(category.id)"
              :class="{ active: selectedCategoryId === category.id }"
            >
              {{ category.name }}
            </button>
          </li>
        </ul>
      </aside>
      <div class="product-content">
        <div class="toolbar">
          <div class="mobile-filters">
            <label for="category-select-mobile">Categoría:</label>
            <select
              id="category-select-mobile"
              :value="selectedCategoryId"
              @change="onCategoryChangeMobile"
            >
              <option value="null">✨ Todas</option>
              <option
                v-for="category in productsStore.categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>
          <div class="sort-container">
            <label for="sort-select">Ordenar por:</label>
            <select id="sort-select" v-model="sortOption" @change="onSortChange">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.text }}
              </option>
            </select>
          </div>
        </div>
        <div v-if="productsStore.loading" class="feedback-container">
          <div class="spinner"></div>
          <p>Cargando productos...</p>
        </div>
        <div v-else-if="productsStore.error" class="feedback-container error">
          <p>{{ productsStore.error }}</p>
        </div>
        <div v-else-if="productsStore.products.length === 0" class="feedback-container">
          <p>🦊 ¡Ups! No encontramos productos que coincidan con tu búsqueda.</p>
        </div>
        <div v-else>
          <div class="product-grid">
            <div v-for="product in productsStore.products" :key="product.id" class="product-card">
              <router-link
                :to="{ name: 'product-detail', params: { id: product.id } }"
                class="card-link"
              >
                <div class="card-image-wrapper">
                  <img
                    :src="
                      product.image_urls && product.image_urls.length > 0
                        ? product.image_urls[0]
                        : '/Zolve_Logo.png'
                    "
                    :alt="product.name"
                    class="product-image"
                  />
                  <span
                    v-if="
                      getProductDisplayInfo(product).isOnSale &&
                      getProductDisplayInfo(product).discountPercent
                    "
                    class="discount-badge"
                    >-{{ getProductDisplayInfo(product).discountPercent }}%</span
                  >
                </div>
                <div class="card-info">
                  <p class="product-category">{{ product.category?.name || 'General' }}</p>
                  <h3 class="product-name">{{ product.name }}</h3>
                  <div class="price-container">
                    <span v-if="getProductDisplayInfo(product).isOnSale" class="original-price">{{
                      getProductDisplayInfo(product).originalPrice
                    }}</span>
                    <span class="final-price">{{ getProductDisplayInfo(product).finalPrice }}</span>
                  </div>
                </div>
              </router-link>
            </div>
          </div>
          <div v-if="totalPages > 1" class="pagination">
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              class="page-arrow"
            >
              &lt;
            </button>
            <button
              v-for="page in totalPages"
              :key="page"
              @click="goToPage(page)"
              :class="{ active: currentPage === page }"
              class="page-number"
            >
              {{ page }}
            </button>
            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="page-arrow"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.store-view-container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px 40px;
  font-family: var(--font-family-base);
}
.store-header {
  text-align: center;
  margin-bottom: 40px;
}
.store-header h1 {
  font-size: 2.8rem;
  color: var(--color-heading);
  margin-bottom: 10px;
}
.store-subtitle {
  font-size: 1.1rem;
  color: var(--color-text);
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
.store-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 40px;
  align-items: flex-start;
}
.store-sidebar {
  position: sticky;
  top: 20px;
}
.store-sidebar h3 {
  margin-top: 0;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 10px;
  font-size: 1.2rem;
}
.category-list {
  list-style: none;
  padding: 0;
  margin: 10px 0 0 0;
}
.category-list button {
  width: 100%;
  text-align: left;
  padding: 10px 15px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  font-weight: 500;
  color: var(--color-text);
}
.category-list button:hover {
  background-color: var(--color-background-mute);
  color: var(--brand-pink);
}
.category-list button.active {
  background-color: var(--brand-turquoise);
  color: white;
  font-weight: bold;
}
.product-content {
  min-width: 0;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 20px;
}
.mobile-filters {
  display: none;
}
.sort-container {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sort-container label,
.mobile-filters label {
  font-size: 0.9em;
  color: #555;
}
.sort-container select,
.mobile-filters select {
  padding: 8px 12px;
  border-radius: 5px;
  border: 1px solid var(--color-border);
  font-size: 0.9em;
  background-color: var(--color-background);
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 25px;
}
.product-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--color-background-soft);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}
.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}
.card-link {
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.card-image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background-color: #fff;
}
.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.product-card:hover .product-image {
  transform: scale(1.05);
}
.discount-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: var(--brand-pink);
  color: white;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: bold;
}
.card-info {
  padding: 15px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  text-align: center;
}
.product-category {
  margin: 0 0 5px 0;
  font-size: 0.8rem;
  color: #777;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.product-name {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
  color: var(--color-heading);
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
  min-height: 2.6em;
}
.price-container {
  margin-top: auto;
  padding-top: 10px;
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.original-price {
  font-size: 0.9em;
  color: #999;
  text-decoration: line-through;
}
.final-price {
  font-size: 1.3em;
  font-weight: bold;
  color: var(--brand-turquoise);
}
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 40px;
  padding: 20px 0;
  border-top: 1px solid var(--color-border);
}
.pagination button {
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  color: var(--color-text);
  border-radius: 6px;
  min-width: 40px;
  height: 40px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.pagination button:hover:not(:disabled) {
  background-color: var(--color-background-mute);
  border-color: var(--brand-turquoise);
  color: var(--brand-turquoise);
}
.pagination button.active {
  background-color: var(--brand-turquoise);
  border-color: var(--brand-turquoise);
  color: white;
  font-weight: bold;
}
.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
@media (max-width: 768px) {
  .store-view-container {
    padding: 20px 15px;
  }
  .store-layout {
    grid-template-columns: 1fr;
  }
  .store-sidebar {
    display: none;
  }
  .mobile-filters {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .toolbar {
    justify-content: space-between;
  }
}
</style>
