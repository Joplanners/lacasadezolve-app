<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Composables
import { useARPermissions } from '@/composables/useARPermissions'
import { useARContent } from '@/composables/useARContent'
import { useDeviceOrientation } from '@/composables/useDeviceOrientation'

// Components
import AROverlay from '@/components/ar/AROverlay.vue'
import ARControls from '@/components/ar/ARControls.vue'
import ARScene from '@/components/ar/ARScene.vue'

const props = defineProps({
  markerId: { type: String, required: true },
})

const route = useRoute()
const router = useRouter()
const arSceneRef = ref(null)
const arViewContainerRef = ref(null)

// --- State from Composables ---
const {
  showCameraPermissionPrompt,
  cameraPermissionError,
  isCheckingPermission,
  checkAndRequestCameraPermission,
  resetPermissionState
} = useARPermissions()

const {
  mindFileUrl,
  associatedContents,
  currentContent,
  isLoading: isDataLoading,
  errorLoadingContent,
  loadMarkerAndContents,
  nextContent,
  prevContent,
  resetContentState
} = useARContent()

const {
  isConsideredMobileForPrompt,
  isDeviceLandscape,
  isInBrowserFullscreen,
  requestFullscreen,
  exitFullscreen,
  updateOrientationAndMobileState
} = useDeviceOrientation()

// --- Local View State ---
const isARReady = ref(false)
const isMarkerVisible = ref(false)
const isMediaLoading = ref(false)

// Computed
const isLoading = computed(() => isDataLoading.value || isMediaLoading.value)
const showARControls = computed(() => isARReady.value && isMarkerVisible.value && associatedContents.value.length > 1)
const showExitFullscreenButton = computed(() => isARReady.value && isMarkerVisible.value && isInBrowserFullscreen.value)

// --- Event Handlers ---

async function initializeExperience() {
  resetPermissionState()
  resetContentState()
  isARReady.value = false
  isMarkerVisible.value = false
  
  const permissionGranted = await checkAndRequestCameraPermission()
  if (permissionGranted) {
    await loadMarkerAndContents(props.markerId)
  }
}

function handleSceneLoaded() {
  console.log('[ARView] Scene Loaded')
}

function handleArReady() {
  console.log('[ARView] AR Ready')
  isARReady.value = true
  updateOrientationAndMobileState()
}

function handleArError(error) {
  console.error('[ARView] AR Error:', error)
  // Check if it's a camera permission error that A-Frame caught late
  const errorStr = JSON.stringify(error)
  if (errorStr.includes('Camera') || errorStr.includes('Permission')) {
    cameraPermissionError.value = 'Error de acceso a cámara detectado por AR.'
    showCameraPermissionPrompt.value = true
  }
}

function handleMarkerFound() {
  console.log('[ARView] Marker Found')
  isMarkerVisible.value = true
}

function handleMarkerLost() {
  console.log('[ARView] Marker Lost')
  isMarkerVisible.value = false
}

function handleContentLoadingStart() {
  isMediaLoading.value = true
}

function handleContentLoaded() {
  isMediaLoading.value = false
}

function handleContentError(msg) {
  isMediaLoading.value = false
  console.error('[ARView] Content Error:', msg)
  // Optional: Show a toast or non-blocking error
}

const goHome = () => {
  router.push({ name: 'home' })
}

// --- Lifecycle & Watchers ---

onMounted(() => {
  initializeExperience()
})

watch(() => props.markerId, (newId) => {
  if (newId) initializeExperience()
})

</script>

<template>
  <div class="ar-view-container" ref="arViewContainerRef">
    
    <!-- Overlay: Loading, Errors, Permissions -->
    <AROverlay
      :is-loading="isLoading"
      :is-checking-permission="isCheckingPermission"
      :show-camera-permission-prompt="showCameraPermissionPrompt"
      :camera-permission-error="cameraPermissionError"
      :error-loading-content="errorLoadingContent"
      :loading-message="isMediaLoading ? 'Cargando contenido...' : 'Cargando experiencia...'"
      @retry-camera="initializeExperience"
      @retry-load="initializeExperience"
    />

    <!-- Controls -->
    <ARControls
      :show-a-r-controls="showARControls"
      :show-exit-fullscreen-button="showExitFullscreenButton"
      @prev="prevContent"
      @next="nextContent"
      @exit-fullscreen="exitFullscreen"
      @go-home="goHome"
    />

    <!-- AR Scene -->
    <ARScene
      v-if="mindFileUrl && !showCameraPermissionPrompt && !errorLoadingContent"
      ref="arSceneRef"
      :mind-file-url="mindFileUrl"
      :current-content="currentContent"
      :is-a-r-ready="isARReady"
      :is-marker-visible="isMarkerVisible"
      :is-in-browser-fullscreen="isInBrowserFullscreen"
      @scene-loaded="handleSceneLoaded"
      @ar-ready="handleArReady"
      @ar-error="handleArError"
      @marker-found="handleMarkerFound"
      @marker-lost="handleMarkerLost"
      @content-loading-start="handleContentLoadingStart"
      @content-loaded="handleContentLoaded"
      @content-error="handleContentError"
    />

    <!-- Scanning Indicator -->
    <div
      v-if="isARReady && !isMarkerVisible && !isLoading && !errorLoadingContent && !showCameraPermissionPrompt"
      class="scanning-indicator"
    >
      <p>Apunta al marcador...</p>
    </div>

  </div>
</template>

<style scoped>
.ar-view-container {
  margin: 0;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  background-color: #000;
}

.scanning-indicator {
  position: absolute;
  bottom: 10%;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.scanning-indicator p {
  font-style: italic;
  color: #e0e0e0;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 8px 15px;
  border-radius: 20px;
  font-size: 1em;
}
</style>
