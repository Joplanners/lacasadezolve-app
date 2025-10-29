<script setup>
import { ref, watch, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/authStore'
import { useRouter, useRoute } from 'vue-router' // 🔥 Añadimos useRoute

const toast = useToast()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute() // 🔥 Inicializamos route

// --- Props y Emits ---
const emit = defineEmits(['update:files'])

// --- Estado Local ---
const files = ref([])
const maxFiles = 4
const maxFileSizeMB = 10

// 🔥 Propiedad computada para saber si el usuario está logueado
const isLoggedIn = computed(() => authStore.isLoggedIn)

// --- Observador para Emitir Cambios ---
watch(
  files,
  (newFiles) => {
    const fileObjects = newFiles.map((item) => item.file)
    emit('update:files', fileObjects)
  },
  { deep: true },
)

// --- Funciones ---
const handleFileChange = (event) => {
  if (!isLoggedIn.value) {
    toast.error('Debes iniciar sesión para subir archivos de personalización.')
    return
  }
  const selectedFiles = event.target.files
  for (let i = 0; i < selectedFiles.length; i++) {
    if (files.value.length >= maxFiles) {
      toast.warning(`Solo puedes subir un máximo de ${maxFiles} archivos.`)
      break
    }
    const file = selectedFiles[i]
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      toast.error(`El archivo "${file.name}" es demasiado grande (máx ${maxFileSizeMB} MB).`)
      continue
    }
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast.error(`El archivo "${file.name}" no es un formato válido (solo PNG o JPG).`)
      continue
    }
    const previewUrl = URL.createObjectURL(file)
    files.value.push({ file, previewUrl })
  }
  event.target.value = ''
}

const removeFile = (index) => {
  const fileToRemove = files.value[index]
  URL.revokeObjectURL(fileToRemove.previewUrl)
  files.value.splice(index, 1)
}

// 🔥 Función para redirigir al login (Ahora 'route' está definido)
const goToLogin = () => {
  router.push({ name: 'login', query: { redirect: route.fullPath } })
}
</script>

<template>
  <div class="file-upload-container">
    <h4>Personaliza tu Producto</h4>
    <p>Sube hasta {{ maxFiles }} imágenes para las portadas (frente, dorso, interior).</p>
    <p class="upload-order-info">
      **Importante:** Sube las imágenes en este orden: 1. Portada, 2. Interior Portada, 3. Interior
      Contraportada, 4. Contraportada.
    </p>

    <div class="upload-area-wrapper">
      <div class="upload-area">
        <label for="file-input" class="upload-label" :class="{ disabled: !isLoggedIn }">
          📂 Seleccionar Archivos
        </label>
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/png, image/jpeg"
          @change="handleFileChange"
          style="display: none"
          :disabled="!isLoggedIn"
        />
      </div>

      <div v-if="!isLoggedIn" class="login-overlay">
        <p>¡Inicia sesión o regístrate para subir tus archivos de personalización!</p>
        <button @click="goToLogin" class="btn btn-login-overlay">Ir a Ingreso</button>
      </div>
    </div>

    <div v-if="files.length > 0" class="previews-container">
      <div v-for="(item, index) in files" :key="index" class="preview-card">
        <img :src="item.previewUrl" :alt="item.file.name" class="preview-image" />
        <button @click="removeFile(index)" class="remove-btn" title="Eliminar archivo">
          &times;
        </button>
        <div class="file-name">{{ item.file.name }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-upload-container {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  background-color: var(--color-background-soft);
  margin-top: 20px; /* Separación del elemento superior */
}
.file-upload-container h4 {
  margin-top: 0;
  text-align: center;
  color: var(--color-heading);
}
.file-upload-container p {
  text-align: center;
  font-size: 0.9em;
  color: var(--color-text);
  margin-bottom: 5px;
}
.upload-order-info {
  font-size: 0.85em;
  color: var(--color-text-soft);
  background-color: var(--color-background-mute);
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  line-height: 1.4;
}
.upload-order-info strong {
  color: var(--brand-pink);
}

.upload-area-wrapper {
  position: relative; /* Padre para el overlay */
  margin-bottom: 20px;
  border: 2px dashed var(--color-border); /* Mueve el borde aquí */
  border-radius: 8px; /* Mueve el borde aquí */
  min-height: 250px; /* 🔥 Altura mínima para asegurar espacio */
  display: flex; /* Centrar contenido interno */
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden; /* 🔥 Evita desbordes del overlay */
  transition: border-color 0.2s ease; /* Transición para hover */
}
/* Cambia el color del borde al pasar el mouse por el área */
.upload-area-wrapper:hover {
  border-color: var(--brand-turquoise);
}

.upload-area {
  text-align: center; /* No necesita más estilos ahora */
}
.upload-label {
  display: inline-block;
  padding: 10px 20px;
  background-color: var(--brand-turquoise);
  color: white;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;
}
.upload-label:hover {
  background-color: var(--brand-pink);
}
.upload-label.disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}
.upload-label.disabled:hover {
  /* Evita cambio de color al pasar mouse si está desactivado */
  background-color: #ccc;
}

/* Estilos para el Overlay */
.login-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 40px; /* Tu padding aumentado */
  border-radius: 5px; /* Coincide con el radio del wrapper */
  z-index: 10;
  box-sizing: border-box;
}
.login-overlay p {
  font-weight: 500;
  color: var(--color-heading);
  margin-bottom: 15px;
  font-size: 1.05em;
  line-height: 1.4;
}
.btn-login-overlay {
  padding: 10px 20px;
  background-color: var(--brand-pink);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
  font-size: 0.95em;
  margin-top: 0px; /* Lo dejamos en 0px como preferiste */
}
.btn-login-overlay:hover {
  background-color: #d81b60;
}

/* Previsualizaciones */
.previews-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 15px;
}
.preview-card {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  overflow: hidden;
  background-color: var(--color-background);
}
.preview-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
  display: block;
}
.remove-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
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
  z-index: 5;
} /* Aseguramos que esté sobre la etiqueta 'Nueva' si se superponen */
.remove-btn:hover {
  background-color: var(--brand-pink);
}
.file-name {
  padding: 8px;
  font-size: 0.75em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background-color: var(--color-background-mute);
}

/* Estilos para la etiqueta "Nueva" en previsualización */
.img-preview.new::before {
  content: 'Nueva';
  position: absolute;
  top: 0;
  right: 0;
  background-color: #28a745;
  color: white;
  padding: 3px 6px;
  font-size: 0.75em;
  border-bottom-left-radius: 4px;
  z-index: 4; /* Debajo del botón de borrar */
}
</style>
