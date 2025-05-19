<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const router = useRouter()
const contents = ref([])
const loading = ref(true)
const errorMsg = ref('')
const deleting = ref(null)
const toast = useToast()

const R2_PUBLIC_BASE_URL = 'https://pub-48e6b80b718c43a99a9b98163de9920c.r2.dev'

function getFullContentUrl(contentKeyOrUrl) {
  if (!contentKeyOrUrl) return ''
  if (contentKeyOrUrl.startsWith('http://') || contentKeyOrUrl.startsWith('https://')) {
    return contentKeyOrUrl
  }
  const baseUrlEndsWithSlash = R2_PUBLIC_BASE_URL.endsWith('/')
  const keyStartsWithSlash = contentKeyOrUrl.startsWith('/')
  if (baseUrlEndsWithSlash && keyStartsWithSlash) {
    return `${R2_PUBLIC_BASE_URL}${contentKeyOrUrl.substring(1)}`
  }
  if (!baseUrlEndsWithSlash && !keyStartsWithSlash) {
    return `${R2_PUBLIC_BASE_URL}/${contentKeyOrUrl}`
  }
  return `${R2_PUBLIC_BASE_URL}${contentKeyOrUrl}`
}

async function fetchContents() {
  loading.value = true
  errorMsg.value = ''
  contents.value = []
  try {
    const { data, error } = await supabase
      .from('contents')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    contents.value = data || []
  } catch (error) {
    const fetchErrText = `Error al cargar contenidos: ${error.message || 'Error inesperado.'}`
    errorMsg.value = fetchErrText
    toast.error(fetchErrText)
  } finally {
    loading.value = false
  }
}

async function deleteContent(contentId) {
  if (!contentId || deleting.value) return
  if (
    !confirm(
      `¿Estás seguro de borrar este contenido (ID: ${contentId})? \n¡ATENCIÓN: Si algún marcador está usando este contenido, dejará de funcionar!`,
    )
  ) {
    return
  }
  deleting.value = contentId
  errorMsg.value = ''
  try {
    const { error } = await supabase.from('contents').delete().eq('id', contentId)
    if (error) throw error
    contents.value = contents.value.filter((content) => content.id !== contentId)
    toast.success(`Contenido ID: ${contentId} eliminado.`)
  } catch (error) {
    let deleteErrorText = ''
    if (error.code === '23503') {
      deleteErrorText =
        'Error: No se puede borrar, este contenido está siendo usado por uno o más marcadores.'
      errorMsg.value = deleteErrorText
    } else {
      deleteErrorText = `Error al borrar contenido: ${error.message}`
    }
    toast.error(deleteErrorText)
  } finally {
    deleting.value = null
  }
}

function truncateUrl(url, maxLength = 40) {
  if (!url) return ''
  const fullUrl = getFullContentUrl(url) // Obtener URL completa para truncar si es necesario
  if (fullUrl.length <= maxLength) return fullUrl
  const startLength = Math.floor((maxLength - 3) / 2)
  const endLength = maxLength - 3 - startLength
  return fullUrl.substring(0, startLength) + '...' + fullUrl.substring(fullUrl.length - endLength)
}

onMounted(() => {
  fetchContents()
})
</script>

<template>
  <div class="admin-content-list">
    <h3>Gestión de Contenidos</h3>

    <div class="add-button-container">
      <router-link :to="{ name: 'admin-content-new' }" class="btn btn-add">
        + Añadir Nuevo Contenido
      </router-link>
    </div>

    <div v-if="loading" class="loading-indicator"><p>Cargando contenidos...</p></div>
    <div v-if="errorMsg && !loading" class="error-message">
      <p>{{ errorMsg }}</p>
    </div>

    <div v-if="!loading">
      <p v-if="contents.length === 0" class="no-items-message">
        No hay contenidos creados todavía.
      </p>
      <table v-else class="contents-table">
        <thead>
          <tr>
            <th class="thumbnail-header-cell">Miniatura</th>
            <th>Nombre Contenido</th>
            <th>Tipo</th>
            <th>URL (R2)</th>
            <th>Creado en</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="content in contents" :key="content.id">
            <td class="thumbnail-cell">
              <template v-if="content.type === 'image' && content.content_url">
                <a
                  :href="getFullContentUrl(content.content_url)"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="content.name || 'Vista previa'"
                >
                  <img
                    :src="getFullContentUrl(content.content_url)"
                    :alt="content.name || 'Contenido'"
                    class="thumbnail-img"
                    @error="
                      (e) => {
                        e.target.style.opacity = '0.5'
                        e.target.parentElement.title = 'Error al cargar imagen'
                      }
                    "
                  />
                </a>
              </template>
              <template v-else-if="content.type === 'video' && content.content_url">
                <span class="video-icon" title="Contenido de video">🎬</span>
              </template>
              <span v-else>-</span>
            </td>
            <td>{{ content.name || '-' }}</td>
            <td>{{ content.type || '-' }}</td>
            <td class="url-cell">
              <a
                :href="getFullContentUrl(content.content_url)"
                target="_blank"
                rel="noopener noreferrer"
                :title="getFullContentUrl(content.content_url)"
              >
                {{ truncateUrl(content.content_url) || '-' }}
              </a>
            </td>
            <td>{{ content.created_at ? new Date(content.created_at).toLocaleString() : '-' }}</td>
            <td>
              <router-link
                :to="{ name: 'admin-content-edit', params: { id: content.id } }"
                class="btn btn-edit"
              >
                Editar
              </router-link>
              <button
                @click="deleteContent(content.id)"
                class="btn btn-delete"
                :disabled="deleting === content.id"
              >
                {{ deleting === content.id ? 'Borrando...' : 'Borrar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.admin-content-list {
  padding: 15px;
}
.add-button-container {
  margin-bottom: 15px;
  text-align: right;
}
.loading-indicator p,
.no-items-message {
  font-style: italic;
  color: #555;
  padding: 10px;
  text-align: center;
}
.error-message {
  color: red;
  font-weight: bold;
  border: 1px solid red;
  background-color: #ffebeb;
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 4px;
  font-size: 0.9em;
}
.error-message p {
  margin: 0;
}

.contents-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  table-layout: fixed;
}
.contents-table th,
.contents-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
  font-size: 0.9em;
  vertical-align: middle;
  word-wrap: break-word;
}
.contents-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}
.contents-table tr:nth-child(even) {
  background-color: #f9f9f9;
}
.contents-table tr:hover {
  background-color: #e6f7ff;
}

.thumbnail-header-cell {
  width: 100px;
}
.thumbnail-cell {
  width: 100px;
  text-align: center;
}
.thumbnail-img {
  max-width: 70px;
  max-height: 70px;
  width: auto;
  height: auto;
  object-fit: cover;
  border: 1px solid #eee;
  border-radius: 4px;
  display: block;
  margin: auto;
}
.thumbnail-cell a:hover img {
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
}
.video-icon {
  font-size: 2em;
  line-height: 1;
}

.url-cell {
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.url-cell a {
  color: #007bff;
  text-decoration: none;
}
.url-cell a:hover {
  text-decoration: underline;
}
.contents-table td:first-child + td {
  /* Nombre Contenido */
  width: 25%;
}

.btn {
  display: inline-block;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.85em;
  margin-right: 5px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}
.btn-add {
  background-color: #28a745;
  color: white !important;
}
.btn-add:hover {
  background-color: #218838;
  color: white !important;
}
.btn-edit {
  background-color: #ffc107;
  color: #333 !important;
}
.btn-edit:hover {
  background-color: #e0a800;
  color: #333 !important;
}
.btn-delete {
  background-color: #dc3545;
  color: white !important;
}
.btn-delete:hover:not(:disabled) {
  background-color: #c82333;
}
.btn-delete:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
