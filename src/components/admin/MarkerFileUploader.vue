<script setup>
import { ref } from 'vue';
import { useFileUpload } from '@/composables/useFileUpload';

const props = defineProps({
  mindFileUrl: String,
  previewImageUrl: String,
  isEditMode: Boolean
});

const emit = defineEmits(['update:mindFileUrl', 'update:previewImageUrl']);

const { uploadFile, uploading, error } = useFileUpload();

// Estado local para archivos seleccionados
const selectedMindFile = ref(null);
const selectedPreviewImage = ref(null);

// Keys para resetear inputs
const mindInputKey = ref(Date.now());
const previewInputKey = ref(Date.now());

// --- Manejadores de Archivos ---

const handleMindFileChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.mind')) {
    alert('Por favor selecciona un archivo .mind válido.');
    mindInputKey.value = Date.now();
    return;
  }

  selectedMindFile.value = file;
  
  // Subida automática (opcional, o se puede hacer al guardar)
  // Aquí optamos por subir al momento para obtener la URL
  try {
    const url = await uploadFile(file);
    emit('update:mindFileUrl', url);
  } catch (e) {
    selectedMindFile.value = null;
  }
};

const handlePreviewImageChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Por favor selecciona un archivo de imagen válido.');
    previewInputKey.value = Date.now();
    return;
  }

  selectedPreviewImage.value = file;

  try {
    const url = await uploadFile(file);
    emit('update:previewImageUrl', url);
  } catch (e) {
    selectedPreviewImage.value = null;
  }
};

const clearPreviewImage = () => {
  emit('update:previewImageUrl', null);
  selectedPreviewImage.value = null;
  previewInputKey.value = Date.now();
};
</script>

<template>
  <div class="marker-file-uploader">
    <!-- Sección Archivo .mind -->
    <div class="upload-section">
      <label class="section-label">Archivo Marcador (.mind): <span class="required">*</span></label>
      
      <div class="input-wrapper">
        <input 
          type="file" 
          accept=".mind" 
          @change="handleMindFileChange" 
          :key="mindInputKey"
          :disabled="uploading"
        >
      </div>

      <!-- Estado Actual .mind -->
      <div v-if="mindFileUrl" class="file-status success">
        <span class="icon">✅</span>
        <span class="text">Archivo cargado: {{ selectedMindFile?.name || 'Archivo existente' }}</span>
        <a :href="mindFileUrl" target="_blank" class="link">Ver</a>
      </div>
      <div v-else-if="isEditMode" class="file-status warning">
        <span class="icon">⚠️</span>
        <span class="text">Sin archivo asociado (Requerido)</span>
      </div>
    </div>

    <!-- Sección Imagen de Vista Previa -->
    <div class="upload-section">
      <label class="section-label">Imagen de Vista Previa (Opcional):</label>
      <small class="helper">Se mostrará en la galería pública (/demo)</small>
      
      <div class="input-wrapper">
        <input 
          type="file" 
          accept="image/*" 
          @change="handlePreviewImageChange" 
          :key="previewInputKey"
          :disabled="uploading"
        >
      </div>

      <!-- Preview de la imagen -->
      <div v-if="previewImageUrl" class="image-preview-container">
        <img :src="previewImageUrl" alt="Vista previa" class="image-preview">
        <button type="button" @click="clearPreviewImage" class="btn-remove" title="Eliminar imagen">✕</button>
      </div>
    </div>

    <!-- Indicador de Carga Global -->
    <div v-if="uploading" class="uploading-overlay">
      <div class="spinner"></div>
      <p>Subiendo archivo...</p>
    </div>

    <div v-if="error" class="error-msg">
      {{ error }}
    </div>
  </div>
</template>

<style scoped>
.marker-file-uploader {
  border: 1px solid #eee;
  padding: 15px;
  border-radius: 8px;
  background-color: #fcfcfc;
  position: relative;
}
.upload-section {
  margin-bottom: 20px;
}
.upload-section:last-child {
  margin-bottom: 0;
}
.section-label {
  display: block;
  font-weight: 600;
  margin-bottom: 5px;
  font-size: 0.95em;
}
.required {
  color: red;
}
.helper {
  display: block;
  font-size: 0.8em;
  color: #666;
  margin-bottom: 8px;
}
.input-wrapper input {
  width: 100%;
  padding: 5px;
  font-size: 0.9em;
}
.file-status {
  margin-top: 8px;
  padding: 8px;
  border-radius: 4px;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 8px;
}
.file-status.success {
  background-color: #e8f5e9;
  color: #2e7d32;
}
.file-status.warning {
  background-color: #fff3e0;
  color: #ef6c00;
}
.link {
  margin-left: auto;
  font-size: 0.85em;
  text-decoration: underline;
  color: inherit;
}
.image-preview-container {
  margin-top: 10px;
  position: relative;
  display: inline-block;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}
.image-preview {
  max-width: 150px;
  max-height: 150px;
  display: block;
}
.btn-remove {
  position: absolute;
  top: 0;
  right: 0;
  background: rgba(0,0,0,0.6);
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.btn-remove:hover {
  background: rgba(200, 0, 0, 0.8);
}
.error-msg {
  color: #d32f2f;
  font-size: 0.9em;
  margin-top: 10px;
}
.uploading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255,255,255,0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 8px;
}
.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
  margin-bottom: 5px;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
