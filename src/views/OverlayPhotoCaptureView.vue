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
      if (newDetails && !newDetails.r2_key) {
        error.value = 'Error: No se encontró la clave de la imagen (r2_key).'
      }
    }
  },
  { immediate: true, deep: true },
)

async function initializeView() {
  loading.value = true
  error.value = ''
  cameraError.value = ''
  overlayDetails.value = null
  imageUrlToLoad.value = ''
  isCapturing.value = false
  // No reseteamos capturedImage aquí para que se mantenga si el usuario vuelve
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach((track) => track.stop())
    cameraStream.value = null
  }
  if (videoPlayer.value && videoPlayer.value.srcObject) {
    const tracks = videoPlayer.value.srcObject.getTracks()
    tracks.forEach((track) => track.stop())
    videoPlayer.value.srcObject = null
  }
  await fetchOverlayDetails()
  loading.value = false
}

async function fetchOverlayDetails() {
  if (!props.overlayId) {
    error.value = 'No se proporcionó ID de overlay.'
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
      } else {
        throw dbError
      }
    }
    if (data) {
      overlayDetails.value = data
      if (!data.r2_key) {
        error.value = `Configuración de imagen incompleta (ID: ${props.overlayId}) (falta r2_key).`
      }
    } else {
      if (!error.value) {
        error.value = `No se encontró la Foto Mágica con ID: ${props.overlayId}`
      }
    }
  } catch (err) {
    error.value = `Error al cargar detalles: ${err.message || 'Error desconocido.'}`
  }
}

async function startCamera() {
  cameraError.value = ''
  if (!videoPlayer.value) {
    cameraError.value = 'Error interno: Referencia al reproductor de video no encontrada.'
    return
  }
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      cameraStream.value = stream
      videoPlayer.value.srcObject = stream
      try {
        await videoPlayer.value.play()
      } catch (playError) {
        cameraError.value = 'No se pudo iniciar video de cámara.'
      }
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        cameraError.value = 'Permiso denegado.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        cameraError.value = 'No se encontró cámara.'
      } else if (err.name === 'NotReadableError') {
        cameraError.value = 'Cámara en uso o no accesible.'
      } else {
        cameraError.value = `Error cámara: ${err.name}`
      }
    }
  } else {
    cameraError.value = 'API MediaDevices no soportada.'
  }
}

watch(
  [() => overlayDetails.value, () => loading.value, videoPlayer],
  async ([details, isLoadingVal, videoElm]) => {
    if (
      !isLoadingVal &&
      details &&
      details.r2_key &&
      !error.value &&
      videoElm &&
      !cameraStream.value
    ) {
      await startCamera()
    }
  },
  { immediate: true },
)

function cleanupResources() {
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach((track) => track.stop())
    cameraStream.value = null
  }
  if (videoPlayer.value && videoPlayer.value.srcObject) {
    const tracks = videoPlayer.value.srcObject.getTracks()
    tracks.forEach((track) => track.stop())
    videoPlayer.value.srcObject = null
  }
  if (interactionInstance) {
    interactionInstance.unset()
    interactionInstance = null
  }
}

onMounted(() => {
  initializeView()
})
onUnmounted(() => {
  cleanupResources()
})
onActivated(() => {
  initializeView()
}) // Re-inicializar si se usa KeepAlive
onDeactivated(() => {
  cleanupResources()
}) // Limpiar si se usa KeepAlive

function initInteractOnImage() {
  if (overlayImageElement.value && videoPlayer.value) {
    if (
      interactionInstance &&
      interactionInstance.target &&
      interactionInstance.target === overlayImageElement.value
    ) {
      interactionInstance.unset()
      interactionInstance = null
    } else if (interactionInstance) {
      interactionInstance.unset()
      interactionInstance = null
    }
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
          }), // MANTENER ASPECT RATIO
        ],
        inertia: false,
      })
  }
}

function setInitialOverlaySizeAndCallInteract() {
  const videoElem = videoPlayer.value
  const overlayImgElem = overlayImageElement.value
  if (
    videoElem &&
    overlayImgElem &&
    overlayImgElem.naturalWidth > 0 &&
    videoElem.clientWidth > 0 &&
    videoElem.clientHeight > 0
  ) {
    const videoWidth = videoElem.clientWidth
    const videoHeight = videoElem.clientHeight
    const initialWidthFactor = 0.6
    let initialWidth = videoWidth * initialWidthFactor
    let initialHeight = (overlayImgElem.naturalHeight / overlayImgElem.naturalWidth) * initialWidth
    if (initialHeight > videoHeight * initialWidthFactor) {
      initialHeight = videoHeight * initialWidthFactor
      initialWidth = (overlayImgElem.naturalWidth / overlayImgElem.naturalHeight) * initialHeight
    }
    if (initialWidth > videoWidth * 0.95) initialWidth = videoWidth * 0.95
    if (initialHeight > videoHeight * 0.95) initialHeight = videoHeight * 0.95
    overlayImgElem.style.width = `${initialWidth}px`
    overlayImgElem.style.height = `${initialHeight}px`
    overlayPosition.value.x = (videoWidth - initialWidth) / 2
    overlayPosition.value.y = (videoHeight - initialHeight) / 2
    nextTick(() => {
      initInteractOnImage()
    })
  } else if (overlayImageElement.value) {
    nextTick(() => {
      initInteractOnImage()
    })
  }
}

async function takePhoto() {
  if (!videoPlayer.value || !cameraStream.value || !overlayDetails.value) {
    toast.error('Cámara o overlay no listos.')
    return
  }
  isCapturing.value = true
  const video = videoPlayer.value
  const canvas = document.createElement('canvas')
  if (
    video.videoWidth === 0 ||
    video.videoHeight === 0 ||
    video.clientWidth === 0 ||
    video.clientHeight === 0
  ) {
    toast.error('Dimensiones de video no válidas.')
    isCapturing.value = false
    return
  }
  const videoActualWidth = video.videoWidth
  const videoActualHeight = video.videoHeight
  const canvasWidth = video.clientWidth
  const canvasHeight = video.clientHeight
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    toast.error('Error al preparar canvas.')
    isCapturing.value = false
    return
  }
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
  try {
    const imageDataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = imageDataUrl
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '').slice(0, -4)
    link.download = `${overlayDetails.value.image_name || 'foto-magica'}_${timestamp}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('¡Foto guardada!')
  } catch (e) {
    if (e.name === 'SecurityError') {
      toast.error('Error de seguridad. Revisa CORS.')
      error.value = 'Error de seguridad (CORS).'
    } else {
      toast.error('Error al guardar foto.')
      error.value = 'Error al procesar foto.'
    }
  } finally {
    isCapturing.value = false
  }
}
</script>

<template>
  <div class="overlay-photo-capture-view">
    <div v-if="loading && !overlayDetails && !error" class="loading-indicator">Cargando...</div>
    <div v-if="error && !loading" class="error-message central-error">{{ error }}</div>
    <div v-if="!loading && overlayDetails" class="capture-area">
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
        @click="takePhoto"
        :disabled="
          !!cameraError ||
          !cameraStream ||
          !overlayDetails ||
          isCapturing ||
          !!error ||
          !imageUrlToLoad
        "
        class="btn-take-photo"
      >
        {{ isCapturing ? 'Procesando...' : '📸 Tomar Foto' }}
      </button>
    </div>
    <div v-else-if="!loading && !error && !overlayDetails" class="no-details-message">
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
  background-color: #000;
  color: #f0f0f0;
  box-sizing: border-box;
  overflow: hidden;
}
.capture-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  background-color: transparent;
  overflow-y: auto;
  padding: 10px;
  box-sizing: border-box;
}
.view-title-overlay {
  text-align: center;
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 1.1em;
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
.overlay-info-header {
  margin-bottom: 5px;
  flex-shrink: 0;
  text-align: center;
}
.description-text {
  font-size: 0.8em;
  color: #bdbdbd;
  margin-bottom: 5px;
  max-height: 2.4em;
  overflow: hidden;
  text-overflow: ellipsis;
}
.camera-container {
  position: relative;
  width: 100%;
  flex-grow: 1;
  background-color: #111;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 250px;
}
.video-feed {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0;
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
.btn-take-photo {
  margin: 10px auto;
  padding: 10px 20px;
  font-size: 1em;
  background-color: #4caf50;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s;
  flex-shrink: 0;
  display: block;
  min-width: 180px;
  font-weight: 500;
}
.btn-take-photo:hover:not(:disabled) {
  background-color: #45a049;
}
.btn-take-photo:disabled {
  background-color: #757575;
  color: #bdbdbd;
  cursor: not-allowed;
}
@media (max-width: 600px) {
  .view-title-overlay {
    font-size: 0.9em;
    margin-bottom: 5px;
  }
  .btn-take-photo {
    font-size: 0.9em;
    padding: 8px 18px;
    min-width: 160px;
  }
  .description-text {
    font-size: 0.75em;
  }
  .camera-container {
    min-height: 200px;
  }
}
</style>
