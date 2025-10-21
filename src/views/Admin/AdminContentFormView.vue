<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from 'vue-toastification'
import { debounce } from 'lodash-es'

// Props, Route, Router, Toast
const props = defineProps({ isEditMode: { type: Boolean, default: false } })
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// --- Estado del formulario ---
const formData = ref({
  id: null,
  name: '',
  type: '',
  content_url: '',
  user_id: null,
  is_public: true,
})
// --- CAMBIO: De selectedFile (singular) a selectedFiles (plural, array) ---
const selectedFiles = ref([]) // Ahora es un array
const fileInputKey = ref(Date.now())

// --- Estado para Búsqueda de Usuario (sin cambios) ---
const userSearchTerm = ref('')
const userSearchResults = ref([])
const loadingUsers = ref(false)
const assignedUser = ref(null)
const showUserDropdown = ref(false)

// Estado UI
const loadingData = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const formTitle = computed(() => (props.isEditMode ? 'Editar Contenido' : 'Añadir Nuevo Contenido'))
// --- NUEVO ESTADO para progreso de subida múltiple ---
const uploadProgress = ref({ total: 0, current: 0, errors: 0 })

// --- Funciones ---

// --- CAMBIO: handleFileChange ahora maneja múltiples archivos ---
const handleFileChange = (event) => {
  const files = event.target.files
  if (files && files.length > 0) {
    // Convertir FileList a Array y añadir a nuestro estado
    selectedFiles.value = Array.from(files)
    console.log(
      'Archivos seleccionados:',
      selectedFiles.value.map((f) => f.name),
    )
  } else {
    selectedFiles.value = [] // Limpiar si no se seleccionan archivos
  }
}

// --- Función para inferir tipo basado en MIME type ---
const getFileType = (mimeType) => {
  if (!mimeType) return 'other' // Tipo por defecto si no hay MIME type
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('text/')) return 'text' // Añadido para texto
  // Puedes añadir más tipos si es necesario (audio, pdf, etc.)
  return 'other'
}

// --- Función fetchContentData (Sin cambios relevantes para la subida múltiple, solo carga datos para edición) ---
// (El código de fetchContentData permanece igual que en tu versión original)
async function fetchContentData(contentId) {
  loadingData.value = true
  errorMsg.value = ''
  assignedUser.value = null
  userSearchTerm.value = ''
  showUserDropdown.value = false
  try {
    const { data: contentData, error: contentError } = await supabase
      .from('contents')
      .select('*')
      .eq('id', contentId)
      .single()

    if (contentError) throw contentError
    if (!contentData) throw new Error('Contenido no encontrado')

    formData.value.id = contentData.id
    formData.value.name = contentData.name
    formData.value.type = contentData.type?.toLowerCase()
    formData.value.content_url = contentData.content_url
    formData.value.user_id = contentData.user_id
    formData.value.is_public = contentData.is_public === null ? true : contentData.is_public

    if (!formData.value.is_public && formData.value.user_id) {
      console.log('Editando contenido privado, buscando dueño ID:', formData.value.user_id)
      const { data: ownerResults, error: ownerError } = await supabase.rpc(
        'search_users_for_admin',
        { search_term: formData.value.user_id },
      )

      if (ownerError) {
        console.error('Error en llamada RPC search_users_for_admin:', ownerError)
        toast.error(`Error buscando dueño: ${ownerError.message}`)
        userSearchTerm.value = `ID Dueño: ${formData.value.user_id} (Error al buscar)`
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
        console.log('Dueño inicial cargado:', assignedUser.value)
      } else {
        console.warn(
          `Búsqueda de dueño por ID ${formData.value.user_id} devolvió ${ownerResults ? ownerResults.length : 0} resultados.`,
        )
        userSearchTerm.value = `ID Dueño: ${formData.value.user_id} (${ownerResults && ownerResults.length > 0 ? 'Múltiples' : 'No encontrado'})`
        toast.warning('No se pudieron obtener los detalles del dueño asignado.')
      }
    }
  } catch (error) {
    console.error('Error fetching content:', error)
    const fetchErrorText = 'Error al cargar datos del contenido.'
    errorMsg.value = fetchErrorText
    toast.error(fetchErrorText)
  } finally {
    loadingData.value = false
  }
}

// --- Lógica de Búsqueda de Usuarios (sin cambios) ---
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
      formData.value.user_id = null
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
    console.error('Error buscando usuarios:', error)
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
  formData.value.user_id = user.user_id
  userSearchTerm.value = assignedUser.value.email || assignedUser.value.id
  userSearchResults.value = []
  showUserDropdown.value = false
}
const handleClickOutside = (event) => {
  const searchContainer = document.getElementById('user-search-container')
  if (showUserDropdown.value && searchContainer && !searchContainer.contains(event.target)) {
    showUserDropdown.value = false
  }
}

// --- CAMBIO RADICAL: saveContent ahora maneja múltiples archivos o uno solo (en edición) ---
async function saveContent() {
  saving.value = true
  errorMsg.value = ''
  uploadProgress.value = { total: 0, current: 0, errors: 0 } // Reset progress

  // --- CASO 1: MODO EDICIÓN (Un solo archivo/registro) ---
  if (props.isEditMode) {
    // Validación básica para edición
    if (!formData.value.name || !formData.value.type) {
      toast.error('Nombre y tipo son obligatorios en modo edición.')
      saving.value = false
      return
    }
    // Si se seleccionó un NUEVO archivo en modo edición (reemplazo)
    const singleFileToUpload = selectedFiles.value.length > 0 ? selectedFiles.value[0] : null

    let finalUserId = formData.value.is_public
      ? null
      : assignedUser.value?.id || formData.value.user_id || authStore.user?.id || null
    let finalContentUrl = formData.value.content_url // Usar URL existente por defecto

    try {
      // Subir el NUEVO archivo si existe
      if (singleFileToUpload) {
        console.log(`Editando: Preparando para subir reemplazo: ${singleFileToUpload.name}`)
        errorMsg.value = `Subiendo reemplazo ${singleFileToUpload.name}...`
        uploadProgress.value = { total: 1, current: 1, errors: 0 } // Mostrar progreso para uno

        const workerUrl = 'https://r2-presigner-worker.jodiabunos.workers.dev'
        const formDataBody = new FormData()
        formDataBody.append('file', singleFileToUpload, singleFileToUpload.name)

        if (singleFileToUpload.size === 0) throw new Error('Archivo vacío o inválido.')

        const response = await fetch(workerUrl, { method: 'POST', body: formDataBody })
        if (!response.ok) {
          let workerErrorMsg = `Error del Worker (${response.status})`
          try {
            const errJson = await response.json()
            workerErrorMsg += `: ${errJson.error || response.statusText}`
          } catch {
            /* ignore */
          }
          throw new Error(workerErrorMsg)
        }
        const result = await response.json()
        if (!result || !result.publicUrl) throw new Error('El Worker no devolvió una URL pública.')
        finalContentUrl = result.publicUrl // Actualizar URL
        toast.info(`Archivo ${singleFileToUpload.name} subido como reemplazo.`)
        errorMsg.value = ''
      }

      // Actualizar registro en la DB
      if (!finalContentUrl) throw new Error('No hay URL de contenido para guardar.') // Seguridad

      console.log(
        `Actualizando en DB: ID=${formData.value.id}, URL=${finalContentUrl}, UserID=${finalUserId}, Public=${formData.value.is_public}`,
      )
      const contentDataToUpdate = {
        name: formData.value.name,
        type: formData.value.type,
        content_url: finalContentUrl,
        is_public: formData.value.is_public,
        user_id: finalUserId,
      }
      const { error: dbError } = await supabase
        .from('contents')
        .update(contentDataToUpdate)
        .eq('id', formData.value.id)
      if (dbError) throw dbError

      toast.success(`Contenido "${formData.value.name}" actualizado con éxito!`)
      router.push({ name: 'admin-contents' })
    } catch (error) {
      console.error('Error completo en saveContent (Modo Edición):', error)
      const saveErrorText = `Error al actualizar contenido: ${error.message}`
      errorMsg.value = saveErrorText
      toast.error(saveErrorText)
      uploadProgress.value.errors++ // Marcar error en progreso
    } finally {
      saving.value = false
      // Limpiar input si se subió archivo
      if (singleFileToUpload) {
        selectedFiles.value = []
        fileInputKey.value = Date.now()
      }
    }

    // --- CASO 2: MODO CREACIÓN (Posiblemente múltiples archivos) ---
  } else {
    if (selectedFiles.value.length === 0) {
      toast.error('Debes seleccionar al menos un archivo.')
      saving.value = false
      return
    }

    // Determinar visibilidad y dueño (común para todos los archivos del lote)
    let finalUserId = null
    if (!formData.value.is_public) {
      if (assignedUser.value) {
        finalUserId = assignedUser.value.id
      } else {
        finalUserId = authStore.user?.id || null // Asignar al admin actual por defecto
        if (!finalUserId) {
          toast.error('No se pudo determinar el usuario admin para asignar contenido privado.')
          saving.value = false
          return
        }
      }
      console.log(`Lote privado se asignará a UserID: ${finalUserId}`)
    } else {
      console.log('Lote será público, UserID será NULL.')
      finalUserId = null
    }

    // Preparar subida/inserción para cada archivo
    uploadProgress.value.total = selectedFiles.value.length
    uploadProgress.value.current = 0
    uploadProgress.value.errors = 0
    errorMsg.value = `Procesando ${uploadProgress.value.total} archivos...` // Mensaje inicial

    const workerUrl = 'https://r2-presigner-worker.jodiabunos.workers.dev'
    const uploadPromises = selectedFiles.value.map(async (file, index) => {
      uploadProgress.value.current = index + 1 // Actualizar contador UI
      errorMsg.value = `Subiendo ${index + 1}/${uploadProgress.value.total}: ${file.name}...`
      console.log(`Procesando archivo ${index + 1}: ${file.name}`)

      if (file.size === 0) {
        throw new Error(`Archivo "${file.name}" está vacío o es inválido.`)
      }

      // 1. Subir archivo al Worker
      const formDataBody = new FormData()
      formDataBody.append('file', file, file.name)
      const response = await fetch(workerUrl, { method: 'POST', body: formDataBody })

      if (!response.ok) {
        let workerErrorMsg = `Error del Worker (${response.status}) para ${file.name}`
        try {
          const errJson = await response.json()
          workerErrorMsg += `: ${errJson.error || response.statusText}`
        } catch {
          /* ignore */
        }
        throw new Error(workerErrorMsg)
      }
      const result = await response.json()
      if (!result || !result.publicUrl) {
        throw new Error(`El Worker no devolvió URL para ${file.name}.`)
      }
      const fileUrl = result.publicUrl
      const fileType = getFileType(file.type) // Inferir tipo

      console.log(`Archivo ${file.name} subido OK. URL: ${fileUrl}, Tipo: ${fileType}`)

      // 2. Insertar registro en Supabase
      const contentDataToInsert = {
        name: file.name, // Usar nombre del archivo
        type: fileType, // Usar tipo inferido
        content_url: fileUrl,
        is_public: formData.value.is_public,
        user_id: finalUserId,
      }

      console.log(`Insertando en DB para ${file.name}...`)
      const { error: dbError } = await supabase.from('contents').insert(contentDataToInsert)
      if (dbError) {
        throw new Error(`Error DB para ${file.name}: ${dbError.message}`)
      }

      console.log(`Registro para ${file.name} creado con éxito.`)
      return { fileName: file.name, status: 'success' } // Devolver éxito
    })

    // Ejecutar todas las promesas y esperar resultados
    const results = await Promise.allSettled(uploadPromises)

    // Procesar resultados
    let successCount = 0
    let errorCount = 0
    results.forEach((result, index) => {
      const fileName = selectedFiles.value[index].name // Obtener nombre para logs/errores
      if (result.status === 'fulfilled') {
        successCount++
        console.log(`Éxito procesando: ${fileName}`)
      } else {
        errorCount++
        console.error(`Error procesando ${fileName}:`, result.reason?.message || result.reason)
        // Mostrar un toast por cada error individual podría ser mucho, mejor un resumen
      }
    })

    uploadProgress.value.errors = errorCount // Actualizar contador de errores final

    // Mostrar resumen
    if (errorCount === 0) {
      toast.success(`¡${successCount} archivos subidos y guardados con éxito!`)
      router.push({ name: 'admin-contents' }) // Redirigir solo si todo OK
    } else {
      const summaryMsg = `${successCount} archivos procesados correctamente. ${errorCount} archivos fallaron. Revise la consola para detalles.`
      errorMsg.value = summaryMsg // Mostrar error persistente en la UI
      toast.warning(summaryMsg)
      // No redirigir si hubo errores, para que el usuario vea el mensaje/consola
    }

    // Limpiar estado después de procesar
    selectedFiles.value = []
    fileInputKey.value = Date.now() // Resetear input
    saving.value = false
    // Limpiar mensaje de progreso si no hubo errores persistentes
    if (errorCount === 0) {
      errorMsg.value = ''
    }
  }
}

// --- Ciclo de Vida (sin cambios) ---
onMounted(() => {
  if (props.isEditMode) {
    const contentId = route.params.id
    if (contentId) {
      fetchContentData(contentId)
    } else {
      const idError = 'Modo edición activado pero no se encontró ID.'
      errorMsg.value = idError
      toast.error(idError)
    }
  }
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="admin-content-form">
    <h3>{{ formTitle }}</h3>
    <div v-if="loadingData" class="loading-indicator"><p>Cargando datos...</p></div>
    <!-- Mensaje de error general O de resumen de errores post-subida -->
    <div
      v-if="(errorMsg && !saving) || (errorMsg && saving && uploadProgress.errors > 0)"
      class="error-message"
    >
      <p>{{ errorMsg }}</p>
    </div>
    <!-- Mensaje de progreso durante la subida -->
    <div
      v-if="saving && uploadProgress.total > 0 && uploadProgress.errors === 0"
      class="saving-message"
    >
      <p>{{ errorMsg }} ({{ uploadProgress.current }}/{{ uploadProgress.total }})</p>
      <!-- Opcional: Barra de progreso -->
      <!-- <progress :value="uploadProgress.current" :max="uploadProgress.total" style="width: 100%;"></progress> -->
    </div>

    <form v-if="!loadingData" @submit.prevent="saveContent">
      <!-- Campos Nombre y Tipo: Solo visibles/editables en MODO EDICIÓN -->
      <div class="form-group" v-if="props.isEditMode">
        <label for="contentName">Nombre:</label>
        <input type="text" id="contentName" v-model="formData.name" required />
      </div>
      <div class="form-group" v-if="props.isEditMode">
        <label for="contentType">Tipo:</label>
        <select id="contentType" v-model="formData.type" required>
          <option value="" disabled>-- Selecciona --</option>
          <option value="video">Video</option>
          <option value="image">Imagen</option>
          <option value="text">Texto</option>
          <option value="other">Otro</option>
        </select>
      </div>
      <!-- Info para modo creación -->
      <div v-if="!props.isEditMode" class="info-box">
        <p>
          El <strong>nombre</strong> y el <strong>tipo</strong> de cada contenido se tomarán
          automáticamente del archivo subido.
        </p>
      </div>

      <div class="form-group">
        <label for="contentFile">Archivo(s):</label>
        <input
          type="file"
          id="contentFile"
          @change="handleFileChange"
          :accept="'image/*,video/*,text/plain,.txt,.md,.csv'"
          :key="fileInputKey"
          :required="!props.isEditMode && selectedFiles.length === 0"
          :multiple="!props.isEditMode"
        />
        <!-- Mensajes de ayuda condicionales -->
        <small v-if="!props.isEditMode"
          >Selecciona uno o más archivos (imagen, video, texto).</small
        >
        <small v-if="props.isEditMode && formData.content_url"
          >URL actual: {{ formData.content_url }}. Selecciona un archivo para reemplazarlo.</small
        >
        <small v-if="props.isEditMode && !formData.content_url"
          >No hay archivo asociado. Selecciona uno.</small
        >

        <!-- Lista de archivos seleccionados (para modo creación y edición si se selecciona nuevo) -->
        <ul v-if="selectedFiles.length > 0" class="file-list">
          <li v-for="(file, index) in selectedFiles" :key="index" class="file-info">
            {{ file.name }} ({{ (file.size / 1024 / 1024).toFixed(2) }} MB) - Tipo:
            {{ getFileType(file.type) }}
          </li>
        </ul>
      </div>

      <!-- Checkbox Público/Privado (sin cambios) -->
      <div class="form-group checkbox-group">
        <input type="checkbox" id="isPublic" v-model="formData.is_public" />
        <label for="isPublic">¿Es Público?</label>
        <small
          >Si está marcado, todos lo podrán ver. Si no, asigna un usuario o se asignará a tu
          cuenta.</small
        >
      </div>

      <!-- Búsqueda/Asignación de Usuario (sin cambios) -->
      <div class="form-group" id="user-search-container" v-if="!formData.is_public">
        <label for="userSearch">Asignar a Usuario Específico (Opcional):</label>
        <input
          type="search"
          id="userSearch"
          v-model="userSearchTerm"
          @input="debouncedSearchUsers"
          @focus="showUserDropdown = true"
          placeholder="Buscar email o nombre..."
          autocomplete="off"
        />
        <small>Si dejas vacío, se asignará al admin actual.</small>
        <ul
          v-if="
            showUserDropdown &&
            (userSearchResults.length > 0 || (userSearchTerm.length >= 2 && !loadingUsers))
          "
          class="user-dropdown"
        >
          <li v-if="loadingUsers">Buscando...</li>
          <li v-for="user in userSearchResults" :key="user.user_id" @click="selectUser(user)">
            {{ user.user_first_name || '' }} {{ user.user_last_name || '' }} ({{ user.user_email }})
          </li>
          <li v-if="!loadingUsers && userSearchResults.length === 0 && userSearchTerm.length >= 2">
            No encontrado.
          </li>
        </ul>
        <p v-if="assignedUser" class="assigned-user-info">
          Asignado a: {{ assignedUser.name }} ({{ assignedUser.email }})
          <button
            type="button"
            @click="
              assignedUser = null
              formData.user_id = null
              userSearchTerm = ''
            "
            class="btn-clear-user"
            title="Quitar"
          >
            X
          </button>
        </p>
      </div>

      <!-- Botones de Acción -->
      <div class="form-actions">
        <button
          type="submit"
          class="btn btn-save"
          :disabled="
            saving ||
            (!props.isEditMode && selectedFiles.length === 0 && !formData.id) ||
            (props.isEditMode && !formData.id)
          "
        >
          {{
            saving
              ? uploadProgress.total > 0
                ? `Procesando ${uploadProgress.current}/${uploadProgress.total}...`
                : 'Guardando...'
              : props.isEditMode
                ? 'Guardar Cambios'
                : 'Subir y Guardar'
          }}
        </button>
        <router-link
          :to="{ name: 'admin-contents' }"
          class="btn btn-cancel"
          :class="{ disabled: saving }"
          >Cancelar</router-link
        >
      </div>
    </form>
  </div>
</template>

<style scoped>
/* Estilos existentes... */
.admin-content-form {
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
  font-weight: bold;
}
.form-group input[type='text'],
.form-group input[type='url'],
.form-group input[type='file'],
.form-group input[type='search'],
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
  color: white !important;
}
.btn-save:hover:not(:disabled) {
  background-color: #0056b3;
}
.btn-save:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}
.btn-cancel {
  background-color: #6c757d;
  color: white !important;
}
.btn-cancel:hover:not(.disabled) {
  background-color: #5a6268;
}
.btn-cancel.disabled {
  background-color: #cccccc;
  opacity: 0.7;
  cursor: not-allowed;
  pointer-events: none;
}
#user-search-container {
  position: relative;
}
.user-dropdown {
  position: absolute;
  background-color: white;
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
.user-dropdown li:last-child {
  color: #666;
  font-style: italic;
  cursor: default;
}
.user-dropdown li:last-child:hover {
  background-color: white;
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
  background: none;
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
  font-weight: normal;
  vertical-align: middle;
}
.checkbox-group input[type='checkbox'] {
  vertical-align: middle;
}

/* --- NUEVOS ESTILOS / AJUSTES --- */
.info-box {
  background-color: #e7f3ff;
  border-left: 4px solid #007bff;
  padding: 10px 15px;
  margin-bottom: 15px;
  font-size: 0.9em;
  color: #004085;
}
.info-box p {
  margin: 0;
}

.file-list {
  list-style: none;
  padding: 0;
  margin-top: 10px;
  max-height: 150px; /* Para evitar listas muy largas */
  overflow-y: auto;
  border: 1px solid #eee;
  padding: 5px;
  background-color: #fff;
}
.file-info {
  font-size: 0.85em;
  color: #333;
  padding: 5px;
  border-bottom: 1px dashed #eee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-info:last-child {
  border-bottom: none;
}

/* Ajuste para deshabilitar apariencia */
.form-group input:disabled,
.form-group select:disabled {
  background-color: #e9ecef;
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
