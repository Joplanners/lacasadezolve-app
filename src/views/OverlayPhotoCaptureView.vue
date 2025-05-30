<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, onActivated, onDeactivated } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import interact from 'interactjs'
import { useToast } from 'vue-toastification'

const props = defineProps({
  overlayId: { type: String, required: true },
})
const toast = useToast()
const overlayDetails = ref(null)
const loading = ref(true)
const error = ref('')
const videoPlayer = ref(null)
const cameraStream = ref(null)
const cameraError = ref('')
const overlayImageElement = ref(null)
const overlayPosition = ref({ x: 0, y: 0 })
const R2_PUBLIC_BASE_URL = 'https://pub-48e6b80b718c43a99a9b98163de9920c.r2.dev'
let interactionInstance = null
const isCapturing = ref(false)
const imageUrlToLoad = ref('')
const viewActive = ref(false)

const currentViewMode = ref('capturing')
const capturedImageDataUrl = ref('')

const isSmallMobile = ref(false)
const isMobileDevice = ref(false)
const isTablet = ref(false)
const isDesktop = ref(false)

function getOverlayFullUrl(r2Key) {
  if (!r2Key) return ''
  if (r2Key.startsWith('http://') || r2Key.startsWith('https://')) {
    return r2Key
  }
  return `${R2_PUBLIC_BASE_URL}/${r2Key}`
}

watch(
  () => overlayDetails.value,
  (newDetails) => {
    if (newDetails && newDetails.r2_key) {
      const key = newDetails.r2_key
      let baseUrl = getOverlayFullUrl(key)
      const cacheBuster = `v=${Date.now()}`
      baseUrl += (baseUrl.includes('?') ? '&' : '?') + cacheBuster
      imageUrlToLoad.value = baseUrl
    } else {
      imageUrlToLoad.value = ''
    }
  },
  { immediate: true, deep: true },
)

function updateDeviceSizeClassifiers() {
  if (typeof window !== 'undefined') {
    const width = window.innerWidth
    isSmallMobile.value = width < 480
    isMobileDevice.value = width >= 480 && width < 768
    isTablet.value = width >= 768 && width < 1200
    isDesktop.value = width >= 1200
  }
}

async function initializeView(isReactivating = false) {
  console.log('[OverlayPhoto] InitializeView START. Is Reactivating:', isReactivating)
  loading.value = true
  error.value = ''
  cameraError.value = ''
  isCapturing.value = false
  currentViewMode.value = 'capturing'
  capturedImageDataUrl.value = ''

  cleanupCamera()
  updateDeviceSizeClassifiers()

  if (!overlayDetails.value || !isReactivating) {
    await fetchOverlayDetails()
  } else {
    if (overlayDetails.value && overlayDetails.value.r2_key) {
      const key = overlayDetails.value.r2_key
      let baseUrl = getOverlayFullUrl(key)
      const cacheBuster = `v=${Date.now()}`
      baseUrl += (baseUrl.includes('?') ? '&' : '?') + cacheBuster
      imageUrlToLoad.value = baseUrl
    }
  }

  loading.value = false
  console.log('[OverlayPhoto] InitializeView END, loading:', loading.value, 'error:', error.value)

  if (
    viewActive.value &&
    currentViewMode.value === 'capturing' &&
    !error.value &&
    overlayDetails.value?.r2_key
  ) {
    await nextTick()
    if (videoPlayer.value) {
      console.log(
        '[OverlayPhoto] InitializeView: videoPlayer ref está lista. Condiciones para startCamera met. Llamando a startCamera.',
      )
      await startCamera()
    } else {
      console.error(
        '[OverlayPhoto] InitializeView: videoPlayer ref NO está lista DESPUÉS de nextTick. No se puede iniciar la cámara.',
      )
      cameraError.value = 'Error interno al inicializar el reproductor de video.'
      toast.error(cameraError.value)
    }
  } else {
    console.log(
      '[OverlayPhoto] InitializeView: Condiciones para startCamera NO met. viewActive:',
      viewActive.value,
      'mode:',
      currentViewMode.value,
      'error:',
      error.value,
      'r2_key:',
      overlayDetails.value?.r2_key,
    )
  }
}

async function fetchOverlayDetails() {
  console.log('[OverlayPhoto] Fetching overlay details for ID:', props.overlayId)
  if (!props.overlayId) {
    error.value = 'No se proporcionó ID de overlay.'
    loading.value = false
    return
  }
  try {
    const {
      data,
      error: dbError,
      status,
    } = await supabase
      .from('overlay_images')
      .select('id, image_name, r2_key, description, is_public')
      .eq('id', props.overlayId)
      .single()

    if (dbError) {
      if (status === 406 || dbError.code === 'PGRST116') {
        error.value = `No se encontró la Foto Mágica con ID: ${props.overlayId}`
      } else {
        throw dbError
      }
    }

    if (data) {
      overlayDetails.value = data
      if (!data.r2_key) {
        error.value = `Configuración de imagen incompleta (ID: ${props.overlayId}) (falta r2_key).`
        toast.error(error.value)
      }
    } else if (!error.value) {
      error.value = `No se encontró la Foto Mágica con ID: ${props.overlayId}`
    }
  } catch (err) {
    error.value = `Error al cargar detalles: ${err.message || 'Error desconocido.'}`
    toast.error(error.value)
  }
}

async function startCamera() {
  console.log('[OverlayPhoto] Attempting to start camera. Current stream:', cameraStream.value)
  if (cameraStream.value) {
    console.log('[OverlayPhoto] Camera stream already active. Skipping startCamera.')
    return
  }
  cameraError.value = ''
  if (!videoPlayer.value) {
    cameraError.value = 'Error interno: Referencia al reproductor de video no encontrada.'
    console.error(cameraError.value)
    return
  }
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      console.log('[OverlayPhoto] Requesting user media (camera)...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      console.log('[OverlayPhoto] Media stream obtained.')
      cameraStream.value = stream
      videoPlayer.value.srcObject = stream
      try {
        await videoPlayer.value.play()
        console.log('[OverlayPhoto] Video player started.')
      } catch (playError) {
        cameraError.value = 'No se pudo iniciar video de cámara.'
        console.error('[OverlayPhoto] Play error:', playError)
      }
    } catch (err) {
      console.error('[OverlayPhoto] GetUserMedia error:', err.name, err.message)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        cameraError.value = 'Permiso de cámara denegado por el usuario.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        cameraError.value = 'No se encontró una cámara compatible.'
      } else if (err.name === 'NotReadableError') {
        cameraError.value = 'La cámara está en uso o no es accesible.'
      } else {
        cameraError.value = `Error al acceder a la cámara: ${err.name}`
      }
      toast.error(cameraError.value)
    }
  } else {
    cameraError.value = 'La API MediaDevices (cámara) no es soportada por este navegador.'
    console.error(cameraError.value)
    toast.error(cameraError.value)
  }
}

function cleanupCamera() {
  console.log('[OverlayPhoto] Cleanup Camera Called')
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach((track) => track.stop())
    cameraStream.value = null
    console.log('[OverlayPhoto] Camera stream stopped and nulled')
  }
  if (videoPlayer.value && videoPlayer.value.srcObject) {
    videoPlayer.value.srcObject = null
    console.log('[OverlayPhoto] Video player srcObject nulled')
  }
}

function cleanupInteract() {
  if (interactionInstance) {
    interactionInstance.unset()
    interactionInstance = null
    console.log('[OverlayPhoto] InteractJS instance unset.')
  }
}

onMounted(() => {
  console.log('[OverlayPhoto] Component Mounted.')
  viewActive.value = true
  initializeView()
  window.addEventListener('resize', updateDeviceSizeClassifiers)
})

onUnmounted(() => {
  console.log('[OverlayPhoto] Component Unmounted.')
  viewActive.value = false
  cleanupCamera()
  cleanupInteract()
  window.removeEventListener('resize', updateDeviceSizeClassifiers)
})

onActivated(() => {
  console.log('[OverlayPhoto] Component Activated.')
  viewActive.value = true
  initializeView(true)
  window.addEventListener('resize', updateDeviceSizeClassifiers)
})

onDeactivated(() => {
  console.log('[OverlayPhoto] Component Deactivated.')
  viewActive.value = false
  cleanupCamera()
  cleanupInteract()
  window.removeEventListener('resize', updateDeviceSizeClassifiers)
})

function initInteractOnImage() {
  if (overlayImageElement.value && videoPlayer.value) {
    cleanupInteract()

    interactionInstance = interact(overlayImageElement.value)
      .draggable({
        listeners: {
          move(event) {
            overlayPosition.value.x += event.dx
            overlayPosition.value.y += event.dy
          },
        },
        modifiers: [interact.modifiers.restrictRect({ restriction: 'parent', endOnly: false })],
        inertia: false,
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        listeners: {
          move(event) {
            const target = event.target
            let x = overlayPosition.value.x
            let y = overlayPosition.value.y
            target.style.width = `${event.rect.width}px`
            target.style.height = `${event.rect.height}px`
            x += event.deltaRect.left
            y += event.deltaRect.top
            overlayPosition.value.x = x
            overlayPosition.value.y = y
          },
        },
        modifiers: [
          interact.modifiers.restrictEdges({ outer: 'parent' }),
          interact.modifiers.restrictSize({ min: { width: 50, height: 50 } }),
          interact.modifiers.aspectRatio({
            ratio: 'preserve',
            equalDelta: true,
            modifiers: [interact.modifiers.restrictSize({ max: 'parent' })],
          }),
        ],
        inertia: false,
      })
    console.log('[OverlayPhoto] InteractJS initialized on overlay image.')
  } else {
    console.warn('[OverlayPhoto] Cannot init InteractJS: overlay image or video player not ready.')
  }
}

function setInitialOverlaySizeAndCallInteract() {
  const videoElem = videoPlayer.value
  const overlayImgElem = overlayImageElement.value
  if (
    videoElem &&
    overlayImgElem &&
    overlayImgElem.naturalWidth > 0
    // videoElem.videoWidth > 0 &&  // No depender de videoWidth/Height aquí, puede no estar listo
    // videoElem.videoHeight > 0
  ) {
    if (videoElem.readyState < videoElem.HAVE_METADATA && videoElem.srcObject) {
      console.log('[OverlayPhoto] Video metadata not loaded yet for initial size. Waiting.')
      videoElem.onloadedmetadata = () => {
        console.log('[OverlayPhoto] Video metadata loaded. Recalculating initial size.')
        setInitialOverlaySizeAndCallInteract()
        videoElem.onloadedmetadata = null
      }
      return
    }

    const videoDisplayWidth = videoElem.clientWidth
    const videoDisplayHeight = videoElem.clientHeight

    if (videoDisplayWidth === 0 || videoDisplayHeight === 0) {
      console.warn(
        '[OverlayPhoto] Video display dimensions are zero. Retrying initial size calc shortly.',
      )
      setTimeout(setInitialOverlaySizeAndCallInteract, 100) // Reintentar brevemente
      return
    }

    const initialWidthFactor = 0.6
    let initialWidth = videoDisplayWidth * initialWidthFactor
    let initialHeight = (overlayImgElem.naturalHeight / overlayImgElem.naturalWidth) * initialWidth

    if (initialHeight > videoDisplayHeight * initialWidthFactor) {
      initialHeight = videoDisplayHeight * initialWidthFactor
      initialWidth = (overlayImgElem.naturalWidth / overlayImgElem.naturalHeight) * initialHeight
    }
    if (initialWidth > videoDisplayWidth * 0.95) initialWidth = videoDisplayWidth * 0.95
    if (initialHeight > videoDisplayHeight * 0.95) initialHeight = videoDisplayHeight * 0.95

    overlayImgElem.style.width = `${initialWidth}px`
    overlayImgElem.style.height = `${initialHeight}px`
    overlayPosition.value.x = (videoDisplayWidth - initialWidth) / 2
    overlayPosition.value.y = (videoDisplayHeight - initialHeight) / 2

    console.log(
      `[OverlayPhoto] Initial overlay size set: ${initialWidth}x${initialHeight}. Position: x=${overlayPosition.value.x}, y=${overlayPosition.value.y}`,
    )

    nextTick(() => {
      initInteractOnImage()
    })
  } else if (overlayImageElement.value) {
    console.warn(
      '[OverlayPhoto] Video dimensions not ready OR overlay image not fully loaded for precise initial sizing, initializing InteractJS with image defaults.',
    )
    nextTick(() => {
      initInteractOnImage()
    })
  }
}

async function takePhotoAndPreview() {
  if (!videoPlayer.value || !cameraStream.value || !overlayDetails.value) {
    toast.error('Cámara o superposición no están listos.')
    return
  }
  isCapturing.value = true
  await nextTick()

  const video = videoPlayer.value
  const canvas = document.createElement('canvas')
  const canvasWidth = video.clientWidth
  const canvasHeight = video.clientHeight

  if (canvasWidth === 0 || canvasHeight === 0) {
    toast.error('Dimensiones de visualización de video no válidas.')
    isCapturing.value = false
    return
  }

  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    toast.error('Error al preparar el lienzo de captura.')
    isCapturing.value = false
    return
  }

  const videoActualWidth = video.videoWidth
  const videoActualHeight = video.videoHeight
  const videoAspectRatio = videoActualWidth / videoActualHeight
  const canvasAspectRatio = canvasWidth / canvasHeight
  let renderWidth, renderHeight, xStart, yStart

  if (videoAspectRatio > canvasAspectRatio) {
    renderHeight = canvasHeight
    renderWidth = renderHeight * videoAspectRatio
    xStart = (canvasWidth - renderWidth) / 2
    yStart = 0
  } else {
    renderWidth = canvasWidth
    renderHeight = renderWidth / videoAspectRatio
    xStart = 0
    yStart = (canvasHeight - renderHeight) / 2
  }
  ctx.drawImage(video, xStart, yStart, renderWidth, renderHeight)

  if (
    overlayImageElement.value &&
    overlayImageElement.value.complete &&
    overlayImageElement.value.naturalWidth !== 0
  ) {
    const img = overlayImageElement.value
    const xOnCanvas = overlayPosition.value.x
    const yOnCanvas = overlayPosition.value.y
    const overlayWidthOnCanvas = parseFloat(img.style.width) || img.clientWidth
    const overlayHeightOnCanvas = parseFloat(img.style.height) || img.clientHeight
    ctx.drawImage(img, xOnCanvas, yOnCanvas, overlayWidthOnCanvas, overlayHeightOnCanvas)
  }

  capturedImageDataUrl.value = canvas.toDataURL('image/png')
  currentViewMode.value = 'previewing'
  cleanupCamera()
  cleanupInteract()
  isCapturing.value = false
}

function downloadCapturedPhoto() {
  if (!capturedImageDataUrl.value) return
  const link = document.createElement('a')
  link.href = capturedImageDataUrl.value
  const timestamp = new Date().toISOString().replace(/[:.-]/g, '').slice(0, -4)
  link.download = `${overlayDetails.value?.image_name || 'foto-magica'}_${timestamp}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  toast.success('¡Foto guardada!')
}

async function retakePhoto() {
  currentViewMode.value = 'capturing'
  capturedImageDataUrl.value = ''
  if (viewActive.value && !error.value && overlayDetails.value?.r2_key) {
    await nextTick() // Asegurar que el DOM de captura esté listo
    if (videoPlayer.value) {
      await startCamera()
      // setInitialOverlaySizeAndCallInteract se llamará desde el @loadedmetadata del video
      // o desde el @load de la imagen.
    } else {
      console.error(
        '[OverlayPhoto] Retake: videoPlayer ref no está disponible después de nextTick.',
      )
    }
  }
}
</script>

<template>
  <div class="overlay-photo-capture-view">
    <div v-if="loading && currentViewMode === 'capturing'" class="loading-indicator">
      Cargando...
    </div>
    <div
      v-if="error && !loading && currentViewMode === 'capturing'"
      class="error-message central-error"
    >
      {{ error }}
    </div>

    <div v-if="!loading && overlayDetails && currentViewMode === 'capturing'" class="capture-area">
      <h2 v-if="overlayDetails.image_name" class="view-title-overlay">
        {{ overlayDetails.image_name }}
      </h2>
      <h2 v-else class="view-title-overlay">Captura de Foto Mágica</h2>

      <div class="camera-container">
        <video
          ref="videoPlayer"
          autoplay
          playsinline
          muted
          class="video-feed"
          @loadedmetadata="setInitialOverlaySizeAndCallInteract"
        ></video>
        <img
          v-if="imageUrlToLoad"
          ref="overlayImageElement"
          :src="imageUrlToLoad"
          class="overlay-image-on-camera"
          alt="Superposición"
          draggable="false"
          crossorigin="anonymous"
          @load="setInitialOverlaySizeAndCallInteract"
          @error="
            (e) => {
              e.target.style.display = 'none'
              toast.error('Fallo al cargar la imagen de superposición.')
            }
          "
          :style="{ transform: `translate(${overlayPosition.x}px, ${overlayPosition.y}px)` }"
        />
        <div
          v-else-if="!loading && overlayDetails && !overlayDetails.r2_key && !error"
          class="error-message central-error"
          style="align-self: center"
        >
          Error: La imagen de superposición no tiene una clave (r2_key) configurada.
        </div>
      </div>
      <div v-if="cameraError" class="error-message camera-error-message">{{ cameraError }}</div>
      <button
        @click="takePhotoAndPreview"
        :disabled="
          !!cameraError ||
          !cameraStream ||
          !overlayDetails ||
          isCapturing ||
          !!error ||
          !imageUrlToLoad
        "
        class="btn-capture-action"
      >
        {{ isCapturing ? 'Procesando...' : '📸 Tomar Foto' }}
      </button>
    </div>

    <div v-if="currentViewMode === 'previewing' && capturedImageDataUrl" class="preview-area">
      <h2 class="view-title-overlay">Vista Previa</h2>
      <div class="preview-image-container">
        <img :src="capturedImageDataUrl" alt="Foto capturada" class="captured-photo-preview" />
      </div>
      <div class="preview-actions">
        <button @click="downloadCapturedPhoto" class="btn-capture-action download">
          Descargar
        </button>
        <button @click="retakePhoto" class="btn-capture-action retake">Volver a Tomar</button>
      </div>
    </div>

    <div
      v-else-if="!loading && !error && !overlayDetails && currentViewMode === 'capturing'"
      class="no-details-message"
    >
      <p>No se pudieron cargar los detalles de la Foto Mágica.</p>
    </div>
  </div>
</template>

<style scoped>
.overlay-photo-capture-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #1a1a1a;
  color: #f0f0f0;
  box-sizing: border-box;
  overflow: hidden;
}
.capture-area,
.preview-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  background-color: transparent;
  padding: 15px;
  box-sizing: border-box;
}
.preview-area {
  justify-content: center;
}
.view-title-overlay {
  text-align: center;
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.3em;
  flex-shrink: 0;
  font-weight: 500;
  color: #eee;
}
.loading-indicator,
.error-message.central-error,
.no-details-message {
  margin: auto;
  font-style: italic;
  width: 100%;
  max-width: 500px;
  align-self: center;
  text-align: center;
  padding: 15px;
  border-radius: 4px;
  font-size: 1.1em;
}
.loading-indicator {
  color: #ccc;
}
.no-details-message {
  color: #ffcdd2;
  background-color: rgba(62, 39, 35, 0.8);
  border: 1px solid #b71c1c;
}
.error-message {
  color: #ff8a80;
  background-color: rgba(78, 52, 49, 0.9);
  padding: 10px;
  border: 1px solid #d32f2f;
  border-radius: 4px;
  margin-bottom: 10px;
  align-self: center;
  width: 100%;
  box-sizing: border-box;
}
.camera-error-message {
  margin-top: 10px;
}

.camera-container {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  max-height: 70vh;
  background-color: #111;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 15px;
}
.video-feed {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}
.overlay-image-on-camera {
  position: absolute;
  object-fit: contain;
  pointer-events: auto;
  z-index: 10;
  cursor: grab;
  touch-action: none;
  box-sizing: border-box;
  top: 0;
  left: 0;
}
.overlay-image-on-camera:active {
  cursor: grabbing;
}

.btn-capture-action {
  margin: 15px auto 10px auto;
  padding: 12px 25px;
  font-size: 1.1em;
  background-color: #4caf50;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  flex-shrink: 0;
  display: block;
  min-width: 200px;
  font-weight: 500;
}
.btn-capture-action:hover:not(:disabled) {
  background-color: #45a049;
}
.btn-capture-action:disabled {
  background-color: #757575;
  color: #bdbdbd;
  cursor: not-allowed;
}

.preview-image-container {
  width: 100%;
  max-height: 60vh;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  background-color: #222;
  border-radius: 8px;
}
.captured-photo-preview {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
}
.preview-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}
.preview-actions .btn-capture-action.download {
  background-color: #2196f3;
}
.preview-actions .btn-capture-action.download:hover:not(:disabled) {
  background-color: #1976d2;
}
.preview-actions .btn-capture-action.retake {
  background-color: #f44336;
}
.preview-actions .btn-capture-action.retake:hover:not(:disabled) {
  background-color: #d32f2f;
}

@media (max-width: 600px) {
  .capture-area,
  .preview-area {
    padding: 10px;
    max-width: 100%;
  }
  .view-title-overlay {
    font-size: 1.1em;
    margin-bottom: 8px;
  }
  .btn-capture-action {
    font-size: 1em;
    padding: 10px 20px;
    min-width: 180px;
  }
  .camera-container {
    min-height: 250px;
    max-height: 65vh;
  }
  .preview-image-container {
    max-height: 55vh;
  }
  .preview-actions .btn-capture-action {
    flex-basis: 45%;
    min-width: 140px;
  }
}
</style>
