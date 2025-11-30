<script setup>
defineProps({
  isLoading: Boolean,
  isCheckingPermission: Boolean,
  showCameraPermissionPrompt: Boolean,
  cameraPermissionError: String,
  errorLoadingContent: String,
  loadingMessage: {
    type: String,
    default: 'Cargando...'
  }
})

defineEmits(['retry-camera', 'retry-load'])
</script>

<template>
  <!-- Camera Permission Prompt -->
  <div v-if="showCameraPermissionPrompt" class="loading-overlay camera-permission-prompt">
    <p>⚠️ {{ cameraPermissionError }}</p>
    <p v-if="cameraPermissionError && cameraPermissionError.includes('denied')">
      Debes habilitar el permiso de cámara en tu navegador.
    </p>
    <button @click="$emit('retry-camera')" class="retry-button">Reintentar</button>
  </div>

  <!-- Initial Permission Check Loading -->
  <div v-else-if="isCheckingPermission" class="loading-overlay initial-loading">
    <div class="spinner"></div>
    <p>Verificando permiso...</p>
  </div>

  <!-- General Loading State -->
  <div v-else-if="isLoading && !errorLoadingContent" class="loading-overlay initial-loading">
    <div class="spinner"></div>
    <p>{{ loadingMessage }}</p>
  </div>

  <!-- Error Display -->
  <div v-else-if="errorLoadingContent" class="loading-overlay error-display">
    <p>⚠️ {{ errorLoadingContent }}</p>
    <button 
      v-if="!errorLoadingContent.includes('Timeout AR') && !errorLoadingContent.includes('No se pudo acceder')"
      @click="$emit('retry-load')" 
      class="retry-button"
    >
      Reintentar
    </button>
  </div>
</template>

<style scoped>
.loading-overlay,
.error-display,
.camera-permission-prompt {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-family: sans-serif;
  z-index: 200;
  text-align: center;
  padding: 20px;
  pointer-events: none;
}

.error-display,
.camera-permission-prompt {
  pointer-events: auto;
}

.camera-permission-prompt {
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 250;
}

.error-display {
  background-color: rgba(100, 0, 0, 0.85);
}

.loading-overlay p,
.error-display p,
.camera-permission-prompt p {
  margin-top: 15px;
  font-size: 1.2em;
  font-family: 'Roboto', Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  color: #fff;
}

.error-display p {
  color: #ffdddd;
}

.spinner {
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-button {
  margin-top: 20px;
  padding: 12px 22px;
  font-size: 1.05em;
  cursor: pointer;
  background-color: var(--vt-c-white-mute, #ddd);
  color: var(--vt-c-black-soft, #333);
  border: none;
  border-radius: 5px;
  transition: background-color 0.3s ease;
  pointer-events: auto;
  font-family: 'Roboto', Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
}

.retry-button:hover {
  background-color: var(--vt-c-divider-light-1, #bbb);
}
</style>
