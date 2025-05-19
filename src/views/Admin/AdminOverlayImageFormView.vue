<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from 'vue-toastification'
import { debounce } from 'lodash-es'

const props = defineProps({ isEditMode: { type: Boolean, default: false } })
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const formData = ref({
  id: null,
  image_name: '',
  description: '',
  r2_key: '',
  is_public: true,
  target_user_id: null,
  uploader_user_id: null,
})
const selectedImageFile = ref(null)
const imageFileInputKey = ref(Date.now())
const userSearchTerm = ref('')
const userSearchResults = ref([])
const loadingUsers = ref(false)
const assignedUser = ref(null)
const showUserDropdown = ref(false)
const loadingData = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const formTitle = computed(() =>
  props.isEditMode ? 'Editar Foto Mágica' : 'Añadir Nueva Foto Mágica',
)

const handleImageFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    if (file.type.startsWith('image/png') || file.type.startsWith('image/jpeg')) {
      selectedImageFile.value = file
    } else {
      toast.error('Por favor, selecciona un archivo PNG o JPG.')
      selectedImageFile.value = null
      imageFileInputKey.value = Date.now()
    }
  } else {
    selectedImageFile.value = null
  }
}

async function fetchOverlayImageData(overlayImageId) {
  loadingData.value = true
  errorMsg.value = ''
  assignedUser.value = null
  userSearchTerm.value = ''
  try {
    const { data, error } = await supabase
      .from('overlay_images')
      .select('*')
      .eq('id', overlayImageId)
      .single()
    if (error) throw error
    if (!data) throw new Error('Foto Mágica no encontrada')
    formData.value.id = data.id
    formData.value.image_name = data.image_name
    formData.value.description = data.description || ''
    formData.value.r2_key = data.r2_key
    formData.value.is_public = data.is_public
    formData.value.target_user_id = data.target_user_id
    formData.value.uploader_user_id = data.uploader_user_id
    if (!formData.value.is_public && formData.value.target_user_id) {
      const { data: ownerResults, error: ownerError } = await supabase.rpc(
        'search_users_for_admin',
        { search_term: formData.value.target_user_id },
      )
      if (ownerError) {
        toast.error(`Error buscando usuario asignado: ${ownerError.message}`)
        userSearchTerm.value = `ID Usuario: ${formData.value.target_user_id} (Error)`
      } else if (ownerResults && ownerResults.length === 1) {
        const ownerData = ownerResults[0]
        assignedUser.value = {
          id: ownerData.user_id,
          email: ownerData.user_email,
          name:
            `${ownerData.user_first_name || ''} ${ownerData.user_last_name || ''}`.trim() ||
            ownerData.user_email,
        }
        userSearchTerm.value = assignedUser.value.email || assignedUser.value.id
      } else {
        userSearchTerm.value = `ID Usuario: ${formData.value.target_user_id} (No encontrado)`
      }
    }
  } catch (error) {
    errorMsg.value = 'Error al cargar datos de la Foto Mágica.'
    toast.error(errorMsg.value)
  } finally {
    loadingData.value = false
  }
}

const searchUsers = async () => {
  if (
    assignedUser.value &&
    userSearchTerm.value === (assignedUser.value.email || assignedUser.value.id)
  ) {
    userSearchResults.value = []
    showUserDropdown.value = false
    return
  }
  if (!userSearchTerm.value || userSearchTerm.value.length < 2) {
    userSearchResults.value = []
    showUserDropdown.value = false
    if (assignedUser.value) {
      assignedUser.value = null
      formData.value.target_user_id = null
    }
    return
  }
  loadingUsers.value = true
  try {
    const { data, error } = await supabase.rpc('search_users_for_admin', {
      search_term: userSearchTerm.value,
    })
    if (error) throw error
    userSearchResults.value = data || []
    showUserDropdown.value = true
  } catch (error) {
    toast.error('Error al buscar usuarios.')
    userSearchResults.value = []
    showUserDropdown.value = true
  } finally {
    loadingUsers.value = false
  }
}
const debouncedSearchUsers = debounce(searchUsers, 400)

const selectUser = (user) => {
  assignedUser.value = {
    id: user.user_id,
    email: user.user_email,
    name: `${user.user_first_name || ''} ${user.user_last_name || ''}`.trim() || user.user_email,
  }
  formData.value.target_user_id = user.user_id
  userSearchTerm.value = assignedUser.value.email || assignedUser.value.id
  userSearchResults.value = []
  showUserDropdown.value = false
}
const handleClickOutsideUserSearch = (event) => {
  const searchContainer = document.getElementById('overlay-user-search-container')
  if (showUserDropdown.value && searchContainer && !searchContainer.contains(event.target)) {
    showUserDropdown.value = false
  }
}
const clearAssignedUser = () => {
  assignedUser.value = null
  formData.value.target_user_id = null
  userSearchTerm.value = ''
}

async function saveOverlayImage() {
  saving.value = true
  errorMsg.value = ''
  if (!formData.value.image_name.trim()) {
    toast.error('El nombre de la Foto Mágica es obligatorio.')
    saving.value = false
    return
  }
  if (!props.isEditMode && !selectedImageFile.value) {
    toast.error('Debes seleccionar un archivo de imagen (PNG o JPG).')
    saving.value = false
    return
  }
  if (!formData.value.is_public && !assignedUser.value && !formData.value.target_user_id) {
    toast.error('Si la foto no es pública, debes asignarla a un usuario específico.')
    saving.value = false
    return
  }
  let finalR2Key = props.isEditMode ? formData.value.r2_key : null
  let publicFileUrl = ''
  try {
    if (selectedImageFile.value) {
      errorMsg.value = `Subiendo ${selectedImageFile.value.name}...`
      const workerUrl = 'https://r2-presigner-worker.jodiabunos.workers.dev'
      const fd = new FormData()
      fd.append('file', selectedImageFile.value, selectedImageFile.value.name)
      const response = await fetch(workerUrl, { method: 'POST', body: fd })
      if (!response.ok) {
        let workerErrorMsg = `Error del Worker (${response.status})`
        try {
          const errJson = await response.json()
          workerErrorMsg += `: ${errJson.error || response.statusText}`
        } catch (e) {
          /* ignore */
        }
        throw new Error(workerErrorMsg)
      }
      const result = await response.json()
      if (!result || !result.publicUrl) throw new Error('El Worker no devolvió una URL pública.')
      publicFileUrl = result.publicUrl
      try {
        const urlObject = new URL(publicFileUrl)
        let path = urlObject.pathname
        if (path.startsWith('/')) {
          path = path.substring(1)
        }
        finalR2Key = path
        if (!finalR2Key) throw new Error('No se pudo extraer la R2 Key de la URL.')
      } catch (e) {
        throw new Error(
          `URL devuelta por el worker (${publicFileUrl}) no es válida o no se pudo extraer la R2 key: ${e.message}`,
        )
      }
      toast.info(`Imagen ${selectedImageFile.value.name} subida.`)
      errorMsg.value = ''
    }
    if (!finalR2Key && !props.isEditMode) {
      throw new Error('No se pudo obtener la clave R2 para la imagen.')
    }
    const dataToSave = {
      image_name: formData.value.image_name.trim(),
      description: formData.value.description.trim() || null,
      r2_key: finalR2Key,
      is_public: formData.value.is_public,
      target_user_id: formData.value.is_public
        ? null
        : assignedUser.value?.id || formData.value.target_user_id,
      uploader_user_id: authStore.user?.id,
    }
    if (props.isEditMode) {
      delete dataToSave.uploader_user_id
      if (!selectedImageFile.value) {
        delete dataToSave.r2_key
      }
      const { error } = await supabase
        .from('overlay_images')
        .update(dataToSave)
        .eq('id', formData.value.id)
      if (error) throw error
      toast.success('Foto Mágica actualizada con éxito!')
    } else {
      if (!dataToSave.uploader_user_id) throw new Error('No se pudo identificar al usuario admin.')
      const { error } = await supabase.from('overlay_images').insert(dataToSave)
      if (error) throw error
      toast.success('Nueva Foto Mágica añadida con éxito!')
    }
    router.push({ name: 'admin-overlay-images' })
  } catch (error) {
    errorMsg.value = `Error: ${error.message}`
    toast.error(errorMsg.value)
  } finally {
    saving.value = false
    if (selectedImageFile.value) {
      selectedImageFile.value = null
      imageFileInputKey.value = Date.now()
    }
  }
}
onMounted(() => {
  if (props.isEditMode) {
    const overlayImageId = route.params.id
    if (overlayImageId) {
      fetchOverlayImageData(overlayImageId)
    } else {
      errorMsg.value = 'Modo edición pero no se proveyó ID.'
      toast.error(errorMsg.value)
    }
  }
  document.addEventListener('click', handleClickOutsideUserSearch)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutsideUserSearch)
})
</script>

<template>
  <div class="admin-overlay-image-form">
    <h3>{{ formTitle }}</h3>
    <div v-if="loadingData" class="loading-indicator"><p>Cargando datos...</p></div>
    <div v-if="errorMsg && !saving" class="error-message">
      <p>{{ errorMsg }}</p>
    </div>
    <div v-if="saving && errorMsg.startsWith('Subiendo')" class="saving-message">
      <p>{{ errorMsg }}</p>
    </div>
    <form v-if="!loadingData" @submit.prevent="saveOverlayImage">
      <div class="form-group">
        <label for="overlayName">Nombre Foto Mágica:</label>
        <input type="text" id="overlayName" v-model="formData.image_name" required />
        <small>Ej: "Gatito con sombrero", "Marco floral para Mamá (Privado)"</small>
      </div>
      <div class="form-group">
        <label for="overlayDescription">Descripción (Opcional):</label>
        <textarea id="overlayDescription" v-model="formData.description" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label for="overlayImageFile">Archivo de Imagen (PNG o JPG):</label>
        <input
          type="file"
          id="overlayImageFile"
          @change="handleImageFileChange"
          accept="image/png, image/jpeg"
          :key="imageFileInputKey"
          :required="!props.isEditMode"
        />
        <small v-if="props.isEditMode && formData.r2_key"
          >Archivo actual en R2: {{ formData.r2_key }}. Selecciona uno nuevo para reemplazar.</small
        >
        <p v-if="selectedImageFile" class="file-info">
          Nuevo archivo: {{ selectedImageFile.name }} ({{
            (selectedImageFile.size / 1024).toFixed(1)
          }}
          KB)
        </p>
      </div>
      <div class="form-group checkbox-group">
        <input type="checkbox" id="isPublicOverlay" v-model="formData.is_public" />
        <label for="isPublicOverlay">¿Es Pública?</label>
        <small>Si está marcado, cualquier usuario podrá usarla. Si no, asigna un usuario.</small>
      </div>
      <div class="form-group" id="overlay-user-search-container" v-if="!formData.is_public">
        <label for="userSearchOverlay">Asignar a Usuario Específico:</label>
        <input
          type="search"
          id="userSearchOverlay"
          v-model="userSearchTerm"
          @input="debouncedSearchUsers"
          @focus="showUserDropdown = true"
          placeholder="Buscar por email o nombre..."
          autocomplete="off"
        />
        <ul
          v-if="
            showUserDropdown &&
            (userSearchResults.length > 0 || (userSearchTerm.length >= 2 && !loadingUsers))
          "
          class="user-dropdown"
        >
          <li v-if="loadingUsers">Buscando...</li>
          <li
            v-for="userItem in userSearchResults"
            :key="userItem.user_id"
            @click="selectUser(userItem)"
          >
            {{ userItem.user_first_name || '' }} {{ userItem.user_last_name || '' }} ({{
              userItem.user_email
            }})
          </li>
          <li v-if="!loadingUsers && userSearchResults.length === 0 && userSearchTerm.length >= 2">
            No se encontraron usuarios.
          </li>
        </ul>
        <p v-if="assignedUser" class="assigned-user-info">
          Asignado a: {{ assignedUser.name }} ({{ assignedUser.email }})
          <button
            type="button"
            @click="clearAssignedUser"
            class="btn-clear-user"
            title="Quitar Usuario"
          >
            X
          </button>
        </p>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-save" :disabled="saving">
          {{
            saving ? 'Guardando...' : props.isEditMode ? 'Guardar Cambios' : 'Añadir Foto Mágica'
          }}
        </button>
        <router-link
          :to="{ name: 'admin-overlay-images' }"
          class="btn btn-cancel"
          :class="{ disabled: saving }"
          >Cancelar</router-link
        >
      </div>
    </form>
  </div>
</template>

<style scoped>
.admin-overlay-image-form {
  max-width: 600px;
  margin: 20px auto;
  padding: 25px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: #f9f9f9;
}
h3 {
  text-align: center;
  margin-bottom: 20px;
}
.loading-indicator p {
  font-style: italic;
  color: #555;
  padding: 10px;
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
.saving-message {
  color: #007bff;
  background-color: #e7f3ff;
  border: 1px solid #007bff;
  padding: 10px;
  margin: 15px 0;
  border-radius: 4px;
  font-size: 0.9em;
  text-align: center;
  font-style: italic;
}
.saving-message p {
  margin: 0;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 700;
}
.form-group input[type='text'],
.form-group input[type='file'],
.form-group input[type='search'],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
.form-group input[type='file'] {
  padding: 5px;
}
.form-group small {
  font-size: 0.8em;
  color: #666;
  display: block;
  margin-top: 3px;
}
.form-actions {
  margin-top: 25px;
  text-align: right;
}
.btn {
  display: inline-block;
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.9em;
  margin-left: 10px;
  vertical-align: middle;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}
.btn-save {
  background-color: #007bff;
  color: #fff !important;
}
.btn-save:hover:not(:disabled) {
  background-color: #0056b3;
}
.btn-save:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}
.btn-cancel {
  background-color: #6c757d;
  color: #fff !important;
}
.btn-cancel:hover:not(:disabled) {
  background-color: #5a6268;
}
.btn-cancel.disabled {
  background-color: #ccc;
  opacity: 0.7;
  cursor: not-allowed;
  pointer-events: none;
}
#overlay-user-search-container {
  position: relative;
}
.user-dropdown {
  position: absolute;
  background-color: #fff;
  border: 1px solid #ccc;
  border-top: none;
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  max-height: 150px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.user-dropdown li {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.9em;
}
.user-dropdown li:hover {
  background-color: #f0f0f0;
}
.assigned-user-info {
  background-color: #e9ecef;
  padding: 5px 10px;
  margin-top: 8px;
  border-radius: 4px;
  font-size: 0.9em;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.btn-clear-user {
  background: 0 0;
  border: none;
  color: red;
  cursor: pointer;
  font-size: 1.1em;
  padding: 0 5px;
  line-height: 1;
}
.checkbox-group label {
  display: inline-block;
  margin-left: 5px;
  font-weight: 400;
  vertical-align: middle;
}
.checkbox-group input[type='checkbox'] {
  vertical-align: middle;
}
.file-info {
  font-size: 0.85em;
  color: #333;
  margin-top: 5px;
  font-style: italic;
  background-color: #f0f0f0;
  padding: 5px;
  border-radius: 3px;
}
@media (max-width: 768px) {
  .admin-overlay-image-form {
    margin: 10px;
    padding: 15px;
  }
  .form-group input[type='text'],
  .form-group input[type='file'],
  .form-group input[type='search'],
  .form-group textarea,
  .form-group select {
    font-size: 1rem;
  }
  .form-actions {
    text-align: center;
  }
  .form-actions .btn {
    display: block;
    width: 100%;
    margin-left: 0;
    margin-bottom: 10px;
  }
  .form-actions .btn:last-child {
    margin-bottom: 0;
  }
  .user-dropdown {
    max-width: calc(100vw - 30px);
  }
}
</style>
