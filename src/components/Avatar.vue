<script setup>
import { ref, watch, onMounted, defineProps, defineEmits } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps({
  path: String, // Recibe la ruta del avatar actual (ej: 'public/avatar1.png')
})

const emit = defineEmits(['update:path', 'upload'])
const authStore = useAuthStore()

const size = ref('10em') // Tamaño visual del avatar
const uploading = ref(false)
const src = ref(null) // La URL visible de la imagen
const files = ref(null)

// Función para descargar y mostrar la imagen actual desde Supabase Storage
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

// Función que se dispara cuando el usuario selecciona un archivo
async function uploadAvatar(event) {
  files.value = event.target.files
  if (!files.value || files.value.length === 0) {
    return
  }

  const file = files.value[0]
  const fileExt = file.name.split('.').pop()
  // Usamos el ID del usuario para crear una ruta única y segura
  const filePath = `${authStore.user.id}/${Math.random()}.${fileExt}`

  try {
    uploading.value = true
    // Subimos el archivo a Supabase Storage
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
    if (uploadError) throw uploadError

    // Emitimos los eventos para que el componente padre se entere del cambio
    emit('update:path', filePath) // Notifica a ProfileView la nueva ruta del archivo
    emit('upload') // Avisa a ProfileView que debe guardar el perfil
  } catch (error) {
    alert(error.message)
  } finally {
    uploading.value = false
  }
}

// Observa si la ruta del avatar cambia (cuando se carga el perfil por primera vez)
// y descarga la imagen.
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

// Al montar el componente, intenta descargar la imagen inicial
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

    <div class="upload-button-container" :style="{ width: size }">
      <label class="btn btn-secondary" for="single-avatar-upload">
        {{ uploading ? 'Subiendo...' : 'Cambiar Foto' }}
      </label>
      <input
        style="visibility: hidden; position: absolute"
        type="file"
        id="single-avatar-upload"
        accept="image/*"
        @change="uploadAvatar"
        :disabled="uploading"
      />
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
</style>
