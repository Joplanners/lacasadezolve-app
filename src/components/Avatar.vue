<script setup>
import { ref, watch, onMounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps({
  path: String,
})

const emit = defineEmits(['update:path', 'upload'])
const authStore = useAuthStore()

const size = ref('10em')
const uploading = ref(false)
const src = ref(null)
const files = ref(null)
const fileInput = ref(null) // Referencia para el input de archivo oculto

// Nueva función que se llama al hacer clic en el botón
function triggerFileInput() {
  // Simula un clic en el input de archivo, que está oculto
  fileInput.value.click()
}

async function downloadImage() {
  if (!props.path) {
    src.value = null
    return
  }
  try {
    const { data, error } = await supabase.storage.from('avatars').download(props.path)
    if (error) throw error
    src.value = URL.createObjectURL(data)
  } catch (error) {
    console.error('Error descargando la imagen:', error.message)
    src.value = null
  }
}

async function uploadAvatar(event) {
  files.value = event.target.files
  if (!files.value || files.value.length === 0) {
    return
  }
  const file = files.value[0]
  const fileExt = file.name.split('.').pop()
  const filePath = `${authStore.user.id}/${Math.random()}.${fileExt}`
  try {
    uploading.value = true
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
    if (uploadError) throw uploadError
    emit('update:path', filePath)
    emit('upload')
  } catch (error) {
    alert(error.message)
  } finally {
    uploading.value = false
  }
}

watch(
  () => props.path,
  (newPath) => {
    if (newPath) {
      downloadImage()
    } else {
      src.value = null
    }
  },
)

onMounted(() => {
  if (props.path) {
    downloadImage()
  }
})
</script>

<template>
  <div class="avatar-container">
    <img
      v-if="src"
      :src="src"
      alt="Avatar"
      class="avatar-image"
      :style="{ height: size, width: size }"
    />
    <div v-else class="avatar-no-image" :style="{ height: size, width: size }">
      <span class="initials-placeholder">📷</span>
    </div>

    <div class="upload-button-container">
      <!-- Este input está ahora oculto, pero hace el trabajo de abrir el explorador de archivos -->
      <input
        ref="fileInput"
        type="file"
        id="single-avatar-upload"
        accept="image/*"
        @change="uploadAvatar"
        :disabled="uploading"
        style="display: none"
      />
      <!-- Este es el botón visible que el usuario ve y presiona -->
      <button
        @click="triggerFileInput"
        class="btn btn-secondary btn-edit-profile"
        :disabled="uploading"
      >
        {{ uploading ? 'Subiendo...' : 'Cambiar Foto' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.avatar-image,
.avatar-no-image {
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid var(--brand-pink);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.avatar-no-image {
  background-color: var(--color-background-mute);
  display: flex;
  align-items: center;
  justify-content: center;
}

.initials-placeholder {
  font-size: 4em;
  color: var(--color-border-hover);
}

.upload-button-container .btn {
  width: 100%;
  box-sizing: border-box; /* Asegura que el padding no afecte el ancho total */
}

/*Estilos desde profile duplicados para evitar conflictos */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.95em;
  transition:
    background-color 0.2s ease,
    transform 0.1s ease;
  margin: 5px;
  font-family: var(--font-family-base);
  font-weight: var(--font-weight-medium);
  gap: 8px;
}
.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.btn-secondary {
  background-color: var(--brand-turquoise);
  color: var(--vt-c-white) !important;
}
.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-link-hover);
}
.btn-primary {
  background-color: var(--brand-pink);
  color: var(--vt-c-white) !important;
}
.btn-primary:hover:not(:disabled) {
  background-color: #e65c7a;
}
</style>
