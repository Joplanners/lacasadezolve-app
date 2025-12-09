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
  use_chroma_key: false,
  auto_scale: true,
  scale_override: null,
  position_x: 0,
  position_y: 0,
  position_z: 0,
  // Mobile-specific settings
  mobile_scale: null,
  mobile_position_x: null,
  mobile_position_y: null,
  mobile_position_z: null,
  // Text settings
  text_content: '',
  text_color: '#FFFFFF',
  text_style: 'simple', // 'simple' or '3d'
  text_font_size: 0.5,
  text_font_family: 'Roboto',
  text_animation: 'fadeIn' // 'none', 'fadeIn', 'scaleIn', 'bounceIn'
})
const selectedFiles = ref([])
const fileInputKey = ref(Date.now())
const creationMode = ref('file') // 'file' or 'text'

// --- Estado para Búsqueda de Usuario ---
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
const uploadProgress = ref({ total: 0, current: 0, errors: 0 })

// --- Funciones ---

const handleFileChange = (event) => {
  const files = event.target.files
  if (files && files.length > 0) {
    selectedFiles.value = Array.from(files)
    console.log(
      'Archivos seleccionados:',
      selectedFiles.value.map((f) => f.name),
    )
  } else {
    selectedFiles.value = []
  }
}

const getFileType = (mimeType) => {
  if (!mimeType) return 'other'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('text/')) return 'text'
  return 'other'
}

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
    formData.value.use_chroma_key = contentData.use_chroma_key || false
    formData.value.auto_scale = contentData.auto_scale === null ? true : contentData.auto_scale
    formData.value.scale_override = contentData.scale_override || null
    formData.value.position_x = contentData.position_x || 0
    formData.value.position_y = contentData.position_y || 0
    formData.value.position_z = contentData.position_z || 0
    formData.value.text_content = contentData.text_content || ''
    formData.value.text_color = contentData.text_color || '#FFFFFF'
    formData.value.text_style = contentData.text_style || 'simple'
    formData.value.text_font_size = contentData.text_font_size || 0.5
    formData.value.text_font_family = contentData.text_font_family || 'Roboto'
    formData.value.text_animation = contentData.text_animation || 'fadeIn'

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

// 🔥 NUEVA FUNCIÓN: Limpiar usuario asignado
function clearAssignedUser() {
  assignedUser.value = null
  formData.value.user_id = null
  userSearchTerm.value = ''
}

const handleClickOutside = (event) => {
  const searchContainer = document.getElementById('user-search-container')
  if (showUserDropdown.value && searchContainer && !searchContainer.contains(event.target)) {
    showUserDropdown.value = false
  }
}

async function saveContent() {
  saving.value = true
  errorMsg.value = ''
  uploadProgress.value = { total: 0, current: 0, errors: 0 }

  if (props.isEditMode) {
    if (!formData.value.name || !formData.value.type) {
      toast.error('Nombre y tipo son obligatorios en modo edición.')
      saving.value = false
      return
    }
    const singleFileToUpload = selectedFiles.value.length > 0 ? selectedFiles.value[0] : null

    let finalUserId = formData.value.is_public
      ? null
      : assignedUser.value?.id || formData.value.user_id || authStore.user?.id || null
    let finalContentUrl = formData.value.content_url

    try {
      if (singleFileToUpload) {
        console.log(`Editando: Preparando para subir reemplazo: ${singleFileToUpload.name}`)
        errorMsg.value = `Subiendo reemplazo ${singleFileToUpload.name}...`
        uploadProgress.value = { total: 1, current: 1, errors: 0 }

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
        finalContentUrl = result.publicUrl
        toast.info(`Archivo ${singleFileToUpload.name} subido como reemplazo.`)
        errorMsg.value = ''
      }

      // Text content doesn't need a URL - it stores text directly in the database
      const isTextContent = formData.value.type === 'text'
      
      if (!finalContentUrl && !isTextContent) {
        throw new Error('No hay URL de contenido para guardar.')
      }

      console.log(
        `Actualizando en DB: ID=${formData.value.id}, URL=${finalContentUrl || 'N/A (Text)'}, UserID=${finalUserId}, Public=${formData.value.is_public}`,
      )
      const contentDataToUpdate = {
        name: formData.value.name,
        type: formData.value.type,
        content_url: finalContentUrl,  // Keep existing URL (null for text is fine)
        is_public: formData.value.is_public,
        user_id: finalUserId,
        use_chroma_key: formData.value.use_chroma_key,
        auto_scale: formData.value.auto_scale,
        scale_override: formData.value.scale_override,
        position_x: formData.value.position_x,
        position_y: formData.value.position_y,
        position_z: formData.value.position_z,
        text_content: formData.value.text_content,
        text_color: formData.value.text_color,
        text_style: formData.value.text_style,
        text_font_size: formData.value.text_font_size,
        text_font_family: formData.value.text_font_family,
        text_animation: formData.value.text_animation,
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
      uploadProgress.value.errors++
    } finally {
      saving.value = false
      if (singleFileToUpload) {
        selectedFiles.value = []
        fileInputKey.value = Date.now()
      }
    }
  } else {
    // New content creation
    // Check if this is a text-only creation (no file needed)
    if (creationMode.value === 'text') {
      // Validate text content
      if (!formData.value.name || !formData.value.text_content) {
        toast.error('Debes ingresar un nombre y el texto que aparecerá en AR.')
        saving.value = false
        return
      }

      let finalUserId = null
      if (!formData.value.is_public) {
        if (assignedUser.value) {
          finalUserId = assignedUser.value.id
        } else {
          finalUserId = authStore.user?.id || null
          if (!finalUserId) {
            toast.error('No se pudo determinar el usuario admin para asignar contenido privado.')
            saving.value = false
            return
          }
        }
      }

      try {
        const textContentData = {
          name: formData.value.name,
          type: 'text',
          content_url: null, // No file URL for text-only content
          is_public: formData.value.is_public,
          user_id: finalUserId,
          auto_scale: formData.value.auto_scale,
          text_content: formData.value.text_content,
          text_color: formData.value.text_color,
          text_style: formData.value.text_style,
          text_font_size: formData.value.text_font_size,
          text_font_family: formData.value.text_font_family,
          text_animation: formData.value.text_animation,
          position_x: formData.value.position_x,
          position_y: formData.value.position_y,
          position_z: formData.value.position_z,
        }

        const { error: dbError } = await supabase.from('contents').insert(textContentData)
        if (dbError) throw dbError

        toast.success('¡Contenido de texto creado exitosamente!')
        router.push({ name: 'admin-contents' })
      } catch (err) {
        console.error('Error creando texto:', err)
        toast.error(`Error al crear contenido de texto: ${err.message}`)
      } finally {
        saving.value = false
      }
      return
    }

    // File upload mode - requires files
    if (selectedFiles.value.length === 0) {
      toast.error('Debes seleccionar al menos un archivo.')
      saving.value = false
      return
    }

    let finalUserId = null
    if (!formData.value.is_public) {
      if (assignedUser.value) {
        finalUserId = assignedUser.value.id
      } else {
        finalUserId = authStore.user?.id || null
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

    uploadProgress.value.total = selectedFiles.value.length
    uploadProgress.value.current = 0
    uploadProgress.value.errors = 0
    errorMsg.value = `Procesando ${uploadProgress.value.total} archivos...`

    const workerUrl = 'https://r2-presigner-worker.jodiabunos.workers.dev'
    const uploadPromises = selectedFiles.value.map(async (file, index) => {
      uploadProgress.value.current = index + 1
      errorMsg.value = `Subiendo ${index + 1}/${uploadProgress.value.total}: ${file.name}...`
      console.log(`Procesando archivo ${index + 1}: ${file.name}`)

      if (file.size === 0) {
        throw new Error(`Archivo "${file.name}" está vacío o es inválido.`)
      }

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
      const fileType = getFileType(file.type)

      console.log(`Archivo ${file.name} subido OK. URL: ${fileUrl}, Tipo: ${fileType}`)

      const contentDataToInsert = {
        name: file.name,
        type: fileType,
        content_url: fileUrl,
        is_public: formData.value.is_public,
        user_id: finalUserId,
        use_chroma_key: formData.value.use_chroma_key,
        auto_scale: formData.value.auto_scale,
        scale_override: formData.value.scale_override,
        position_x: formData.value.position_x,
        position_y: formData.value.position_y,
        position_z: formData.value.position_z,
        text_content: formData.value.text_content,
        text_color: formData.value.text_color,
      }

      console.log(`Insertando en DB para ${file.name}...`)
      const { error: dbError } = await supabase.from('contents').insert(contentDataToInsert)
      if (dbError) {
        throw new Error(`Error DB para ${file.name}: ${dbError.message}`)
      }

      console.log(`Registro para ${file.name} creado con éxito.`)
      return { fileName: file.name, status: 'success' }
    })

    const results = await Promise.allSettled(uploadPromises)

    let successCount = 0
    let errorCount = 0
    results.forEach((result, index) => {
      const fileName = selectedFiles.value[index].name
      if (result.status === 'fulfilled') {
        successCount++
        console.log(`Éxito procesando: ${fileName}`)
      } else {
        errorCount++
        console.error(`Error procesando ${fileName}:`, result.reason?.message || result.reason)
      }
    })

    uploadProgress.value.errors = errorCount

    if (errorCount === 0) {
      toast.success(`¡${successCount} archivos subidos y guardados con éxito!`)
      router.push({ name: 'admin-contents' })
    } else {
      const summaryMsg = `${successCount} archivos procesados correctamente. ${errorCount} archivos fallaron. Revise la consola para detalles.`
      errorMsg.value = summaryMsg
      toast.warning(summaryMsg)
    }

    selectedFiles.value = []
    fileInputKey.value = Date.now()
    saving.value = false
    if (errorCount === 0) {
      errorMsg.value = ''
    }
  }
}

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
    <div
      v-if="(errorMsg && !saving) || (errorMsg && saving && uploadProgress.errors > 0)"
      class="error-message"
    >
      <p>{{ errorMsg }}</p>
    </div>
    <div
      v-if="saving && uploadProgress.total > 0 && uploadProgress.errors === 0"
      class="saving-message"
    >
      <p>{{ errorMsg }} ({{ uploadProgress.current }}/{{ uploadProgress.total }})</p>
    </div>

    <form v-if="!loadingData" @submit.prevent="saveContent">
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
      <div v-if="!props.isEditMode" class="info-box">
        <p>
          El <strong>nombre</strong> y el <strong>tipo</strong> de cada contenido se tomarán
          automáticamente del archivo subido.
        </p>
      </div>

      <!-- Mode selector for new content -->
      <div v-if="!props.isEditMode" class="form-group">
        <label>¿Qué tipo de contenido quieres crear?</label>
        <div class="mode-selector">
          <button 
            type="button" 
            :class="['mode-btn', creationMode === 'file' ? 'active' : '']"
            @click="creationMode = 'file'"
          >
            📁 Subir Archivo (Video/Imagen/Audio)
          </button>
          <button 
            type="button" 
            :class="['mode-btn', creationMode === 'text' ? 'active' : '']"
            @click="creationMode = 'text'"
          >
            📝 Solo Texto Flotante
          </button>
        </div>
      </div>

      <!-- File upload (show only if creationMode is file or in edit mode) -->
      <div class="form-group" v-if="creationMode === 'file' || props.isEditMode">
        <label for="contentFile">Archivo(s):</label>
        <input
          type="file"
          id="contentFile"
          @change="handleFileChange"
          :accept="'image/*,video/*,audio/*,text/plain,.txt,.md,.csv'"
          :key="fileInputKey"
          :required="!props.isEditMode && selectedFiles.length === 0 && creationMode === 'file'"
          :multiple="!props.isEditMode"
        />
        <small v-if="!props.isEditMode && creationMode === 'file'"
          >Selecciona uno o más archivos (imagen, video, audio).</small
        >
        <small v-if="props.isEditMode && formData.content_url"
          >URL actual: {{ formData.content_url }}. Selecciona un archivo para reemplazarlo.</small
        >
        <small v-if="props.isEditMode && !formData.content_url"
          >No hay archivo asociado. Selecciona uno.</small
        >

        <ul v-if="selectedFiles.length > 0" class="file-list">
          <li v-for="(file, index) in selectedFiles" :key="index" class="file-info">
            {{ file.name }} ({{ (file.size / 1024 / 1024).toFixed(2) }} MB) - Tipo:
            {{ getFileType(file.type) }}
          </li>
        </ul>
      </div>

      <!-- Text content name (only show when creating text content) -->
      <div class="form-group" v-if="!props.isEditMode && creationMode === 'text'">
        <label for="textContentName">Nombre del contenido:</label>
        <input 
          type="text" 
          id="textContentName" 
          v-model="formData.name" 
          placeholder="Ej: Mensaje de cumpleaños"
          required
        />
      </div>

      <div class="form-group checkbox-group">
        <input type="checkbox" id="isPublic" v-model="formData.is_public" />
        <label for="isPublic">¿Es Público?</label>
        <small
          >Si está marcado, todos lo podrán ver. Si no, asigna un usuario o se asignará a tu
          cuenta.</small
        >
      </div>

      <div class="form-group checkbox-group" v-if="formData.type === 'video' || selectedFiles.some(f => f.type.startsWith('video/'))">
        <input type="checkbox" id="useChromaKey" v-model="formData.use_chroma_key" />
        <label for="useChromaKey">🟢 Usar Chroma Key (Pantalla Verde)</label>
        <small
          >Marca esto si el video tiene fondo verde. El fondo se volverá transparente en AR.</small
        >
      </div>

      <!-- Text Content Controls (Show when text mode selected, type is text, or in edit mode) -->
      <div v-if="creationMode === 'text' || formData.type === 'text' || (props.isEditMode && formData.text_content)" class="form-section">
        <h4>📝 Contenido de Texto AR</h4>
        
        <div class="form-group">
          <label for="textContent">Texto que aparecerá flotando:</label>
          <textarea 
            id="textContent" 
            v-model="formData.text_content" 
            rows="3" 
            placeholder="¡Feliz Cumpleaños! 🎉"
          ></textarea>
          <small>Este texto aparecerá como texto 3D flotante en AR</small>
        </div>

        <!-- Text Preview -->
        <div v-if="formData.text_content" class="text-preview-container">
          <label>Vista previa:</label>
          <div 
            class="text-preview" 
            :style="{
              color: formData.text_color,
              fontFamily: formData.text_font_family || 'Roboto',
              fontSize: (formData.text_font_size || 0.5) * 40 + 'px'
            }"
          >
            {{ formData.text_content }}
          </div>
        </div>

        <div class="form-group">
          <label for="textColor">Color del texto:</label>
          <input 
            type="color" 
            id="textColor" 
            v-model="formData.text_color" 
          />
          <small>Elige el color del texto flotante. Blanco (#FFFFFF) funciona bien con fondos oscuros.</small>
        </div>

        <!-- 3D Text Style Options -->
        <div class="form-group">
          <label>Estilo de texto:</label>
          <div class="mode-selector">
            <button 
              type="button" 
              :class="['mode-btn', formData.text_style === 'simple' ? 'active' : '']"
              @click="formData.text_style = 'simple'"
            >
              📝 Simple
            </button>
            <button 
              type="button" 
              :class="['mode-btn', formData.text_style === '3d' ? 'active' : '']"
              @click="formData.text_style = '3d'"
            >
              ✨ 3D Premium
            </button>
          </div>
        </div>

        <div v-if="formData.text_style === '3d'" class="form-row">
          <div class="form-group">
            <label for="textFont">Fuente:</label>
            <select id="textFont" v-model="formData.text_font_family">
              <option value="Roboto">Roboto (Moderna)</option>
              <option value="Outfit">Outfit (Limpia)</option>
              <option value="Poppins">Poppins (Redondeada)</option>
              <option value="Inter">Inter (Legible)</option>
              <option value="Lobster">Lobster (Decorativa)</option>
              <option value="Dancing Script">Dancing Script (Cursiva)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="textSize">Tamaño:</label>
            <input 
              type="range" 
              id="textSize" 
              v-model.number="formData.text_font_size" 
              min="0.2" 
              max="1.5" 
              step="0.1"
            />
            <small>{{ formData.text_font_size }} (0.5 = normal)</small>
          </div>

          <div class="form-group">
            <label for="textAnimation">Animación de entrada:</label>
            <select id="textAnimation" v-model="formData.text_animation">
              <option value="none">Sin animación</option>
              <option value="fadeIn">🌟 Aparecer suave</option>
              <option value="scaleIn">🔍 Crecer</option>
              <option value="bounceIn">🏀 Rebote</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Auto-Scale Controls (Solo en modo edición) -->
      <div v-if="props.isEditMode" class="form-section">
        <h4>⚙️ Ajustes de Visualización AR</h4>
        
        <div class="form-group checkbox-group">
          <input type="checkbox" id="autoScale" v-model="formData.auto_scale" />
          <label for="autoScale">🎯 Auto-ajustar al marcador</label>
          <small>Si está activo, se usarán ajustes automáticos inteligentes</small>
        </div>

        <!-- SEPARACIÓN: Tablet/Desktop vs Móvil -->
        <div v-if="!formData.auto_scale" class="device-settings-container">
          
          <!-- 💻 TABLET / DESKTOP -->
          <details class="device-settings desktop-settings" open>
            <summary>💻 Ajustes para Tablet / PC</summary>
            <div class="position-controls">
              <div class="form-group">
                <label for="scaleOverride">Escala:</label>
                <input type="number" id="scaleOverride" v-model.number="formData.scale_override" step="0.01" min="0.1" max="5.0" placeholder="1.0"/>
              </div>
              <div class="form-group">
                <label for="posX">Posición X:</label>
                <input type="number" id="posX" v-model.number="formData.position_x" step="0.01" />
              </div>
              <div class="form-group">
                <label for="posY">Posición Y:</label>
                <input type="number" id="posY" v-model.number="formData.position_y" step="0.01" />
              </div>
              <div class="form-group">
                <label for="posZ">Posición Z:</label>
                <input type="number" id="posZ" v-model.number="formData.position_z" step="0.01" />
              </div>
            </div>
          </details>

          <!-- 📱 MÓVIL -->
          <details class="device-settings mobile-settings" open>
            <summary>📱 Ajustes para Celulares</summary>
            <div class="position-controls">
              <div class="form-group">
                <label for="mobileScale">Escala Móvil:</label>
                <input type="number" id="mobileScale" v-model.number="formData.mobile_scale" step="0.01" min="0.1" max="5.0" placeholder="1.0"/>
              </div>
              <div class="form-group">
                <label for="mobilePosX">Posición X:</label>
                <input type="number" id="mobilePosX" v-model.number="formData.mobile_position_x" step="0.01" />
              </div>
              <div class="form-group">
                <label for="mobilePosY">Posición Y:</label>
                <input type="number" id="mobilePosY" v-model.number="formData.mobile_position_y" step="0.01" />
              </div>
              <div class="form-group">
                <label for="mobilePosZ">Posición Z:</label>
                <input type="number" id="mobilePosZ" v-model.number="formData.mobile_position_z" step="0.01" />
              </div>
            </div>
            <small class="helper-text">Estos valores se aplican SOLO en teléfonos pequeños (≤480px)</small>
          </details>
        </div>
      </div>

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
          <button type="button" @click="clearAssignedUser" class="btn-clear-user" title="Quitar">
            X
          </button>
        </p>
      </div>

      <div class="form-actions">
        <button
          type="submit"
          class="btn btn-save"
          :disabled="
            saving ||
            (!props.isEditMode && creationMode === 'file' && selectedFiles.length === 0) ||
            (!props.isEditMode && creationMode === 'text' && (!formData.name || !formData.text_content)) ||
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
  max-height: 150px;
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

.form-group input:disabled,
.form-group select:disabled {
  background-color: #e9ecef;
  opacity: 0.7;
  cursor: not-allowed;
}

/* Mode selector for content creation */
.mode-selector {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.mode-btn {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: #f8f9fa;
  cursor: pointer;
  font-size: 0.95em;
  transition: all 0.2s ease;
  text-align: center;
}

.mode-btn:hover {
  border-color: var(--brand-turquoise, #4db6ac);
  background: #fff;
}

.mode-btn.active {
  border-color: var(--brand-turquoise, #4db6ac);
  background: var(--brand-turquoise, #4db6ac);
  color: white;
}

@media (max-width: 600px) {
  .mode-selector {
    flex-direction: column;
  }
}

/* Form row for 3D text options */
.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 10px;
}

/* Text Preview */
.text-preview-container {
  margin: 15px 0;
}
.text-preview {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}
</style>
