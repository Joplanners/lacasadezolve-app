<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { RouterLink, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const overlayImages = ref([])
const loading = ref(true)
const errorMsg = ref('')
const deletingId = ref(null)

function getFullImageUrl(r2Key) {
  if (!r2Key) return ''
  const R2_PUBLIC_BASE_URL = 'https://pub-48e6b80b718c43a99a9b98163de9920c.r2.dev'
  if (r2Key.startsWith('http://') || r2Key.startsWith('https://')) {
    return r2Key
  }
  const baseUrlEndsWithSlash = R2_PUBLIC_BASE_URL.endsWith('/')
  const keyStartsWithSlash = r2Key.startsWith('/')
  if (baseUrlEndsWithSlash && keyStartsWithSlash) {
    return `${R2_PUBLIC_BASE_URL}${r2Key.substring(1)}`
  }
  if (!baseUrlEndsWithSlash && !keyStartsWithSlash) {
    return `${R2_PUBLIC_BASE_URL}/${r2Key}`
  }
  return `${R2_PUBLIC_BASE_URL}${r2Key}`
}
async function fetchOverlayImages() {
  loading.value = true
  errorMsg.value = ''
  overlayImages.value = []
  try {
    const { data, error } = await supabase.rpc('get_overlay_images_with_details')
    if (error) {
      throw error
    }
    overlayImages.value = data || []
  } catch (error) {
    const fetchErrText = `Error al cargar Fotos Mágicas: ${error.details || error.message || 'Error inesperado en RPC.'}`
    errorMsg.value = fetchErrText
    toast.error(fetchErrText)
  } finally {
    loading.value = false
  }
}
async function deleteOverlayImage(item) {
  if (!item || !item.id || deletingId.value) return
  if (
    !confirm(
      `¿Estás seguro de borrar la Foto Mágica "${item.image_name}" (ID: ${item.id})? Esta acción no se puede deshacer.`,
    )
  ) {
    return
  }
  deletingId.value = item.id
  errorMsg.value = ''
  try {
    const { error } = await supabase.from('overlay_images').delete().eq('id', item.id)
    if (error) throw error
    overlayImages.value = overlayImages.value.filter((oi) => oi.id !== item.id)
    toast.success(`Foto Mágica "${item.image_name}" eliminada.`)
  } catch (error) {
    let deleteErrorText = `Error al borrar Foto Mágica: ${error.message}`
    errorMsg.value = deleteErrorText
    toast.error(deleteErrorText)
  } finally {
    deletingId.value = null
  }
}
function truncateText(text, maxLength = 25) {
  // MaxLength reducido para tarjetas
  if (!text) return '-'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
function testOverlayPhoto(overlayId) {
  if (!overlayId) {
    toast.error('No se puede probar la foto: ID de overlay no válido.')
    return
  }
  router.push({ name: 'overlay-photo-capture', params: { overlayId: overlayId } })
}
onMounted(() => {
  fetchOverlayImages()
})
</script>

<template>
  <div class="admin-overlay-image-list">
    <div class="header-actions">
      <h3>Gestión de Fotos Mágicas</h3>
      <router-link :to="{ name: 'admin-overlay-image-new' }" class="btn btn-add"
        >+ Añadir Nueva Foto Mágica</router-link
      >
    </div>
    <div v-if="loading" class="loading-indicator"><p>Cargando lista...</p></div>
    <div v-if="errorMsg && !loading" class="error-message">
      <p>{{ errorMsg }}</p>
    </div>
    <div v-if="!loading && !errorMsg">
      <p v-if="overlayImages.length === 0" class="no-items-message">
        No hay Fotos Mágicas creadas todavía.
      </p>
      <div v-else class="items-list-container">
        <div v-for="item in overlayImages" :key="item.id" class="item-card">
          <div class="item-card-content">
            <div class="thumbnail-img-wrapper">
              <a
                :href="getFullImageUrl(item.r2_key)"
                target="_blank"
                rel="noopener noreferrer"
                v-if="item.r2_key"
              >
                <img
                  :src="getFullImageUrl(item.r2_key)"
                  :alt="item.image_name"
                  class="thumbnail-img"
                  @error="
                    (e) => {
                      e.target.style.opacity = '0.5'
                      e.target.parentElement.title = 'Error al cargar imagen'
                    }
                  "
                />
              </a>
              <span v-else class="thumbnail-placeholder">-</span>
            </div>
            <dt>Nombre:</dt>
            <dd :title="item.image_name">{{ truncateText(item.image_name) }}</dd>
            <dt>Visibilidad:</dt>
            <dd>{{ item.is_public ? 'Pública' : 'Privada' }}</dd>
            <dt>Asignada a:</dt>
            <dd>
              <span v-if="item.is_public">-</span>
              <span v-else :title="item.target_user_email || item.target_user_id">{{
                item.target_user_email
                  ? truncateText(item.target_user_email, 18)
                  : item.target_user_id
                    ? 'ID: ...' + item.target_user_id.slice(-6)
                    : '-'
              }}</span>
            </dd>
            <dt>Subida por:</dt>
            <dd :title="item.uploader_user_email || item.uploader_user_id">
              {{
                item.uploader_user_email
                  ? truncateText(item.uploader_user_email, 18)
                  : item.uploader_user_id
                    ? 'ID: ...' + item.uploader_user_id.slice(-6)
                    : '-'
              }}
            </dd>
            <dt>Creada en:</dt>
            <dd>
              {{ item.created_at ? new Date(item.created_at).toLocaleDateString('es-CL') : '-' }}
            </dd>
          </div>
          <div class="item-card-actions">
            <router-link
              :to="{ name: 'admin-overlay-image-edit', params: { id: item.id } }"
              class="btn btn-edit"
              >Editar</router-link
            >
            <button
              @click="deleteOverlayImage(item)"
              class="btn btn-delete"
              :disabled="deletingId === item.id"
            >
              {{ deletingId === item.id ? 'Borrando...' : 'Borrar' }}
            </button>
            <button
              @click="testOverlayPhoto(item.id)"
              class="btn btn-test-photo"
              title="Probar esta Foto Mágica"
            >
              📸 Probar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-overlay-image-list {
  padding: 20px;
}
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}
.header-actions h3 {
  margin: 0;
  text-align: left;
  flex-grow: 1;
}
.header-actions .btn-add {
  flex-shrink: 0;
  padding: 8px 15px;
  font-size: 0.9em;
}
.loading-indicator p,
.no-items-message {
  font-style: italic;
  color: #555;
  padding: 20px 10px;
  text-align: center;
  background-color: #f9f9f9;
  border-radius: 4px;
  margin-top: 15px;
}
.error-message {
  color: red;
  background-color: #ffebeb;
  border: 1px solid red;
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 4px;
  font-size: 0.9em;
}
.error-message p {
  margin: 0;
}
.items-list-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 15px;
  justify-content: flex-start;
}
.item-card {
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  width: 100%;
  transition: box-shadow 0.2s ease-in-out;
}
.item-card:hover {
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
}
.item-card-content {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 12px;
  align-items: center;
  font-size: 0.875em;
  margin-bottom: 15px;
  flex-grow: 1;
}
.item-card-content dt {
  font-weight: 600;
  color: #444;
  text-align: right;
  white-space: nowrap;
}
.item-card-content dd {
  margin: 0;
  word-break: break-word;
  text-align: left;
  color: #666;
  min-width: 0;
}
.thumbnail-img-wrapper {
  grid-column: 1 / -1;
  text-align: center;
  margin-bottom: 12px;
  background-color: #f7f7f7;
  padding: 10px;
  border-radius: 4px;
}
.thumbnail-img {
  max-width: 120px;
  max-height: 120px;
  width: auto;
  height: auto;
  object-fit: contain;
  border: 1px solid #eee;
  border-radius: 4px;
  display: inline-block;
}
.thumbnail-placeholder {
  display: inline-block;
  width: 120px;
  height: 120px;
  line-height: 120px;
  text-align: center;
  background-color: #e9e9e9;
  color: #aaa;
  border-radius: 4px;
  font-style: italic;
}
.item-card-actions {
  margin-top: auto;
  padding-top: 15px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.8em;
  text-align: center;
  transition: background-color 0.2s ease;
  font-weight: 500;
  line-height: 1.5;
}
.btn-add {
  background-color: #28a745;
  color: #fff !important;
}
.btn-add:hover {
  background-color: #218838;
}
.btn-edit {
  background-color: #ffc107;
  color: #333 !important;
}
.btn-edit:hover {
  background-color: #e0a800;
}
.btn-delete {
  background-color: #dc3545;
  color: #fff !important;
}
.btn-delete:hover:not(:disabled) {
  background-color: #c82333;
}
.btn-delete:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}
.btn-test-photo {
  background-color: #17a2b8;
  color: #fff !important;
}
.btn-test-photo:hover {
  background-color: #138496;
}
@media (min-width: 576px) {
  .item-card {
    width: calc(50% - 10px);
  }
}
@media (min-width: 768px) {
  .header-actions .btn-add {
    width: auto;
  }
  .item-card-content {
    font-size: 0.9em;
  }
  .btn {
    font-size: 0.85em;
  }
}
@media (min-width: 992px) {
  .item-card {
    width: calc(33.333% - 14px);
  }
}
@media (min-width: 1200px) {
  .item-card {
    width: calc(25% - 15px);
  }
}
</style>
