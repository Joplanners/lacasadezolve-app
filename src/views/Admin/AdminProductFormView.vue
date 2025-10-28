<script setup>
// 🔥 Importa el editor correcto y sus estilos
import { QuillEditor } from '@vueup/vue-quill' // Usa @vueup/vue-quill
import '@vueup/vue-quill/dist/vue-quill.snow.css' // Estilo 'snow'

// Imports estándar de Vue y Supabase
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
  description: '', // Contendrá el HTML del editor
  price: null,
  offer_price: null,
  stock: 0,
  is_active: true,
  is_customizable: false,
  category_id: null,
  image_urls: [], // URLs de imágenes existentes
  discount_percentage: null,
  discount_start_date: null,
  discount_end_date: null,
})

// --- Estado de la UI ---
const enable_discount = ref(false)
const discount_type = ref('fixed')
const availableCategories = ref([])
const selectedImageFiles = ref([]) // Archivos seleccionados por el usuario
const imageFileInputKey = ref(Date.now()) // Para resetear el input de archivo
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const newImagePreviews = ref([]) // URLs para previsualizar nuevas imágenes

// Opciones del Editor Quill
const quillOptions = {
  modules: {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'], // Botón para quitar formato
    ],
  },
  placeholder: 'Escribe la descripción detallada del producto aquí...',
  theme: 'snow', // Estilo de la interfaz del editor
}

// Título del formulario (Editar vs Añadir)
const formTitle = computed(() => (props.isEditMode ? 'Editar Producto' : 'Añadir Nuevo Producto'))

// Observador para activar/desactivar la sección de descuentos
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
    if (!data.image_urls) data.image_urls = [] // Asegura que sea un array
    // Formatea fechas para input datetime-local
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

// Limpia las URLs de previsualización para liberar memoria
function cleanupPreviews() {
  newImagePreviews.value.forEach((url) => URL.revokeObjectURL(url))
  newImagePreviews.value = []
}

// Maneja la selección de nuevos archivos y crea previsualizaciones
function handleFileChange(event) {
  cleanupPreviews()
  selectedImageFiles.value = Array.from(event.target.files)
  newImagePreviews.value = selectedImageFiles.value.map((file) => URL.createObjectURL(file))
}

// Función principal para guardar el producto (crear o actualizar)
async function saveProduct() {
  saving.value = true
  errorMsg.value = ''
  try {
    // Empieza con las URLs existentes si está editando
    let finalImageUrls = props.isEditMode ? [...formData.value.image_urls] : []

    // Sube nuevas imágenes si se seleccionaron
    if (selectedImageFiles.value.length > 0) {
      toast.info(`Subiendo ${selectedImageFiles.value.length} imagen(es)...`)
      // Usa tu Cloudflare Worker para las subidas
      const workerUrl = 'https://r2-presigner-worker.jodiabunos.workers.dev'
      const uploadPromises = selectedImageFiles.value.map(async (file) => {
        const formDataBody = new FormData()
        formDataBody.append('file', file, file.name)
        const response = await fetch(workerUrl, { method: 'POST', body: formDataBody })
        if (!response.ok) throw new Error(`Error al subir ${file.name}: ${await response.text()}`)
        const result = await response.json()
        if (!result.publicUrl)
          throw new Error(`La respuesta del worker no incluyó publicUrl para ${file.name}`)
        return result.publicUrl
      })
      const newUrls = await Promise.all(uploadPromises)
      finalImageUrls.push(...newUrls)
    }

    // Prepara el objeto de datos para Supabase
    const productData = {
      name: formData.value.name,
      description: formData.value.description, // Contenido HTML
      price: formData.value.price,
      stock: formData.value.stock,
      is_active: formData.value.is_active,
      is_customizable: formData.value.is_customizable,
      category_id: formData.value.category_id,
      image_urls: finalImageUrls, // Lista actualizada de URLs
      // Manejo de campos de descuento
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

    // Realiza la operación Upsert (Update o Insert)
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
    router.push({ name: 'admin-products' }) // Redirige a la lista de productos
  } catch (error) {
    errorMsg.value = `Error al guardar: ${error.message}`
    toast.error(errorMsg.value)
  } finally {
    saving.value = false
    cleanupPreviews() // Limpia previsualizaciones después del intento de guardar
    imageFileInputKey.value = Date.now() // Resetea el input de archivo
    selectedImageFiles.value = [] // Limpia los archivos seleccionados
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
  cleanupPreviews() // Limpia previsualizaciones al destruir el componente
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
            <input type="radio" id="typeFixed" value="fixed" v-model="discount_type" />
            <label for="typeFixed">Precio Fijo de Oferta</label>
            <input type="radio" id="typePercentage" value="percentage" v-model="discount_type" />
            <label for="typePercentage">Descuento por Porcentaje</label>
          </div>

          <div v-if="discount_type === 'fixed'" class="form-group">
            <label for="productOfferPrice">Precio de Oferta Fijo:</label>
            <input
              type="number"
              id="productOfferPrice"
              v-model="formData.offer_price"
              min="0"
              step="any"
            />
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
          >Puedes seleccionar varias imágenes. Las nuevas se añadirán/reemplazarán las
          seleccionadas.</small
        >
      </div>

      <div
        v-if="formData.image_urls.length > 0 || newImagePreviews.length > 0"
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
            v-for="(previewUrl, index) in newImagePreviews"
            :key="`new-${index}`"
            class="img-preview new"
          >
            <img :src="previewUrl" :alt="selectedImageFiles[index]?.name || 'Nueva imagen'" />
          </div>
        </div>
      </div>

      <div class="form-group checkbox-group">
        <input type="checkbox" id="isCustomizable" v-model="formData.is_customizable" />
        <label for="isCustomizable">Producto Personalizable</label>
        <small class="tooltip"
          >(?)<span class="tooltip-text"
            >Si se marca, aparecerá la opción para que el cliente suba sus archivos.</span
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
/* Estilos generales del formulario y sus elementos */
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
  font-weight: bold;
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

/* Estilos específicos para integrar Quill */
.form-group :deep(.ql-toolbar) {
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  border-bottom: none; /* Evita doble borde */
}
.form-group :deep(.ql-container) {
  font-size: 1rem;
  min-height: 150px; /* Altura mínima */
  border: 1px solid #ccc; /* Asegura el borde */
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}
.form-group :deep(.ql-editor) {
  padding: 12px; /* Coincide con el padding de inputs */
  background-color: white; /* Fondo blanco */
  min-height: 150px; /* Altura mínima del área de escritura */
}

/* Grilla para precio y stock, y fechas de descuento */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* Checkboxes */
.checkbox-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}
.checkbox-group input[type='checkbox'] {
  width: 18px;
  height: 18px;
}
.checkbox-group label {
  font-weight: normal;
  margin-bottom: 0;
}

/* Acciones del formulario (botones) */
.form-actions {
  margin-top: 30px;
  text-align: right;
  border-top: 1px solid #eee; /* Separador */
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
  background-color: var(--brand-pink); /* Color de marca */
  color: white;
}
.btn-save:hover {
  background-color: #d81b60; /* Rosa más oscuro */
}
.btn-cancel {
  background-color: #6c757d;
  color: white;
}
.btn-cancel:hover {
  background-color: #5a6268;
}
.btn:disabled,
.btn.disabled {
  /* Clase añadida para el router-link */
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}

/* Previsualización de imágenes */
.image-preview-container {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px dashed #ccc; /* Separador */
}
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}
.img-preview {
  position: relative;
  width: 120px; /* Previsualización más grande */
  height: 120px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background-color: #eee; /* Fondo de placeholder */
}
.img-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block; /* Evita espacio extra */
}
.img-preview.new::before {
  /* Etiqueta "Nueva" */
  content: 'Nueva';
  position: absolute;
  top: 0;
  right: 0;
  background-color: #28a745;
  color: white;
  padding: 3px 6px;
  font-size: 0.75em;
  border-bottom-left-radius: 4px;
  z-index: 5;
}
.remove-image-btn {
  /* Botón para borrar imágenes existentes */
  position: absolute;
  top: 5px;
  right: 5px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background-color: rgba(216, 27, 96, 0.8); /* Rosa semitransparente */
  color: white;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  line-height: 1;
  transition: background-color 0.2s ease;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); /* Sombra sutil */
}
.remove-image-btn:hover {
  background-color: rgba(216, 27, 96, 1); /* Opaco al pasar el mouse */
}

/* Sección de descuentos */
.discount-fieldset {
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 20px;
  margin: 30px 0;
  background-color: #fdfdfd; /* Ligeramente diferente del fondo principal */
}
.discount-fieldset legend {
  font-weight: bold;
  padding: 0 10px;
  font-size: 1.1em;
}
.discount-options {
  margin-top: 20px;
}
.discount-type-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 15px 25px; /* Espacio vertical y horizontal */
  margin-bottom: 20px;
  align-items: center;
}
.discount-type-selector input[type='radio'] {
  width: auto;
  margin-right: 5px;
}
.discount-type-selector label {
  font-weight: normal;
  cursor: pointer;
}
hr {
  /* Separador dentro de descuentos */
  border: none;
  border-top: 1px solid #eee;
  margin: 25px 0;
}

/* Tooltip (icono '?') */
.tooltip {
  position: relative;
  cursor: help;
  display: inline-block;
  background-color: #90a4ae; /* Color grisáceo */
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
  background-color: #37474f; /* Tooltip más oscuro */
  color: #fff;
  text-align: left; /* Mejor para texto largo */
  border-radius: 6px;
  padding: 10px;
  position: absolute;
  z-index: 100; /* Asegura visibilidad */
  bottom: 135%; /* Posición arriba */
  left: 50%;
  margin-left: -110px; /* Centrado */
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

/* Indicadores de carga y error */
.loading-indicator,
.error-message {
  padding: 15px;
  text-align: center;
  border-radius: 5px;
  margin: 20px 0;
}
.loading-indicator {
  background-color: #e3f2fd; /* Azul claro */
  color: #1e88e5;
}
.error-message {
  background-color: #ffebee; /* Rojo claro */
  color: #c62828;
  font-weight: 500;
}

/* Ajustes responsivos */
@media (max-width: 600px) {
  .form-grid {
    grid-template-columns: 1fr; /* Una columna en pantallas pequeñas */
  }
  .admin-product-form {
    padding: 15px; /* Menos padding en móvil */
  }
  .discount-type-selector {
    gap: 10px; /* Menos espacio en selector de descuento */
  }
  .form-actions {
    text-align: center;
    display: flex;
    flex-direction: column; /* Botones uno debajo del otro */
    gap: 10px;
  }
  .btn {
    margin-left: 0; /* Quita margen izquierdo en móvil */
    width: 100%; /* Botones ocupan todo el ancho */
  }
}
</style>
