<script setup>
// Imports Quill y Vue/Supabase
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from 'vue-toastification'

// --- Props, Router, Toast ---
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
  requires_customization_notes: false,
  has_sizes: false,
  requires_ig_for_giveaway: false,
  available_sizes: [],
  is_event_ticket: false, // 🔥 Nuevo flag explícito de ticket
  category_id: null,
  image_urls: [],
  discount_percentage: null,
  discount_start_date: null,
  discount_end_date: null,
})

// --- Estado de la UI ---
const enable_discount = ref(false)
const discount_type = ref('fixed')
const availableCategories = ref([])
const selectedImageFiles = ref([])
const imageFileInputKey = ref(Date.now())
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const newImagePreviews = ref([])
const quillOptions = {
  modules: {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  },
  placeholder: 'Escribe la descripción detallada del producto aquí...',
  theme: 'snow',
}

// --- Computed y Watchers ---
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

// --- Funciones ---
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
    data.requires_customization_notes = data.requires_customization_notes ?? false
    data.has_sizes = data.has_sizes ?? false
    data.requires_ig_for_giveaway = data.requires_ig_for_giveaway ?? false
    data.is_event_ticket = data.is_event_ticket ?? false
    data.available_sizes = data.available_sizes || []
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

function cleanupPreviews() {
  newImagePreviews.value.forEach((url) => URL.revokeObjectURL(url))
  newImagePreviews.value = []
}

// 🔥 Manejo de Tallas
const sizeInput = ref('')
function addSize() {
  const size = sizeInput.value.trim().toUpperCase()
  if (size && !formData.value.available_sizes.includes(size)) {
    formData.value.available_sizes.push(size)
  }
  sizeInput.value = ''
}
function removeSize(index) {
  formData.value.available_sizes.splice(index, 1)
}

function handleFileChange(event) {
  cleanupPreviews()
  selectedImageFiles.value = Array.from(event.target.files)
  newImagePreviews.value = selectedImageFiles.value.map((file) => URL.createObjectURL(file))
}

async function saveProduct() {
  saving.value = true
  errorMsg.value = ''
  try {
    let finalImageUrls = props.isEditMode ? [...formData.value.image_urls] : []
    if (selectedImageFiles.value.length > 0) {
      toast.info(`Subiendo ${selectedImageFiles.value.length} imagen(es)...`)
      const workerUrl = 'https://r2-presigner-worker.jodiabunos.workers.dev' // Tu worker
      const uploadPromises = selectedImageFiles.value.map(async (file) => {
        const formDataBody = new FormData()
        formDataBody.append('file', file, file.name)
        const response = await fetch(workerUrl, { method: 'POST', body: formDataBody })
        if (!response.ok) throw new Error(`Error al subir ${file.name}: ${await response.text()}`)
        const result = await response.json()
        if (!result.publicUrl) throw new Error(`Respuesta inválida del worker para ${file.name}`)
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
      requires_customization_notes: formData.value.requires_customization_notes,
      requires_ig_for_giveaway: formData.value.requires_ig_for_giveaway,
      has_sizes: formData.value.has_sizes,
      available_sizes: formData.value.has_sizes ? formData.value.available_sizes : [],
      is_event_ticket: formData.value.is_event_ticket,
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
      toast.success(`Producto "${productData.name}" actualizado.`)
    } else {
      const { error } = await supabase.from('products').insert(productData)
      if (error) throw error
      toast.success(`Producto "${productData.name}" creado.`)
    }
    router.push({ name: 'admin-products' })
  } catch (error) {
    errorMsg.value = `Error al guardar: ${error.message}`
    toast.error(errorMsg.value)
  } finally {
    saving.value = false
    cleanupPreviews()
    imageFileInputKey.value = Date.now()
    selectedImageFiles.value = []
  }
}

async function deleteProduct() {
  if (!confirm(`¿Estás súper segura de querer eliminar "${formData.value.name}"? ¡Esto no se puede deshacer!`)) return
  
  try {
    const { error } = await supabase.from('products').delete().eq('id', formData.value.id)
    if (error) {
      if (error.code === '23503') {
        throw new Error('Alerta: Este producto ya tiene compras o personas con él en su carrito. Es más seguro simplemente desmarcar la opción "Producto Activo".')
      }
      throw error
    }
    toast.success('Producto eliminado permanentemente.')
    router.push({ name: 'admin-products' })
  } catch (err) {
    toast.error(err.message || 'Error al eliminar el producto.')
  }
}

// --- Hooks de Ciclo de Vida ---
onMounted(() => {
  fetchCategories()
  if (props.isEditMode && route.params.id) {
    fetchProductData(route.params.id)
  }
})
onUnmounted(() => {
  cleanupPreviews()
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
        <QuillEditor
          id="productDescription"
          v-model:content="formData.description"
          contentType="html"
          :options="quillOptions"
          style="min-height: 200px; background-color: white"
        />
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label for="productPrice">Precio Normal:</label>
          <input
            type="number"
            id="productPrice"
            v-model="formData.price"
            required
            min="0"
            step="any"
          />
        </div>
        <div class="form-group">
          <label for="productStock">Stock:</label>
          <input
            type="number"
            id="productStock"
            v-model="formData.stock"
            required
            min="0"
            step="1"
          />
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
            <input type="radio" id="typeFixed" value="fixed" v-model="discount_type" /><label
              for="typeFixed"
              >Precio Fijo</label
            >
            <input
              type="radio"
              id="typePercentage"
              value="percentage"
              v-model="discount_type"
            /><label for="typePercentage">Porcentaje (%)</label>
          </div>
          <div v-if="discount_type === 'fixed'" class="form-group">
            <label for="productOfferPrice">Precio Oferta Fijo:</label
            ><input
              type="number"
              id="productOfferPrice"
              v-model="formData.offer_price"
              min="0"
              step="any"
            />
          </div>
          <div v-if="discount_type === 'percentage'" class="form-group">
            <label for="productDiscountPercentage">Porcentaje Descuento:</label
            ><input
              type="number"
              id="productDiscountPercentage"
              v-model="formData.discount_percentage"
              min="1"
              max="100"
              placeholder="Ej: 15"
            />
          </div>
          <hr />
          <p><strong>Programar duración (opcional)</strong></p>
          <div class="form-grid">
            <div class="form-group">
              <label for="discountStartDate">Inicio:</label
              ><input
                type="datetime-local"
                id="discountStartDate"
                v-model="formData.discount_start_date"
              />
            </div>
            <div class="form-group">
              <label for="discountEndDate">Fin:</label
              ><input
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
        <small>Puedes seleccionar varias. Las nuevas se añadirán.</small>
      </div>
      <div
        v-if="formData.image_urls.length > 0 || newImagePreviews.length > 0"
        class="image-preview-container"
      >
        <p><strong>Imágenes:</strong></p>
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
              title="Eliminar"
            >
              &times;
            </button>
          </div>
          <div
            v-for="(previewUrl, index) in newImagePreviews"
            :key="`new-${index}`"
            class="img-preview new"
          >
            <img :src="previewUrl" :alt="selectedImageFiles[index]?.name || 'Nueva'" />
          </div>
        </div>
      </div>

      <div class="form-group checkbox-group">
        <input type="checkbox" id="isCustomizable" v-model="formData.is_customizable" />
        <label for="isCustomizable">Producto Personalizable (permite subir archivos)</label>
        <small class="tooltip"
          >(?)<span class="tooltip-text"
            >Si se marca, aparecerá la opción para que el cliente suba sus archivos en la página del
            producto.</span
          ></small
        >
      </div>

      <div v-if="formData.is_customizable" class="form-group checkbox-group sub-option">
        <input type="checkbox" id="requiresNotes" v-model="formData.requires_customization_notes" />
        <label for="requiresNotes">Requiere Notas Adicionales del Cliente</label>
        <small class="tooltip"
          >(?)<span class="tooltip-text"
            >Si se marca, aparecerá un campo de texto en la página del producto para que el cliente
            añada instrucciones (ej: orden de fotos, nombres).</span
          ></small
        >
      </div>

      <div class="form-group checkbox-group sub-option" style="border-top: 1px dashed #ddd; padding-top: 10px; margin-top: 10px;">
        <input type="checkbox" id="requiresIG" v-model="formData.requires_ig_for_giveaway" />
        <label for="requiresIG">Habilitar caja de Usuario IG (Para Sorteos)</label>
        <small class="tooltip"
          >(?)<span class="tooltip-text"
            >El cliente verá un campo para dejar su Instagram multiplicando sus opciones de ganar.</span
          ></small
        >
      </div>

      <!-- 🔥 Tallas UI -->
      <div class="form-group checkbox-group">
        <input type="checkbox" id="hasSizes" v-model="formData.has_sizes" />
        <label for="hasSizes">Este producto requiere selección de Talla (Ej: Ropa)</label>
      </div>

      <div v-if="formData.has_sizes" class="form-group sub-option">
        <label>Tallas Estándar Rápida:</label>
        <div class="standard-sizes-container">
          <label class="size-check-label" v-for="size in ['XS', 'S', 'M', 'L', 'XL', 'XXL']" :key="size">
            <input type="checkbox" :value="size" v-model="formData.available_sizes" />
            <span class="size-text">{{ size }}</span>
          </label>
        </div>
        
        <label style="margin-top: 15px;">Añadir Talla Especial / Otra:</label>
        <div class="sizes-input-group">
          <input 
            type="text" 
            v-model="sizeInput" 
            placeholder="Ej: Niño 12, 3XL, etc." 
            @keydown.enter.prevent="addSize"
          />
          <button type="button" @click="addSize" class="btn-secondary">Añadir</button>
        </div>
        
        <div class="sizes-list" v-if="formData.available_sizes.length > 0">
          <span v-for="(size, index) in formData.available_sizes" :key="index" class="size-badge">
            {{ size }}
            <button type="button" @click="removeSize(index)" title="Eliminar talla">&times;</button>
          </span>
        </div>
      </div>

      <!-- 🔥 Configuración de Entradas -->
      <div class="form-group checkbox-group" style="padding-top: 15px; border-top: 1px solid #ddd;">
        <input type="checkbox" id="isEventTicket" v-model="formData.is_event_ticket" />
        <label for="isEventTicket">Configurar exclusivamente como "Entrada Promocional"</label>
      </div>
      
      <div v-if="formData.is_event_ticket" class="info-box ticket-info">
        <p><strong>🎟️ ¡Atención!</strong> Al marcar esta opción, el producto obligará a elegir a tus asistentes Sector, fecha, y RUT, y aplicará tu descuento matemático (Pares a $4.000 e impares sueltos a $2.500) en el carrito sin importar el precio base ingresado arriba.</p>
      </div>

      <div class="form-group checkbox-group">
        <input type="checkbox" id="isActive" v-model="formData.is_active" />
        <label for="isActive">Producto Activo (visible en la tienda)</label>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-save" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar Producto' }}
        </button>
        <button 
          v-if="isEditMode" 
          type="button" 
          @click="deleteProduct" 
          class="btn btn-delete" 
          :disabled="saving"
        >
          🗑️ Eliminar Producto
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
/* Estilos generales */
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
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 700;
}
.form-group input[type='text'],
.form-group input[type='number'],
.form-group input[type='datetime-local'],
.form-group input[type='file'],
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 1rem;
}
/* Estilos Quill */
.form-group :deep(.ql-toolbar) {
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  border-bottom: none;
}
.form-group :deep(.ql-container) {
  font-size: 1rem;
  min-height: 150px;
  border: 1px solid #ccc;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}
.form-group :deep(.ql-editor) {
  padding: 12px;
  background-color: #fff;
  min-height: 150px;
}
/* Resto de estilos */
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
.checkbox-group input[type='checkbox'] {
  width: auto;
  height: 18px;
  width: 18px;
}
.checkbox-group label {
  font-weight: 400;
  margin-bottom: 0;
}
.form-actions {
  margin-top: 30px;
  text-align: right;
  border-top: 1px solid #eee;
  padding-top: 20px;
}
.btn {
  padding: 12px 22px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  text-decoration: none;
  font-size: 1em;
  font-weight: 500;
  margin-left: 10px;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;
}
.btn-save {
  background-color: var(--brand-pink);
  color: #fff;
}
.btn-save:hover {
  background-color: #d81b60;
}
.btn-cancel {
  background-color: #6c757d;
  color: #fff;
}
.btn-cancel:hover {
  background-color: #5a6268;
}
.btn-delete {
  background-color: #dc3545;
  color: #fff;
}
.btn-delete:hover {
  background-color: #c82333;
}
.btn:disabled,
.btn.disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}
.image-preview-container {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px dashed #ccc;
}
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}
.img-preview {
  position: relative;
  width: 120px;
  height: 120px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background-color: #eee;
}
.img-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.img-preview.new::before {
  content: 'Nueva';
  position: absolute;
  top: 0;
  right: 0;
  background-color: #28a745;
  color: #fff;
  padding: 3px 6px;
  font-size: 0.75em;
  border-bottom-left-radius: 4px;
  z-index: 5;
}
.remove-image-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background-color: rgba(216, 27, 96, 0.8);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  line-height: 1;
  transition: background-color 0.2s ease;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.remove-image-btn:hover {
  background-color: rgba(216, 27, 96, 1);
}
.discount-fieldset {
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 20px;
  margin: 30px 0;
  background-color: #fdfdfd;
}
.discount-fieldset legend {
  font-weight: 700;
  padding: 0 10px;
  font-size: 1.1em;
}
.discount-options {
  margin-top: 20px;
}
.discount-type-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 15px 25px;
  margin-bottom: 20px;
  align-items: center;
}
.discount-type-selector input[type='radio'] {
  width: auto;
  margin-right: 5px;
}
.discount-type-selector label {
  font-weight: 400;
  cursor: pointer;
}
hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 25px 0;
}
.tooltip {
  position: relative;
  cursor: help;
  display: inline-block;
  background-color: #90a4ae;
  color: #fff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  text-align: center;
  font-size: 13px;
  line-height: 20px;
  margin-left: 5px;
}
.tooltip .tooltip-text {
  visibility: hidden;
  width: 220px;
  background-color: #37474f;
  color: #fff;
  text-align: left;
  border-radius: 6px;
  padding: 10px;
  position: absolute;
  z-index: 100;
  bottom: 135%;
  left: 50%;
  margin-left: -110px;
  opacity: 0;
  transition: opacity 0.3s ease;
  font-size: 0.9em;
  line-height: 1.4;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}
.tooltip:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}
.loading-indicator,
.error-message {
  padding: 15px;
  text-align: center;
  border-radius: 5px;
  margin: 20px 0;
}
.loading-indicator {
  background-color: #e3f2fd;
  color: #1e88e5;
}
.error-message {
  background-color: #ffebee;
  color: #c62828;
  font-weight: 500;
}
/* Estilo indentado */
.sub-option {
  margin-left: 25px;
  margin-top: 5px;
}
/* 🔥 Tallas */
.standard-sizes-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  background-color: #fff;
  padding: 10px 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.size-check-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-weight: normal !important;
}
.size-check-label input {
  width: auto !important;
}
.sizes-input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
.sizes-input-group input {
  width: auto;
  flex-grow: 1;
}
.btn-secondary {
  background-color: #607d8b;
  color: #fff;
  border-radius: 4px;
  padding: 8px 15px;
  border: none;
  cursor: pointer;
}
.sizes-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.size-badge {
  background-color: #e0f2f1;
  color: #00695c;
  padding: 5px 12px;
  border-radius: 15px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
}
.size-badge button {
  background: none;
  border: none;
  color: #004d40;
  cursor: pointer;
  font-weight: bold;
  font-size: 1.2em;
  padding: 0;
  line-height: 1;
}
.info-box.ticket-info {
  background-color: #e8f4fd;
  border-left: 4px solid #2196f3;
  padding: 12px 15px;
  margin: 25px 0 15px 0;
  border-radius: 4px;
}
.info-box.ticket-info p {
  margin: 0;
  font-size: 0.9em;
  color: #0c5460;
  line-height: 1.4;
}
@media (max-width: 600px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .admin-product-form {
    padding: 15px;
  }
  .discount-type-selector {
    gap: 10px;
  }
  .form-actions {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .btn {
    margin-left: 0;
    width: 100%;
  }
}
</style>
