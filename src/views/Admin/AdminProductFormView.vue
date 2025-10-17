<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from 'vue-toastification'

// --- Inicialización ---
const props = defineProps({ isEditMode: { type: Boolean, default: false } })
const route = useRoute()
const router = useRouter()
const toast = useToast()

// --- Estado del Formulario ---
const formData = ref({
  id: null,
  name: '',
  description: '',
  price: null,
  offer_price: null,
  stock: 0,
  is_active: true,
  is_customizable: false,
  category_id: null,
  image_urls: [],
  discount_percentage: null,
  discount_start_date: null,
  discount_end_date: null,
})

// --- Estado local de la UI ---
const enable_discount = ref(false)
const discount_type = ref('fixed')
const availableCategories = ref([])
const selectedImageFiles = ref([])
const imageFileInputKey = ref(Date.now())
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')

const formTitle = computed(() => (props.isEditMode ? 'Editar Producto' : 'Añadir Nuevo Producto'))

watch(
  formData,
  (newVal) => {
    if (newVal.offer_price || newVal.discount_percentage) {
      enable_discount.value = true
      discount_type.value = newVal.discount_percentage ? 'percentage' : 'fixed'
    }
  },
  { deep: true },
)

// Función para eliminar una imagen que YA está guardada en el producto
function removeExistingImage(index) {
  formData.value.image_urls.splice(index, 1)
  toast.info('Imagen marcada para eliminar. Guarda los cambios para confirmar.')
}

async function fetchCategories() {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('id, name')
      .order('name')
    if (error) throw error
    availableCategories.value = data
  } catch {
    toast.error('No se pudieron cargar las categorías.')
  }
}

async function fetchProductData(productId) {
  loading.value = true
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', productId).single()
    if (error) throw error
    if (!data.image_urls) data.image_urls = []
    if (data.discount_start_date) data.discount_start_date = data.discount_start_date.slice(0, 16)
    if (data.discount_end_date) data.discount_end_date = data.discount_end_date.slice(0, 16)
    formData.value = data
  } catch (error) {
    errorMsg.value = `Error al cargar el producto: ${error.message}`
    toast.error(errorMsg.value)
  } finally {
    loading.value = false
  }
}

function handleFileChange(event) {
  selectedImageFiles.value = Array.from(event.target.files)
}

async function saveProduct() {
  saving.value = true
  errorMsg.value = ''
  try {
    let finalImageUrls = props.isEditMode ? [...formData.value.image_urls] : []

    if (selectedImageFiles.value.length > 0) {
      toast.info(`Subiendo ${selectedImageFiles.value.length} imagen(es)...`)
      const workerUrl = 'https://r2-presigner-worker.jodiabunos.workers.dev'
      const uploadPromises = selectedImageFiles.value.map(async (file) => {
        const formDataBody = new FormData()
        formDataBody.append('file', file, file.name)
        const response = await fetch(workerUrl, { method: 'POST', body: formDataBody })
        if (!response.ok) throw new Error(`Error al subir ${file.name}`)
        const result = await response.json()
        return result.publicUrl
      })
      const newUrls = await Promise.all(uploadPromises)
      finalImageUrls.push(...newUrls)
    }

    const productData = {
      name: formData.value.name,
      description: formData.value.description,
      price: formData.value.price,
      stock: formData.value.stock,
      is_active: formData.value.is_active,
      is_customizable: formData.value.is_customizable,
      category_id: formData.value.category_id,
      image_urls: finalImageUrls,
      offer_price:
        enable_discount.value && discount_type.value === 'fixed'
          ? formData.value.offer_price
          : null,
      discount_percentage:
        enable_discount.value && discount_type.value === 'percentage'
          ? formData.value.discount_percentage
          : null,
      discount_start_date:
        enable_discount.value && formData.value.discount_start_date
          ? formData.value.discount_start_date
          : null,
      discount_end_date:
        enable_discount.value && formData.value.discount_end_date
          ? formData.value.discount_end_date
          : null,
    }

    if (props.isEditMode) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', formData.value.id)
      if (error) throw error
      toast.success(`Producto "${productData.name}" actualizado con éxito.`)
    } else {
      const { error } = await supabase.from('products').insert(productData)
      if (error) throw error
      toast.success(`Producto "${productData.name}" creado con éxito.`)
    }
    router.push({ name: 'admin-products' })
  } catch (error) {
    errorMsg.value = `Error al guardar: ${error.message}`
    toast.error(errorMsg.value)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchCategories()
  if (props.isEditMode) {
    fetchProductData(route.params.id)
  }
})
</script>

<template>
  <div class="admin-product-form">
    <h3>{{ formTitle }}</h3>

    <div v-if="loading" class="loading-indicator"><p>Cargando...</p></div>
    <div v-if="errorMsg" class="error-message">
      <p>{{ errorMsg }}</p>
    </div>

    <form v-if="!loading" @submit.prevent="saveProduct">
      <div class="form-group">
        <label for="productName">Nombre del Producto:</label>
        <input type="text" id="productName" v-model="formData.name" required />
      </div>

      <div class="form-group">
        <label for="productDescription">Descripción:</label>
        <textarea id="productDescription" v-model="formData.description" rows="5"></textarea>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label for="productPrice">Precio Normal:</label>
          <input type="number" id="productPrice" v-model="formData.price" required min="0" />
        </div>
        <div class="form-group">
          <label for="productStock">Stock:</label>
          <input type="number" id="productStock" v-model="formData.stock" required min="0" />
        </div>
      </div>

      <fieldset class="discount-fieldset">
        <legend>Gestión de Ofertas</legend>
        <div class="form-group checkbox-group">
          <input type="checkbox" id="enableDiscount" v-model="enable_discount" />
          <label for="enableDiscount">Habilitar Oferta para este Producto</label>
        </div>

        <div v-if="enable_discount" class="discount-options">
          <div class="discount-type-selector">
            <input type="radio" id="typeFixed" value="fixed" v-model="discount_type" />
            <label for="typeFixed">Precio Fijo de Oferta</label>
            <input type="radio" id="typePercentage" value="percentage" v-model="discount_type" />
            <label for="typePercentage">Descuento por Porcentaje</label>
          </div>

          <div v-if="discount_type === 'fixed'" class="form-group">
            <label for="productOfferPrice">Precio de Oferta Fijo:</label>
            <input type="number" id="productOfferPrice" v-model="formData.offer_price" min="0" />
          </div>

          <div v-if="discount_type === 'percentage'" class="form-group">
            <label for="productDiscountPercentage">Porcentaje de Descuento (%):</label>
            <input
              type="number"
              id="productDiscountPercentage"
              v-model="formData.discount_percentage"
              min="1"
              max="100"
              placeholder="Ej: 15 para un 15%"
            />
          </div>

          <hr />

          <p><strong>Programar duración de la oferta (opcional)</strong></p>
          <div class="form-grid">
            <div class="form-group">
              <label for="discountStartDate">Inicio de la Oferta:</label>
              <input
                type="datetime-local"
                id="discountStartDate"
                v-model="formData.discount_start_date"
              />
            </div>
            <div class="form-group">
              <label for="discountEndDate">Fin de la Oferta:</label>
              <input
                type="datetime-local"
                id="discountEndDate"
                v-model="formData.discount_end_date"
              />
            </div>
          </div>
        </div>
      </fieldset>

      <div class="form-group">
        <label for="productCategory">Categoría:</label>
        <select id="productCategory" v-model="formData.category_id">
          <option :value="null">-- Sin Categoría --</option>
          <option v-for="cat in availableCategories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="productImages">Imágenes del Producto:</label>
        <input
          type="file"
          id="productImages"
          @change="handleFileChange"
          multiple
          accept="image/*"
          :key="imageFileInputKey"
        />
        <small
          >Puedes seleccionar varias imágenes a la vez. Las nuevas se añadirán a las
          existentes.</small
        >
      </div>

      <div
        v-if="formData.image_urls.length > 0 || selectedImageFiles.length > 0"
        class="image-preview-container"
      >
        <p><strong>Imágenes Actuales y Nuevas:</strong></p>
        <div class="image-grid">
          <div
            v-for="(url, index) in formData.image_urls"
            :key="`existing-${index}`"
            class="img-preview"
          >
            <img :src="url" alt="Imagen existente" />
            <button
              type="button"
              @click="removeExistingImage(index)"
              class="remove-image-btn"
              title="Eliminar imagen"
            >
              &times;
            </button>
          </div>
          <div
            v-for="(file, index) in selectedImageFiles"
            :key="`new-${index}`"
            class="img-preview new"
          >
            <img :src="URL.createObjectURL(file)" :alt="file.name" />
          </div>
        </div>
      </div>

      <div class="form-group checkbox-group">
        <input type="checkbox" id="isCustomizable" v-model="formData.is_customizable" />
        <label for="isCustomizable">Producto Personalizable</label>
        <small class="tooltip"
          >(?)<span class="tooltip-text"
            >Si se marca, aparecerá la opción para que el cliente suba sus archivos en la página del
            producto.</span
          ></small
        >
      </div>

      <div class="form-group checkbox-group">
        <input type="checkbox" id="isActive" v-model="formData.is_active" />
        <label for="isActive">Producto Activo (visible en la tienda)</label>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-save" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar Producto' }}
        </button>
        <router-link
          :to="{ name: 'admin-products' }"
          class="btn btn-cancel"
          :class="{ disabled: saving }"
        >
          Cancelar
        </router-link>
      </div>
    </form>
  </div>
</template>

<style scoped>
.admin-product-form {
  max-width: 800px;
  margin: 20px auto;
  padding: 25px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}
h3 {
  text-align: center;
  margin-bottom: 25px;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}
.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 1rem;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.checkbox-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}
.checkbox-group input {
  width: auto;
}
.checkbox-group label {
  font-weight: normal;
  margin-bottom: 0;
}
.form-actions {
  margin-top: 25px;
  text-align: right;
}
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  text-decoration: none;
  font-size: 1em;
  margin-left: 10px;
}
.btn-save {
  background-color: #007bff;
  color: white;
}
.btn-cancel {
  background-color: #6c757d;
  color: white;
}
.btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
.image-preview-container {
  margin-top: 15px;
}
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.img-preview {
  position: relative;
  width: 100px;
  height: 100px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}
.img-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.img-preview.new::before {
  content: 'Nueva';
  position: absolute;
  top: 0;
  right: 0;
  background-color: #28a745;
  color: white;
  padding: 2px 5px;
  font-size: 0.7em;
  border-bottom-left-radius: 4px;
}
.remove-image-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid white;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  line-height: 1;
  transition: background-color 0.2s ease;
  z-index: 10;
}
.remove-image-btn:hover {
  background-color: var(--brand-pink);
}

.discount-fieldset {
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 15px;
  margin: 25px 0;
  background-color: #fff;
}
.discount-fieldset legend {
  font-weight: bold;
  padding: 0 10px;
}
.discount-options {
  margin-top: 15px;
}
.discount-type-selector {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}
.discount-type-selector input[type='radio'] {
  width: auto;
}
.discount-type-selector label {
  font-weight: normal;
}
hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 20px 0;
}
.tooltip {
  position: relative;
  cursor: help;
  display: inline-block;
  background-color: #ccc;
  color: #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  text-align: center;
  font-size: 12px;
  line-height: 18px;
}
.tooltip .tooltip-text {
  visibility: hidden;
  width: 220px;
  background-color: #333;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 8px;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  margin-left: -110px;
  opacity: 0;
  transition: opacity 0.3s;
}
.tooltip:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}

@media (max-width: 600px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
