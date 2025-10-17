<template>
  <div class="manager-featured-products">
    <div class="manager-header">
      <h2>Productos Destacados en Home</h2>
      <p class="subtitle">
        Configura qué productos aparecerán en la sección destacada de la página principal
      </p>
    </div>

    <div v-if="loading" class="loading-state">
      <p>Cargando configuración...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>Error: {{ error }}</p>
      <button @click="loadSettings" class="btn-retry">Reintentar</button>
    </div>

    <div v-else class="manager-content">
      <!-- MODE SELECTOR -->
      <div class="mode-selector card">
        <h3>Modo de selección</h3>
        <div class="radio-group">
          <label class="radio-label">
            <input
              type="radio"
              value="auto"
              v-model="localSettings.mode"
              @change="handleModeChange"
            />
            <div class="radio-content">
              <strong>Automático (inteligente)</strong>
              <p>El sistema selecciona productos según criterios configurables</p>
            </div>
          </label>

          <label class="radio-label">
            <input
              type="radio"
              value="manual"
              v-model="localSettings.mode"
              @change="handleModeChange"
            />
            <div class="radio-content">
              <strong>Manual (selección fija)</strong>
              <p>Tú eliges manualmente los 3 productos a mostrar</p>
            </div>
          </label>
        </div>
      </div>

      <!-- AUTO MODE -->
      <div v-if="localSettings.mode === 'auto'" class="auto-mode card">
        <h3>Criterios de selección automática</h3>

        <div class="criteria-list">
          <label class="checkbox-label">
            <input type="checkbox" v-model="localSettings.criteria_new_products" />
            <div class="checkbox-content">
              <strong>Productos nuevos</strong>
              <p>Prioriza productos creados en los últimos 30 días</p>
            </div>
          </label>

          <label class="checkbox-label">
            <input type="checkbox" v-model="localSettings.criteria_top_selling" />
            <div class="checkbox-content">
              <strong>Productos más vendidos</strong>
              <p>Prioriza productos con más ventas en los últimos 7 días</p>
            </div>
          </label>

          <label class="checkbox-label">
            <input type="checkbox" v-model="localSettings.criteria_on_sale" />
            <div class="checkbox-content">
              <strong>Productos en oferta</strong>
              <p>Prioriza productos con descuento activo</p>
            </div>
          </label>

          <div class="form-group">
            <label for="minStock">
              <strong>Stock mínimo requerido:</strong>
            </label>
            <input
              type="number"
              id="minStock"
              v-model.number="localSettings.criteria_min_stock"
              min="0"
              class="input-number"
            />
            <p class="help-text">Solo se mostrarán productos con al menos esta cantidad en stock</p>
          </div>
        </div>

        <div class="fixed-products-section">
          <h3>Productos fijos (opcional)</h3>
          <p class="help-text">
            Los productos fijos SIEMPRE aparecen. El resto rota automáticamente según los criterios.
          </p>

          <div class="form-group">
            <label for="fixedCount">
              <strong>Cantidad de productos fijos:</strong>
            </label>
            <select
              id="fixedCount"
              v-model.number="localSettings.fixed_products_count"
              @change="handleFixedCountChange"
              class="input-select"
            >
              <option :value="0">Ninguno (todos automáticos)</option>
              <option :value="1">1 fijo + 2 automáticos</option>
              <option :value="2">2 fijos + 1 automático</option>
              <option :value="3">3 fijos (sin rotación)</option>
            </select>
          </div>

          <div v-if="localSettings.fixed_products_count > 0" class="fixed-products-list">
            <div v-for="i in localSettings.fixed_products_count" :key="i" class="form-group">
              <label :for="`fixed-${i}`">
                <strong>Producto fijo #{{ i }}:</strong>
              </label>
              <select :id="`fixed-${i}`" v-model="fixedProductIds[i - 1]" class="input-select">
                <option value="">Selecciona un producto</option>
                <option
                  v-for="product in availableProducts"
                  :key="product.id"
                  :value="product.id"
                  :disabled="isProductSelected(product.id, i - 1)"
                >
                  {{ product.name }} - ${{ product.price.toLocaleString() }} (Stock:
                  {{ product.stock }})
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- MANUAL MODE -->
      <div v-else class="manual-mode card">
        <h3>Selecciona 3 productos manualmente</h3>
        <p class="help-text">
          Los productos seleccionados se mostrarán en el orden indicado y NO cambiarán hasta que los
          modifiques.
        </p>

        <div class="manual-products-list">
          <div v-for="i in 3" :key="i" class="form-group">
            <label :for="`manual-${i}`">
              <strong>Posición {{ i }}:</strong>
            </label>
            <select :id="`manual-${i}`" v-model="manualProductIds[i - 1]" class="input-select">
              <option value="">Selecciona un producto</option>
              <option
                v-for="product in availableProducts"
                :key="product.id"
                :value="product.id"
                :disabled="isProductSelected(product.id, i - 1)"
              >
                {{ product.name }} - ${{ product.price.toLocaleString() }} (Stock:
                {{ product.stock }})
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- PREVIEW -->
      <div class="preview-section card">
        <h3>Vista previa</h3>
        <p class="help-text">Así se verán los productos destacados en la página principal:</p>

        <div v-if="loadingPreview" class="loading-preview">
          <p>Cargando vista previa...</p>
        </div>

        <div v-else-if="previewProducts.length === 0" class="empty-preview">
          <p>No hay productos para mostrar</p>
        </div>

        <div v-else class="product-cards-preview">
          <div v-for="product in previewProducts" :key="product.id" class="product-card">
            <div class="product-image">
              <img
                v-if="product.image_urls && product.image_urls[0]"
                :src="product.image_urls[0]"
                :alt="product.name"
              />
              <div v-else class="placeholder-image">Sin imagen</div>
            </div>
            <div class="product-info">
              <h4>{{ product.name }}</h4>
              <p class="product-price">${{ product.price.toLocaleString() }}</p>
              <p class="product-stock">Stock: {{ product.stock }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ACTIONS -->
      <div class="actions-section">
        <button @click="saveChanges" :disabled="saving" class="btn-save btn-primary">
          {{ saving ? 'Guardando...' : 'Guardar cambios' }}
        </button>

        <button @click="resetChanges" :disabled="saving" class="btn-reset">Cancelar</button>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useFeaturedProductsStore } from '@/stores/storeFeaturedProducts'
import { useProductsStore } from '@/stores/storeProducts'
import { useAuthStore } from '@/stores/authStore'

// Stores
const featuredStore = useFeaturedProductsStore()
const productsStore = useProductsStore()
const authStore = useAuthStore()

// State
const localSettings = ref({
  mode: 'auto',
  criteria_new_products: true,
  criteria_top_selling: true,
  criteria_on_sale: true,
  criteria_min_stock: 5,
  fixed_products_count: 0,
})

const fixedProductIds = ref([])
const manualProductIds = ref([])
const previewProducts = ref([])

const loading = ref(false)
const loadingPreview = ref(false)
const saving = ref(false)
const error = ref(null)
const successMessage = ref('')
const errorMessage = ref('')

// Computed
const availableProducts = computed(() => {
  return productsStore.products.filter((p) => p.is_active && p.stock > 0)
})

// Methods
const loadSettings = async () => {
  loading.value = true
  error.value = null

  try {
    // Cargar productos disponibles
    await productsStore.fetchAllProducts()

    // Cargar configuración
    const settings = await featuredStore.getSettings()
    if (settings) {
      localSettings.value = { ...settings }
    }

    // Cargar productos fijos/manuales existentes
    if (localSettings.value.mode === 'manual') {
      await loadManualProducts()
    } else if (localSettings.value.fixed_products_count > 0) {
      await loadFixedProducts()
    }

    // Cargar preview
    await updatePreview()
  } catch (err) {
    console.error('Error cargando configuración:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const loadManualProducts = async () => {
  // TODO: Implementar carga de productos manuales desde BD
  manualProductIds.value = []
}

const loadFixedProducts = async () => {
  // TODO: Implementar carga de productos fijos desde BD
  fixedProductIds.value = []
}

const handleModeChange = () => {
  fixedProductIds.value = []
  manualProductIds.value = []
  updatePreview()
}

const handleFixedCountChange = () => {
  // Ajustar array de productos fijos
  const count = localSettings.value.fixed_products_count
  fixedProductIds.value = fixedProductIds.value.slice(0, count)
  updatePreview()
}

const isProductSelected = (productId, currentIndex) => {
  if (localSettings.value.mode === 'manual') {
    return manualProductIds.value.some((id, idx) => id === productId && idx !== currentIndex)
  } else {
    return fixedProductIds.value.some((id, idx) => id === productId && idx !== currentIndex)
  }
}

const updatePreview = async () => {
  loadingPreview.value = true

  try {
    // Simular preview según modo
    if (localSettings.value.mode === 'manual') {
      const validIds = manualProductIds.value.filter(Boolean)
      previewProducts.value = availableProducts.value.filter((p) => validIds.includes(p.id))
    } else {
      // Para auto, mostrar productos fijos + aleatorios
      const fixedIds = fixedProductIds.value.filter(Boolean)
      let preview = availableProducts.value.filter((p) => fixedIds.includes(p.id))

      // Completar con aleatorios
      const remaining = 3 - preview.length
      if (remaining > 0) {
        const others = availableProducts.value
          .filter((p) => !fixedIds.includes(p.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, remaining)
        preview = [...preview, ...others]
      }

      previewProducts.value = preview
    }
  } catch (err) {
    console.error('Error actualizando preview:', err)
  } finally {
    loadingPreview.value = false
  }
}

const saveChanges = async () => {
  saving.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const userId = authStore.user?.id

    // Guardar configuración
    const settingsResult = await featuredStore.saveSettings(localSettings.value, userId)

    if (!settingsResult.success) {
      throw new Error(settingsResult.error)
    }

    // Guardar productos según modo
    if (localSettings.value.mode === 'manual') {
      const result = await featuredStore.saveManualProducts(manualProductIds.value)
      if (!result.success) {
        throw new Error(result.error)
      }
    } else if (localSettings.value.fixed_products_count > 0) {
      const result = await featuredStore.saveFixedProducts(fixedProductIds.value)
      if (!result.success) {
        throw new Error(result.error)
      }
    }

    successMessage.value = '¡Cambios guardados exitosamente!'

    // Actualizar preview
    await updatePreview()

    // Limpiar mensaje después de 3 segundos
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (err) {
    console.error('Error guardando cambios:', err)
    errorMessage.value = 'Error al guardar cambios: ' + err.message
  } finally {
    saving.value = false
  }
}

const resetChanges = () => {
  loadSettings()
  successMessage.value = ''
  errorMessage.value = ''
}

// Watchers
watch(
  [fixedProductIds, manualProductIds],
  () => {
    updatePreview()
  },
  { deep: true },
)

// Lifecycle
onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.manager-featured-products {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.manager-header {
  margin-bottom: 30px;
}

.manager-header h2 {
  font-size: 2rem;
  color: var(--color-heading);
  margin-bottom: 10px;
}

.subtitle {
  font-size: 1rem;
  color: var(--color-text);
  margin: 0;
}

.card {
  background-color: var(--color-background-soft);
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card h3 {
  font-size: 1.3rem;
  color: var(--color-heading);
  margin-bottom: 20px;
}

.help-text {
  font-size: 0.9rem;
  color: var(--color-text);
  margin-top: 8px;
  opacity: 0.8;
}

/* Mode Selector */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.radio-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.radio-label:hover {
  border-color: var(--brand-turquoise);
  background-color: rgba(50, 137, 144, 0.05);
}

.radio-label input[type='radio'] {
  margin-top: 4px;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.radio-label input[type='radio']:checked ~ .radio-content {
  color: var(--brand-turquoise);
}

.radio-content strong {
  display: block;
  font-size: 1.05rem;
  margin-bottom: 5px;
}

.radio-content p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text);
}

/* Criteria */
.criteria-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.checkbox-label:hover {
  background-color: rgba(50, 137, 144, 0.05);
}

.checkbox-label input[type='checkbox'] {
  margin-top: 4px;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-content strong {
  display: block;
  font-size: 1rem;
  margin-bottom: 3px;
}

.checkbox-content p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.8;
}

/* Form Groups */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.95rem;
  color: var(--color-heading);
}

.input-select,
.input-number {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 1rem;
  font-family: var(--font-family-base);
  transition: border-color 0.3s ease;
}

.input-select:focus,
.input-number:focus {
  outline: none;
  border-color: var(--brand-turquoise);
}

.input-number {
  max-width: 150px;
}

.fixed-products-list,
.manual-products-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 15px;
}

/* Preview */
.product-cards-preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.product-card {
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.product-card:hover {
  transform: translateY(-5px);
}

.product-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background-color: #f5f5f5;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 0.9rem;
}

.product-info {
  padding: 15px;
}

.product-info h4 {
  font-size: 1.1rem;
  margin-bottom: 10px;
  color: var(--color-heading);
}

.product-price {
  font-size: 1.3rem;
  font-weight: var(--font-weight-bold);
  color: var(--brand-turquoise);
  margin-bottom: 5px;
}

.product-stock {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
  margin: 0;
}

.loading-preview,
.empty-preview {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text);
}

/* Actions */
.actions-section {
  display: flex;
  gap: 15px;
  margin-top: 30px;
}

.btn-primary,
.btn-reset {
  padding: 12px 30px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.btn-primary {
  background-color: var(--brand-turquoise);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--brand-pink);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-reset {
  background-color: transparent;
  color: var(--color-text);
  border: 2px solid var(--color-border);
}

.btn-reset:hover:not(:disabled) {
  border-color: var(--color-heading);
  color: var(--color-heading);
}

/* Messages */
.success-message,
.error-message {
  padding: 15px 20px;
  border-radius: 8px;
  margin-top: 20px;
  font-weight: var(--font-weight-medium);
}

.success-message {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* Loading/Error States */
.loading-state,
.error-state {
  text-align: center;
  padding: 60px 20px;
}

.btn-retry {
  margin-top: 15px;
  padding: 10px 25px;
  background-color: var(--brand-turquoise);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-retry:hover {
  background-color: var(--brand-pink);
}

/* Responsive */
@media (max-width: 768px) {
  .manager-featured-products {
    padding: 15px;
  }

  .card {
    padding: 20px 15px;
  }

  .actions-section {
    flex-direction: column;
  }

  .btn-primary,
  .btn-reset {
    width: 100%;
  }

  .product-cards-preview {
    grid-template-columns: 1fr;
  }
}
</style>
