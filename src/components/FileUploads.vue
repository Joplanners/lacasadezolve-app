<script setup>
import { ref } from 'vue'

// Guardaremos los archivos seleccionados en un array
const files = ref([])
const maxFiles = 4

// Esta función se activa cuando el usuario selecciona archivos
const handleFileChange = (event) => {
  const selectedFiles = event.target.files

  for (let i = 0; i < selectedFiles.length; i++) {
    if (files.value.length >= maxFiles) {
      alert(`Solo puedes subir un máximo de ${maxFiles} archivos.`)
      break
    }
    const file = selectedFiles[i]
    // Creamos una URL temporal para mostrar la vista previa
    const previewUrl = URL.createObjectURL(file)
    files.value.push({ file, previewUrl })
  }

  // Reseteamos el input para que el usuario pueda volver a seleccionar los mismos archivos si los borra
  event.target.value = ''
}

// Esta función elimina un archivo de la lista
const removeFile = (index) => {
  const fileToRemove = files.value[index]
  // Liberamos la memoria usada por la URL de la vista previa
  URL.revokeObjectURL(fileToRemove.previewUrl)
  files.value.splice(index, 1)
}
</script>

<template>
  <div class="file-upload-container">
    <h4>Personaliza tu Producto</h4>
    <p>Sube hasta {{ maxFiles }} imágenes para las portadas (frente, dorso, interior).</p>

    <div class="upload-area">
      <label for="file-input" class="upload-label"> 📂 Seleccionar Archivos </label>
      <input
        id="file-input"
        type="file"
        multiple
        accept="image/png, image/jpeg"
        @change="handleFileChange"
        style="display: none"
      />
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
  margin-bottom: 20px;
}

.upload-area {
  text-align: center;
  margin-bottom: 20px;
}

.upload-label {
  display: inline-block;
  padding: 10px 20px;
  background-color: var(--brand-turquoise);
  color: white;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.upload-label:hover {
  background-color: var(--brand-pink);
}

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
}

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
</style>
