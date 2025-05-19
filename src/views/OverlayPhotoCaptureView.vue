<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import interact from 'interactjs'
import { useToast } from 'vue-toastification'

const props = defineProps({
  overlayId: {
    type: String,
    required: true,
  },
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

const R2_PUBLIC_BASE_URL = 'https://pub-48e6b80b718c43a99a9b98163de9920c.r2.dev' // CONFIRMA ESTA URL
let interactionInstance = null
const capturedImage = ref(null)
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
    console.log(
      '[OverlayPhotoCaptureView Watch] newDetails:',
      newDetails ? JSON.parse(JSON.stringify(newDetails)) : null,
    )
    if (newDetails && newDetails.r2_key) {
      const key = newDetails.r2_key
      let baseUrl = getOverlayFullUrl(key)
      const cacheBuster = `v=${Date.now()}`
      baseUrl += (baseUrl.includes('?') ? '&' : '?') + cacheBuster
      imageUrlToLoad.value = baseUrl
      console.log('[OverlayPhotoCaptureView Watch] imageUrlToLoad asignado:', imageUrlToLoad.value)
    } else {
      imageUrlToLoad.value = ''
      if (newDetails && !newDetails.r2_key) {
        console.error(
          '[OverlayPhotoCaptureView Watch] newDetails existe PERO r2_key es NULO o falta:',
          JSON.parse(JSON.stringify(newDetails)),
        )
        error.value =
          'Error: No se encontró la clave de la imagen (r2_key) en los detalles del overlay.'
      } else {
        console.log(
          '[OverlayPhotoCaptureView Watch] imageUrlToLoad limpiado (newDetails o r2_key no válidos).',
        )
      }
    }
  },
  { immediate: true, deep: true },
)

async function fetchOverlayDetails() {
  loading.value = true
  error.value = ''
  overlayDetails.value = null
  imageUrlToLoad.value = ''
  console.log(`[fetchOverlayDetails] Iniciando para overlayId: ${props.overlayId}`)
  if (!props.overlayId) {
    error.value = 'No se proporcionó ID de overlay.'
    loading.value = false
    console.error('[fetchOverlayDetails] Error:', error.value)
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
    console.log(
      `[fetchOverlayDetails] Supabase query para ID ${props.overlayId} - Status: ${status}, Error:`,
      dbError,
      'Data:',
      data ? JSON.parse(JSON.stringify(data)) : null,
    )
    if (dbError) {
      if (status === 406 || dbError.code === 'PGRST116') {
        console.warn(
          `[fetchOverlayDetails] No se encontró la Foto Mágica con ID: ${props.overlayId} (desde Supabase)`,
        )
      } else {
        throw dbError
      }
    }
    if (data) {
      overlayDetails.value = data
      console.log(
        '>>> CHECK - overlayDetails JUST SET:',
        JSON.parse(JSON.stringify(overlayDetails.value)),
      ) // Log cambiado para diferenciar
      if (!data.r2_key) {
        const missingKeyError = `La configuración de la imagen (ID: ${props.overlayId}) está incompleta (falta r2_key).`
        console.error(
          `[fetchOverlayDetails] ¡ALERTA! ${missingKeyError} Datos recibidos:`,
          JSON.parse(JSON.stringify(data)),
        )
        error.value = missingKeyError
      }
      if (typeof data.is_public === 'undefined') {
        console.warn(
          `[fetchOverlayDetails] ¡ALERTA! is_public no está definido en los datos recibidos de Supabase para el overlay ID ${props.overlayId}. Asegúrate que la columna existe y RLS la permite.`,
        )
      }
    } else {
      if (!error.value) {
        // Solo establecer este error si no hay uno más específico (como missingKeyError)
        error.value = `No se encontró la Foto Mágica con ID: ${props.overlayId}`
      }
      console.error('[fetchOverlayDetails] Error (data es nula o ya había error):', error.value)
    }
  } catch (err) {
    console.error(
      `[fetchOverlayDetails] Catch general. Error al cargar detalles para ID ${props.overlayId}:`,
      err,
    )
    error.value = `Error al cargar detalles: ${err.message || 'Error desconocido.'}`
  } finally {
    loading.value = false
    console.log(
      `[fetchOverlayDetails] Finalizado para overlayId: ${props.overlayId}. Loading: ${loading.value}, Error: "${error.value}"`,
    )
  }
}

async function startCamera() {
  cameraError.value = ''
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      cameraStream.value = stream
      if (videoPlayer.value) {
        videoPlayer.value.srcObject = stream
      }
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        cameraError.value = 'Permiso denegado para acceder a la cámara.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        cameraError.value = 'No se encontró cámara.'
      } else if (err.name === 'NotReadableError') {
        cameraError.value =
          'No se pudo acceder a la cámara. Puede que esté en uso por otra aplicación o pestaña.'
      } else {
        cameraError.value = `Error al iniciar cámara: ${err.name}`
      }
      console.error('Error al acceder a la cámara: ', err)
    }
  } else {
    cameraError.value = 'API MediaDevices no soportada.'
  }
}

function initInteractOnImage() {
  if (overlayImageElement.value) {
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
    toast.error('La cámara o el overlay no están listos.')
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
    toast.error('Dimensiones de video no válidas para captura.')
    isCapturing.value = false
    return
  }
  canvas.width = video.clientWidth
  canvas.height = video.clientHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    toast.error('Error al preparar la imagen.')
    isCapturing.value = false
    return
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
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
    capturedImage.value = imageDataUrl
    const link = document.createElement('a')
    link.href = imageDataUrl
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '').slice(0, -4)
    link.download = `${overlayDetails.value.image_name || 'foto-magica'}_${timestamp}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('¡Foto guardada!')
  } catch (e) {
    console.error('Error al procesar o descargar la imagen:', e)
    if (e.name === 'SecurityError') {
      toast.error('Error de seguridad: No se puede exportar la imagen. Revisa CORS en R2.')
      error.value =
        "Error de seguridad al procesar la imagen. Asegúrate de que CORS esté bien configurado en R2 y que la imagen tenga 'crossorigin=anonymous'."
    } else {
      toast.error('Error al guardar la foto.')
      error.value = 'Error al procesar la foto.'
    }
  } finally {
    isCapturing.value = false
  }
}

onMounted(async () => {
  console.log(`[OverlayPhotoCaptureView onMounted] Overlay ID: ${props.overlayId}`)
  await fetchOverlayDetails()
  if (overlayDetails.value && !error.value && overlayDetails.value.r2_key) {
    // Añadido chequeo de r2_key
    startCamera()
  } else {
    if (error.value) {
      console.error(
        `[OverlayPhotoCaptureView onMounted] No se pudo iniciar la cámara porque hubo un error al cargar detalles: ${error.value}`,
      )
    }
    if (!overlayDetails.value) {
      console.error(
        `[OverlayPhotoCaptureView onMounted] No se pudo iniciar la cámara porque overlayDetails es nulo.`,
      )
    }
    if (overlayDetails.value && !overlayDetails.value.r2_key) {
      console.error(
        `[OverlayPhotoCaptureView onMounted] No se pudo iniciar la cámara porque overlayDetails.r2_key es nulo o no está definido.`,
      )
    }
  }
})

onUnmounted(() => {
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach((track) => track.stop())
  }
  if (interactionInstance) {
    interactionInstance.unset()
    interactionInstance = null
  }
})
</script>

<template>
  <div class="overlay-photo-capture-view">
    <h2 v-if="overlayDetails && overlayDetails.image_name" class="view-title-overlay">
      {{ overlayDetails.image_name }}
    </h2>
    <h2 v-else-if="!loading" class="view-title-overlay">Captura de Foto Mágica</h2>
    <div v-if="loading && !overlayDetails" class="loading-indicator">Cargando...</div>
    <div v-if="error && !loading" class="error-message central-error">{{ error }}</div>
    <div v-if="!loading && overlayDetails" class="capture-area">
      <div v-if="overlayDetails.description" class="overlay-info-header">
        <p class="description-text">{{ overlayDetails.description }}</p>
      </div>
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
              console.error(
                'Error al cargar imagen de superposición:',
                e,
                'URL intentada:',
                imageUrlToLoad,
              )
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
      <div v-if="capturedImage" class="captured-image-preview">
        <h4>¡Foto Capturada!</h4>
        <img :src="capturedImage" alt="Foto capturada" />
        <p><small>(Debería haberse descargado automáticamente)</small></p>
      </div>
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
  padding: 10px;
}
.view-title-overlay {
  text-align: center;
  margin-top: 0;
  margin-bottom: 10px;
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
  width: calc(100% - 20px);
  max-width: 600px;
  box-sizing: border-box;
}
.camera-error-message {
  margin-top: 10px;
}
.capture-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: transparent;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  overflow: hidden;
}
.overlay-info-header {
  margin-bottom: 8px;
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
.captured-image-preview {
  margin: 10px auto 0;
  border: 1px dashed #616161;
  padding: 8px;
  flex-shrink: 0;
  text-align: center;
  max-width: calc(100% - 20px);
  background-color: rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}
.captured-image-preview h4 {
  margin-top: 0;
  margin-bottom: 5px;
  font-size: 0.9em;
  color: #eee;
}
.captured-image-preview img {
  max-width: 100%;
  max-height: 80px;
  height: auto;
  border: 1px solid #424242;
  display: block;
  margin: 0 auto 5px;
  background-color: #fff;
}
.captured-image-preview p {
  font-size: 0.75em;
  color: #bdbdbd;
  margin: 0;
}
@media (max-width: 600px) {
  .view-title-overlay {
    font-size: 1em;
    margin-bottom: 8px;
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
  .captured-image-preview img {
    max-height: 70px;
  }
}
</style>
