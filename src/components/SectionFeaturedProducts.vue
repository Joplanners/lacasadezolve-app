<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFeaturedProductsStore } from '@/stores/storeFeaturedProducts'

const featuredStore = useFeaturedProductsStore()
const router = useRouter()

const loading = ref(true)
const error = ref(null)

const featuredProducts = computed(() => featuredStore.featuredProducts)

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    await featuredStore.getFeaturedProducts()
  } catch (err) {
    console.error('Error al cargar productos destacados:', err)
    error.value = 'No se pudieron cargar los productos en este momento.'
  } finally {
    loading.value = false
  }
})

const goToStore = () => {
  router.push({ name: 'store' })
}

const goToProduct = (productId) => {
  router.push({ name: 'product-detail', params: { id: productId } })
}
</script>

<template>
  <section class="featured-products-section">
    <h2>Nuestros Destacados</h2>

    <div v-if="loading" class="feedback-container">
      <p>Buscando nuestros mejores productos...</p>
    </div>

    <div v-else-if="error" class="feedback-container error-state">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="featuredProducts.length === 0" class="feedback-container">
      <p>Pronto tendremos nuevos productos destacados. ¡Vuelve a visitarnos!</p>
    </div>

    <div v-else class="product-cards-container">
      <div 
        v-for="product in featuredProducts" 
        :key="product.id" 
        class="product-card"
        @click="goToProduct(product.id)"
        role="button"
        tabindex="0"
        @keydown.enter="goToProduct(product.id)"
      >
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
    </div>


  </section>
</template>

<style scoped>
/* Sección principal */
.featured-products-section {
  width: 100%;
  margin-top: 60px;
  padding: 40px 20px;
  background-color: var(--color-background);
  text-align: center;
}

.featured-products-section h2 {
  font-size: 2rem;
  margin-bottom: 30px;
  color: var(--color-heading);
}

/* Estados de feedback */
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

/* GRID DE PRODUCTOS */
.product-cards-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  max-width: 900px;
  margin: 0 auto;
}

/* CARDS DE PRODUCTOS */
.product-card {
  background-color: var(--color-background-soft);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
  cursor: pointer;
  max-width: 280px;
  border: 2px solid var(--brand-turquoise);
}

.product-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  border-color: var(--brand-pink);
}

/* IMAGEN DEL PRODUCTO */
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

/* INFO DEL PRODUCTO */
.product-info {
  padding: 15px;
}

.product-info h4 {
  font-size: 1rem;
  margin: 0 0 8px 0;
  color: var(--color-heading);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
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

/* CTA BOTÓN */
.cta-container {
  margin-top: 40px;
}

.btn {
  padding: 12px 30px;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-secondary {
  background-color: var(--brand-turquoise);
  color: white;
}

.btn-secondary:hover {
  background-color: var(--brand-pink);
  transform: translateY(-2px);
}

/* RESPONSIVE */
@media (max-width: 900px) {
  .product-cards-container {
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
    justify-items: center; /* Centra los items en la grilla */
  }
}

@media (max-width: 600px) {
  .featured-products-section {
    padding: 30px 15px;
  }

  .featured-products-section h2 {
    font-size: 1.6rem;
  }

  .product-cards-container {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .product-card {
    max-width: 100%;
    width: 100%;
  }

  .product-image {
    height: 200px;
  }

  .btn {
    width: 100%;
    max-width: 400px;
  }
}
</style>
