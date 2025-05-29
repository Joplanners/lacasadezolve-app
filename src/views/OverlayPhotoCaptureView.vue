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
const videoPlayer = ref(null) // Ref to the <video> DOM element
const cameraStream = ref(null) // Ref to the MediaStream object
const cameraError = ref('')
const overlayImageElement = ref(null)
const overlayPosition = ref({ x: 0, y: 0 })
const R2_PUBLIC_BASE_URL = 'https://pub-48e6b80b718c43a99a9b98163de9920c.r2.dev'
let interactionInstance = null
const isCapturing = ref(false)
const imageUrlToLoad = ref('')
const viewActive = ref(false) // Para controlar la activación de la cámara

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
        // error.value = 'Error: No se encontró la clave de la imagen (r2_key).'
        // No establecer error aquí para permitir que fetchOverlayDetails lo maneje
      }
    }
  },
  { immediate: true, deep: true },
)

async function initializeView() {
  console.log('[OverlayPhoto] InitializeView START')
  loading.value = true
  error.value = ''
  cameraError.value = ''
  // overlayDetails.value = null; // No resetear para que el watch no se dispare innecesariamente si ya están
  // imageUrlToLoad.value = ''; // El watch de overlayDetails lo maneja
  isCapturing.value = false

  cleanupCamera() // Limpia la cámara primero

  await fetchOverlayDetails()
  loading.value = false
  console.log('[OverlayPhoto] InitializeView END, loading:', loading.value, 'error:', error.value)

  // Intentar iniciar la cámara después de que todo esté cargado y la vista esté activa
  if (viewActive.value && !error.value && overlayDetails.value?.r2_key) {
    console.log(
      '[OverlayPhoto] InitializeView: Condiciones para startCamera met. Llamando a startCamera.',
    )
    await startCamera()
  } else {
    console.log(
      '[OverlayPhoto] InitializeView: Condiciones para startCamera NO met. viewActive:',
      viewActive.value,
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
        // Not found or no exact one row
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
      // Si no hay data y no hubo error antes (como el 406)
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
        video: { facingMode: 'user' }, // 'environment' para cámara trasera
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
    // No es necesario detener los tracks de srcObject si ya detuvimos los de cameraStream
    // y vamos a setear srcObject a null.
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
  console.log('[OverlayPhoto] Component Mounted. Initializing view...')
  viewActive.value = true
  initializeView()
})

onUnmounted(() => {
  console.log('[OverlayPhoto] Component Unmounted. Cleaning up resources...')
  viewActive.value = false
  cleanupCamera()
  cleanupInteract()
})

onActivated(() => {
  // Se llama cuando un componente en <KeepAlive> se activa
  console.log('[OverlayPhoto] Component Activated. Re-initializing view...')
  viewActive.value = true
  initializeView()
})

onDeactivated(() => {
  // Se llama cuando un componente en <KeepAlive> se desactiva
  console.log('[OverlayPhoto] Component Deactivated. Cleaning up resources...')
  viewActive.value = false
  cleanupCamera()
  cleanupInteract()
})

function initInteractOnImage() {
  if (overlayImageElement.value && videoPlayer.value) {
    cleanupInteract() // Limpiar instancia previa si existe

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
    overlayImgElem.naturalWidth > 0 &&
    videoElem.videoWidth > 0 && // Usar videoWidth/videoHeight para dimensiones reales del video
    videoElem.videoHeight > 0
  ) {
    // Esperar a que el video tenga dimensiones antes de calcular
    if (videoElem.readyState < videoElem.HAVE_METADATA) {
      // HAVE_METADATA es 1
      console.log('[OverlayPhoto] Video metadata not loaded yet for initial size. Waiting.')
      videoElem.onloadedmetadata = () => {
        // Re-llamar cuando metadata esté lista
        console.log('[OverlayPhoto] Video metadata loaded. Recalculating initial size.')
        setInitialOverlaySizeAndCallInteract()
        videoElem.onloadedmetadata = null // Limpiar handler
      }
      return
    }

    const videoDisplayWidth = videoElem.clientWidth // Ancho visual del elemento video
    const videoDisplayHeight = videoElem.clientHeight // Alto visual del elemento video

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
    // Si el video aún no está listo pero la imagen sí, inicializar interact para que al menos la imagen sea manipulable
    // aunque el tamaño inicial pueda no ser perfecto.
    console.warn(
      '[OverlayPhoto] Video dimensions not ready for precise initial sizing, initializing InteractJS with image defaults.',
    )
    nextTick(() => {
      initInteractOnImage()
    })
  }
}

async function takePhoto() {
  if (!videoPlayer.value || !cameraStream.value || !overlayDetails.value) {
    toast.error('Cámara o superposición no están listos.')
    return
  }
  isCapturing.value = true
  const video = videoPlayer.value
  const canvas = document.createElement('canvas')

  // Usar las dimensiones del elemento video tal como se muestra, no videoWidth/Height que pueden ser diferentes
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

  // Dibujar el video centrado y ajustado (cover) en el canvas
  const videoActualWidth = video.videoWidth
  const videoActualHeight = video.videoHeight
  const videoAspectRatio = videoActualWidth / videoActualHeight
  const canvasAspectRatio = canvasWidth / canvasHeight
  let renderWidth, renderHeight, xStart, yStart

  if (videoAspectRatio > canvasAspectRatio) {
    // Video más ancho que el canvas
    renderHeight = canvasHeight
    renderWidth = renderHeight * videoAspectRatio
    xStart = (canvasWidth - renderWidth) / 2
    yStart = 0
  } else {
    // Video más alto que el canvas (o igual aspect ratio)
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
      toast.error('Error de seguridad. Revisa CORS si la imagen de superposición es externa.')
      error.value = 'Error de seguridad (CORS).'
    } else {
      toast.error('Error al guardar la foto.')
      error.value = 'Error al procesar la foto.'
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
  max-width: 700px; /* O el max-width que prefieras */
  margin-left: auto;
  margin-right: auto;
  background-color: transparent;
  overflow-y: auto; /* Permitir scroll si el contenido es muy alto */
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

.camera-container {
  position: relative;
  width: 100%;
  flex-grow: 1;
  background-color: #111; /* Fondo mientras carga el video */
  border-radius: 4px;
  overflow: hidden; /* Importante para que la imagen no se salga */
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 250px; /* O un valor que se ajuste a tus necesidades */
}
.video-feed {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover; /* Cubre el contenedor, puede recortar un poco */
  border-radius: 0; /* Si el contenedor ya tiene radius */
  z-index: 1;
}
.overlay-image-on-camera {
  position: absolute;
  object-fit: contain;
  pointer-events: auto; /* Para que interactjs funcione */
  z-index: 10;
  cursor: grab;
  touch-action: none; /* Crucial para interactjs en táctiles */
  box-sizing: border-box; /* Para que width/height incluyan padding/border */
  /* El tamaño inicial se establece en JS */
  top: 0; /* Interactjs lo moverá con transform */
  left: 0; /* Interactjs lo moverá con transform */
}
.overlay-image-on-camera:active {
  cursor: grabbing;
}
.btn-take-photo {
  margin: 10px auto;
  padding: 10px 20px;
  font-size: 1em;
  background-color: #4caf50; /* Un verde agradable */
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s;
  flex-shrink: 0; /* Para que no se encoja si hay poco espacio */
  display: block; /* Para que el margin:auto funcione */
  min-width: 180px;
  font-weight: 500;
}
.btn-take-photo:hover:not(:disabled) {
  background-color: #45a049;
}
.btn-take-photo:disabled {
  background-color: #757575; /* Gris para deshabilitado */
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
  .camera-container {
    min-height: 200px;
  }
}
</style>
