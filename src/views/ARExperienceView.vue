<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from 'vue-toastification'

const props = defineProps({
  markerId: { type: String, required: true },
})

const toast = useToast()
const sceneRef = ref(null)
const targetEntityRef = ref(null)
const contentScalerRef = ref(null)
const sceneContainerRef = ref(null)
const mindFileUrl = ref('')
const associatedContents = ref([])
const currentContentIndex = ref(0)
const isLoading = ref(true)
const isContentLoading = ref(false)
const errorLoadingContent = ref('')
const isMarkerVisible = ref(false)
const isARReady = ref(false)
const showCameraPermissionPrompt = ref(false)
const cameraPermissionError = ref('')
const isCheckingPermission = ref(false)
let arSystem = null
let arReadyTimeout = null
let sceneElement = null
let cameraElement = null
let targetLostTimeout = null
const isCleaningUp = ref(false)
const imagePlaneRef = ref(null)
const videoPlaneRef = ref(null)
let resizeTimeout = null
const showFullscreenPrompt = ref(false)
const userDismissedFullscreenPrompt = ref(false)
const isMobile = ref(false) // Se actualizará en onMounted y resize
const isDeviceLandscape = ref(false) // Se actualizará

const YOUR_R2_DOMAIN_IDENTIFIER = 'pub-48e6b80b718c43a99a9b98163de9920c.r2.dev'

// Eliminadas: markerWasVisibleBeforeResize y resizeEventToken ya que simplificamos la lógica de prompts de rotación.

console.log(`[ARXP GLOBAL] Componente ARXP Creado. Props markerId: ${props.markerId}`)

const currentContent = computed(() => {
  if (
    associatedContents.value.length > 0 &&
    currentContentIndex.value >= 0 &&
    currentContentIndex.value < associatedContents.value.length
  ) {
    return associatedContents.value[currentContentIndex.value]
  }
  return null
})
const currentContentUrl = computed(() => currentContent.value?.content_url || '')
const currentContentType = computed(() => currentContent.value?.type?.toLowerCase() || '')

async function checkAndRequestCameraPermission() {
  console.log('[ARXP Perm] checkAndRequestCameraPermission INICIO')
  isCheckingPermission.value = true
  cameraPermissionError.value = ''
  showCameraPermissionPrompt.value = false
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
    stream.getTracks().forEach((track) => track.stop())
    console.log('[ARXP Perm] Permiso de cámara OTORGADO.')
    isCheckingPermission.value = false
    return true
  } catch (error) {
    console.error('[ARXP Perm] Error en getUserMedia:', error.name, error.message)
    let errorMessage = ''
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Permiso de cámara denegado.'
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = 'No se encontró cámara.'
    } else {
      errorMessage = `No se pudo acceder a la cámara: ${error.name}`
    }
    cameraPermissionError.value = errorMessage
    showCameraPermissionPrompt.value = true
    toast.error(errorMessage, { timeout: 10000 })
    isLoading.value = false
    isCheckingPermission.value = false
    return false
  }
}

async function retryCameraCheck() {
  showCameraPermissionPrompt.value = false
  cameraPermissionError.value = ''
  await initializeARExperience(props.markerId, null)
}

function updateOrientationAndMobileState() {
  if (typeof window !== 'undefined') {
    const oldMobile = isMobile.value
    const oldLandscape = isDeviceLandscape.value
    isMobile.value = window.innerWidth < 768
    if (screen.orientation && screen.orientation.type) {
      isDeviceLandscape.value = screen.orientation.type.startsWith('landscape')
    } else {
      isDeviceLandscape.value = window.matchMedia('(orientation: landscape)').matches
    }
    if (oldMobile !== isMobile.value || oldLandscape !== isDeviceLandscape.value) {
      console.log(
        `[ARXP Env] Estado actualizado. Mobile: ${isMobile.value}, Landscape: ${isDeviceLandscape.value}`,
      )
    }
  }
}

const hideVRButton = () => {
  if (sceneRef.value?.el) {
    const vrButton = sceneRef.value.el.querySelector('.a-enter-vr-button')
    if (vrButton) {
      vrButton.style.display = 'none'
      vrButton.style.visibility = 'hidden'
    }
  }
}

function checkAndShowFullscreenPrompt() {
  console.log(
    `[ARXP Prompts] checkAndShowFullscreenPrompt. ARReady: ${isARReady.value}, MarkerVisible: ${isMarkerVisible.value}, UserDismissed: ${userDismissedFullscreenPrompt.value}`,
  )
  if (!isARReady.value || !isMarkerVisible.value || userDismissedFullscreenPrompt.value) {
    showFullscreenPrompt.value = false
    return
  }
  updateOrientationAndMobileState() // Asegurar que isMobile esté actualizado
  const currentIsFullscreen = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  )

  if (isMobile.value && !currentIsFullscreen) {
    // Solo mostrar en móvil si no está ya en fullscreen
    showFullscreenPrompt.value = true
  } else {
    showFullscreenPrompt.value = false
  }

  if (showFullscreenPrompt.value) {
    const vp = sceneElement?.querySelector('#videoPlane') || videoPlaneRef.value?.el
    const ip = sceneElement?.querySelector('#imagePlane') || imagePlaneRef.value?.el
    if (vp) vp.setAttribute('visible', 'false')
    if (ip) ip.setAttribute('visible', 'false')
    pauseVideo()
  } else if (isMarkerVisible.value) {
    displayCurrentContent()
  }
}

function dismissFullscreenPromptAndShowContent() {
  userDismissedFullscreenPrompt.value = true
  showFullscreenPrompt.value = false
  if (isMarkerVisible.value && isARReady.value) {
    displayCurrentContent()
    nextTick(() => {
      handleWindowResize(true)
    })
  }
}

function requestFullscreen() {
  const elem = sceneContainerRef.value
  if (!elem) {
    toast.error('Error Fullscreen.')
    return
  }
  userDismissedFullscreenPrompt.value = true
  showFullscreenPrompt.value = false
  if (typeof document !== 'undefined' && !document.fullscreenElement) {
    const promise =
      elem.requestFullscreen?.() ||
      elem.webkitRequestFullscreen?.() ||
      elem.mozRequestFullScreen?.() ||
      elem.msRequestFullscreen?.()
    if (promise && typeof promise.catch === 'function') {
      promise.catch(() => {
        toast.info('No se pudo entrar en pantalla completa.', { timeout: 5000 })
        userDismissedFullscreenPrompt.value = false
      })
    } else if (!promise) {
      toast.info('Pantalla completa no compatible.', { timeout: 5000 })
      userDismissedFullscreenPrompt.value = false
    }
  } else if (document.fullscreenElement) {
    if (isMarkerVisible.value && isARReady.value) {
      displayCurrentContent()
      nextTick(() => {
        handleWindowResize(true)
      })
    }
  }
}

async function loadMarkerAndContents() {
  // ... (Misma lógica robusta de loadMarkerAndContents, asegurando que isLoading se pone a false)
  console.log(`[ARXP Load] loadMarkerAndContents INICIO. MarkerId: ${props.markerId}`)
  if (isCleaningUp.value) {
    console.log('[ARXP Load] Cleanup en progreso.')
    return
  }
  if (!props.markerId) {
    errorLoadingContent.value = 'ID de marcador no válido.'
    isLoading.value = false
    return
  }
  isARReady.value = false
  isMarkerVisible.value = false
  associatedContents.value = []
  mindFileUrl.value = ''
  currentContentIndex.value = 0
  userDismissedFullscreenPrompt.value = false
  showFullscreenPrompt.value = false
  if (arReadyTimeout) clearTimeout(arReadyTimeout)
  arReadyTimeout = null
  if (targetLostTimeout) clearTimeout(targetLostTimeout)
  targetLostTimeout = null
  try {
    const { data: markerData, error: markerError } = await supabase
      .from('markers')
      .select('mind_file_name')
      .eq('id', props.markerId)
      .single()
    if (markerError) {
      throw new Error(markerError.message)
    }
    if (!markerData?.mind_file_name) {
      throw new Error('Marcador sin .mind.')
    }
    let rawMindFileUrl = markerData.mind_file_name
    if (rawMindFileUrl && rawMindFileUrl.includes(YOUR_R2_DOMAIN_IDENTIFIER)) {
      const mindCacheBuster = `v=${Date.now()}`
      mindFileUrl.value = `${rawMindFileUrl}${rawMindFileUrl.includes('?') ? '&' : '?'}${mindCacheBuster}`
    } else {
      mindFileUrl.value = rawMindFileUrl
    }
    const { data: contentsData, error: contentsError } = await supabase
      .from('marker_contents')
      .select(`display_order, contents (id,content_url,type,name)`)
      .eq('marker_id', props.markerId)
      .order('display_order')
    if (contentsError) throw new Error(`Error al buscar contenidos: ${contentsError.message}`)
    associatedContents.value = (contentsData || [])
      .filter((i) => i.contents?.content_url && i.contents?.type)
      .map((i) => ({ ...i.contents, display_order: i.display_order }))
      .sort((a, b) => a.display_order - b.display_order)
    if (mindFileUrl.value && !errorLoadingContent.value) {
      isLoading.value = false
      console.log('[ARXP Load] isLoading = false. Listo para montar escena AR.')
    }
    arReadyTimeout = setTimeout(() => {
      if (
        !isARReady.value &&
        !errorLoadingContent.value &&
        !isCleaningUp.value &&
        !cameraPermissionError.value
      ) {
        errorLoadingContent.value = 'Timeout AR.'
        isARReady.value = false
        isLoading.value = false
        toast.error(errorLoadingContent.value, { timeout: 7000 })
      }
    }, 25000)
  } catch (error) {
    errorLoadingContent.value = `Error AR (load): ${error.message}.`
    toast.error(errorLoadingContent.value, { timeout: 10000 })
    isLoading.value = false
    isARReady.value = false
    if (arReadyTimeout) clearTimeout(arReadyTimeout)
  }
}

async function displayCurrentContent() {
  console.log(
    `[ARXP Display] INICIO. Marker: ${isMarkerVisible.value}, ARReady: ${isARReady.value}, ShowFullscreenPrompt: ${showFullscreenPrompt.value}, UserDismissed: ${userDismissedFullscreenPrompt.value}`,
  )
  if (isCleaningUp.value || !isARReady.value || !isMarkerVisible.value) {
    return
  }
  if (showFullscreenPrompt.value && !userDismissedFullscreenPrompt.value) {
    return
  }

  const content = currentContent.value
  if (!content || !content.content_url) {
    isContentLoading.value = false
    const vp = sceneElement?.querySelector('#videoPlane') || videoPlaneRef.value?.el
    const ip = sceneElement?.querySelector('#imagePlane') || imagePlaneRef.value?.el
    if (vp) vp.setAttribute('visible', 'false')
    if (ip) ip.setAttribute('visible', 'false')
    return
  }
  if (!sceneElement) {
    isContentLoading.value = false
    return
  }

  isContentLoading.value = true
  await nextTick()
  const videoPlane = videoPlaneRef.value?.el || sceneElement?.querySelector('#videoPlane')
  const imagePlane = imagePlaneRef.value?.el || sceneElement?.querySelector('#imagePlane')
  const imageAsset = document.querySelector('#imageAsset')
  const videoAsset = document.querySelector('#videoAsset')

  if (!videoPlane || !imagePlane || !imageAsset || !videoAsset) {
    isContentLoading.value = false
    errorLoadingContent.value = 'Error: Elementos AR no encontrados.'
    toast.error(errorLoadingContent.value)
    return
  }
  videoPlane.setAttribute('visible', 'false')
  imagePlane.setAttribute('visible', 'false')
  if (videoAsset.pause) videoAsset.pause()

  // QUITAR listeners aquí, porque se reasignan en el template con :[attribute].v-if
  // imagePlane.removeEventListener('click', handleContentClick);
  // videoPlane.removeEventListener('click', handleContentClick);

  const type = content.type.toLowerCase()
  const url = content.content_url
  let targetPlaneElement = null,
    mediaAsset = null

  try {
    if (type === 'image') {
      targetPlaneElement = imagePlane
      mediaAsset = imageAsset
    } else if (type === 'video') {
      targetPlaneElement = videoPlane
      mediaAsset = videoAsset
      if (mediaAsset.pause) mediaAsset.pause()
      mediaAsset.removeAttribute('src')
      await nextTick()
    } else {
      throw new Error(`Tipo no soportado: ${type}`)
    }

    await loadMedia(url, mediaAsset, type)
    adjustMediaPlaneAspect(type, targetPlaneElement, mediaAsset)
    // El listener de click ahora está en el template directamente en los planos

    if (
      isMarkerVisible.value &&
      isARReady.value &&
      !isCleaningUp.value &&
      !(showFullscreenPrompt.value && !userDismissedFullscreenPrompt.value)
    ) {
      targetPlaneElement.setAttribute('visible', 'true')
      if (type === 'video') {
        playVideo()
      }
    } else {
      targetPlaneElement.setAttribute('visible', 'false')
      if (type === 'video') pauseVideo()
    }
  } catch (error) {
    errorLoadingContent.value = `Error mostrando ${type}: ${error.message}`
    toast.error(errorLoadingContent.value)
    videoPlane.setAttribute('visible', 'false')
    imagePlane.setAttribute('visible', 'false')
  } finally {
    isContentLoading.value = false
  }
}

function loadMedia(url, mediaElement, type) {
  // ... (Lógica de loadMedia sin cambios) ...
  let urlWithCacheBust = url
  if (url && url.includes(YOUR_R2_DOMAIN_IDENTIFIER)) {
    const cacheBuster = `v=${Date.now()}`
    urlWithCacheBust = `${url}${url.includes('?') ? '&' : '?'}${cacheBuster}`
  }
  return new Promise((resolve, reject) => {
    const eventToWaitFor = type === 'image' ? 'load' : 'canplaythrough'
    const timeoutDuration = 20000
    mediaElement.removeEventListener('load', loadHandlerInternal)
    mediaElement.removeEventListener('canplaythrough', loadHandlerInternal)
    mediaElement.removeEventListener('loadeddata', loadHandlerInternal)
    mediaElement.removeEventListener('error', errorHandlerInternal)
    let loadTimeout = null
    function loadHandlerInternal(event) {
      if (type === 'video' && event.type === 'loadeddata' && mediaElement.readyState < 3) {
        return
      }
      clearTimeout(loadTimeout)
      cleanupInternal()
      resolve()
    }
    function errorHandlerInternal(errEvent) {
      clearTimeout(loadTimeout)
      const errorType = errEvent?.type || 'desconocido'
      let detailMessage = `Error (${errorType}) loading ${type} from ${urlWithCacheBust}.`
      cleanupInternal()
      console.error(`[ARXP LoadMedia] ${detailMessage}`, errEvent?.target?.error || errEvent)
      reject(new Error(detailMessage))
    }
    function cleanupInternal() {
      mediaElement.removeEventListener('load', loadHandlerInternal)
      mediaElement.removeEventListener('canplaythrough', loadHandlerInternal)
      mediaElement.removeEventListener('loadeddata', loadHandlerInternal)
      mediaElement.removeEventListener('error', errorHandlerInternal)
    }
    if (type === 'video' && mediaElement.pause) {
      mediaElement.pause()
      mediaElement.currentTime = 0
    }
    mediaElement.addEventListener(eventToWaitFor, loadHandlerInternal, { once: true })
    if (type === 'video')
      mediaElement.addEventListener('loadeddata', loadHandlerInternal, { once: true })
    mediaElement.addEventListener('error', errorHandlerInternal, { once: true })
    mediaElement.crossOrigin = 'anonymous'
    mediaElement.src = urlWithCacheBust
    loadTimeout = setTimeout(() => {
      errorHandlerInternal({ type: 'timeout' })
    }, timeoutDuration)
    if (type === 'video') {
      mediaElement.load()
    } else if (type === 'image' && mediaElement.complete) {
      loadHandlerInternal({ type: 'load' })
    }
  })
}

const playVideo = async () => {
  // ... (Lógica de playVideo sin cambios) ...
  const videoEl = document.querySelector('#videoAsset')
  if (
    videoEl &&
    isMarkerVisible.value &&
    isARReady.value &&
    !isCleaningUp.value &&
    !(showFullscreenPrompt.value && !userDismissedFullscreenPrompt.value)
  ) {
    await nextTick()
    if (videoEl.readyState >= 3) {
      try {
        await videoEl.play()
      } catch (e) {
        if (e.name === 'NotAllowedError') {
          toast.info('Toca el video para iniciar.', { timeout: 5000 })
        }
      }
    } else {
      const canPlayHandler = async () => {
        try {
          await videoEl.play()
        } catch (e_play) {
          /* ignore */
        }
      }
      videoEl.removeEventListener('canplaythrough', canPlayHandler)
      videoEl.addEventListener('canplaythrough', canPlayHandler, { once: true })
    }
  }
}
const pauseVideo = () => {
  // ... (Lógica de pauseVideo sin cambios) ...
  const videoEl = document.querySelector('#videoAsset')
  if (videoEl && typeof videoEl.pause === 'function' && !videoEl.paused) {
    videoEl.pause()
  }
}

const adjustMediaPlaneAspect = (contentType, targetPlaneElement, mediaAssetElement) => {
  // ... (Lógica de adjustMediaPlaneAspect sin cambios) ...
  let nW = 0,
    nH = 0
  if (contentType === 'video') {
    nW = mediaAssetElement.videoWidth
    nH = mediaAssetElement.videoHeight
  } else {
    nW = mediaAssetElement.naturalWidth
    nH = mediaAssetElement.naturalHeight
  }
  if (!targetPlaneElement || !mediaAssetElement) {
    return
  }
  if (nW > 0 && nH > 0) {
    const aspectRatio = nW / nH
    const planeWidth = 1.0
    const planeHeight = planeWidth / aspectRatio
    targetPlaneElement.setAttribute('width', planeWidth.toString())
    targetPlaneElement.setAttribute('height', planeHeight.toString())
    targetPlaneElement.setAttribute('position', `0 0 0`)
  } else {
    const fallbackWidth = 1.0
    const fallbackHeight = 1.0
    targetPlaneElement.setAttribute('width', fallbackWidth.toString())
    targetPlaneElement.setAttribute('height', fallbackHeight.toString())
    targetPlaneElement.setAttribute('position', `0 0 0`)
  }
}

const handleSceneLoaded = (event) => {
  // ... (Lógica de handleSceneLoaded sin cambios) ...
  sceneElement = event.target
  if (!sceneElement) {
    return
  }
  addEntityListeners(sceneElement)
  nextTick(hideVRButton)
}
const handleArReady = async () => {
  // ... (Lógica de handleArReady sin cambios) ...
  if (arReadyTimeout) clearTimeout(arReadyTimeout)
  arReadyTimeout = null
  if (isCleaningUp.value) {
    return
  }
  isARReady.value = true
  isLoading.value = false
  if (!sceneElement && sceneRef.value?.el) sceneElement = sceneRef.value.el
  if (!sceneElement) {
    errorLoadingContent.value = 'Error: Escena AR no inicializada.'
    toast.error(errorLoadingContent.value)
    isARReady.value = false
    return
  }
  arSystem = sceneElement.systems['mindar-image']
  cameraElement = sceneElement.querySelector('a-camera[camera]')
  if (cameraElement?.setAttribute) {
    cameraElement.setAttribute('camera', { active: true })
  }
  await nextTick()
  hideVRButton()
  if (isMarkerVisible.value) {
    checkAndShowFullscreenPrompt()
  }
}
const handleArError = (event) => {
  // ... (Lógica de handleArError sin cambios) ...
  const errorDetailSource = event.detail?.error || event.detail?.message || event.detail
  let errorDetail =
    typeof errorDetailSource === 'object'
      ? JSON.stringify(errorDetailSource)
      : String(errorDetailSource)
  if (arReadyTimeout) clearTimeout(arReadyTimeout)
  arReadyTimeout = null
  if (cameraPermissionError.value && showCameraPermissionPrompt.value) {
    isLoading.value = false
    isARReady.value = false
    return
  }
  if (
    errorDetail.includes('Camera not found') ||
    errorDetail.includes('Requested device not found') ||
    errorDetail.includes('Permission denied') ||
    errorDetail.includes('getUserMedia')
  ) {
    cameraPermissionError.value = 'Error AR: No se pudo acceder a la cámara.'
    showCameraPermissionPrompt.value = true
    errorLoadingContent.value = ''
    toast.error(cameraPermissionError.value, { timeout: 10000 })
  } else {
    errorLoadingContent.value = `Error de MindAR: ${errorDetail || 'Desconocido'}.`
    toast.error(errorLoadingContent.value, { timeout: 10000 })
  }
  isLoading.value = false
  isARReady.value = false
}

const addEntityListeners = (sceneEl) => {
  // ... (Lógica de addEntityListeners sin cambios) ...
  const targetMindAREntity = sceneEl.querySelector('#targetEntity')
  if (targetMindAREntity) {
    targetEntityRef.value = targetMindAREntity
    targetMindAREntity.removeEventListener('targetFound', handleTargetFound)
    targetMindAREntity.removeEventListener('targetLost', handleTargetLost)
    targetMindAREntity.addEventListener('targetFound', handleTargetFound)
    targetMindAREntity.addEventListener('targetLost', handleTargetLost)
  } else {
    errorLoadingContent.value = 'Error: AR target no encontrado.'
  }
}

const handleTargetFound = () => {
  if (isCleaningUp.value) {
    return
  }
  clearTimeout(targetLostTimeout)
  targetLostTimeout = null
  isMarkerVisible.value = true
  errorLoadingContent.value = ''
  if (isARReady.value && associatedContents.value.length > 0) {
    checkAndShowFullscreenPrompt()
    // No llamamos displayCurrentContent aquí directamente; el prompt o su descarte lo harán.
  }
}
const handleTargetLost = () => {
  // ... (Lógica de handleTargetLost sin cambios significativos) ...
  if (isCleaningUp.value) {
    return
  }
  clearTimeout(targetLostTimeout)
  targetLostTimeout = setTimeout(() => {
    if (isCleaningUp.value) {
      return
    }
    isMarkerVisible.value = false
    isContentLoading.value = false
    pauseVideo()
    showFullscreenPrompt.value = false
    const currentSceneEl = sceneElement || sceneRef.value?.el
    if (currentSceneEl) {
      const vp = currentSceneEl.querySelector('#videoPlane')
      const ip = currentSceneEl.querySelector('#imagePlane')
      if (vp) vp.setAttribute('visible', 'false')
      if (ip) ip.setAttribute('visible', 'false')
    } else {
      const vpRef = videoPlaneRef.value?.el
      const ipRef = imagePlaneRef.value?.el
      if (vpRef) vpRef.setAttribute('visible', 'false')
      if (ipRef) ipRef.setAttribute('visible', 'false')
    }
    targetLostTimeout = null
  }, 750)
}

const handleContentClick = (event) => {
  console.log('[ARXP ClickEvent] Click en contenido AR detectado.')
  if (showFullscreenPrompt.value && !userDismissedFullscreenPrompt.value) {
    console.log('[ARXP ClickEvent] Prompt Fullscreen activo, click ignorado temporalmente.')
    return
  }

  if (!isMarkerVisible.value || !isARReady.value) {
    console.log('[ARXP ClickEvent] Marcador no visible o AR no lista, click ignorado.')
    return
  }

  if (associatedContents.value.length > 1) {
    console.log('[ARXP ClickEvent] Múltiples contenidos. Avanzando al siguiente.')
    pauseVideo()
    currentContentIndex.value = (currentContentIndex.value + 1) % associatedContents.value.length
    console.log('[ARXP ClickEvent] Nuevo currentContentIndex:', currentContentIndex.value)
    displayCurrentContent()
  } else if (currentContentType.value === 'video' && associatedContents.value.length === 1) {
    console.log('[ARXP ClickEvent] Video único. Pausar/Reproducir.')
    const videoEl = document.querySelector('#videoAsset')
    if (videoEl) {
      if (videoEl.paused) {
        playVideo()
      } else {
        pauseVideo()
      }
    }
  } else {
    console.log(
      '[ARXP ClickEvent] Contenido único (no video) o sin contenidos. No hay acción de navegación por click.',
    )
    if (currentContent.value) toast.info(`Viendo: ${currentContent.value.name}`, { timeout: 1500 })
  }
}

async function cleanupARInternal(calledFromWatcher = false) {
  // ... (Lógica de cleanupARInternal sin cambios) ...
  if (isCleaningUp.value && !calledFromWatcher) {
    return
  }
  isCleaningUp.value = true
  clearTimeout(arReadyTimeout)
  arReadyTimeout = null
  clearTimeout(targetLostTimeout)
  targetLostTimeout = null
  clearTimeout(resizeTimeout)
  resizeTimeout = null
  pauseVideo()
  const videoEl = document.querySelector('#videoAsset')
  if (videoEl) {
    videoEl.removeAttribute('src')
    videoEl.load()
  }
  const imageEl = document.querySelector('#imageAsset')
  if (imageEl) {
    imageEl.removeAttribute('src')
  }
  const currentTargetEntity = targetEntityRef.value?.el || targetEntityRef.value
  if (currentTargetEntity && typeof currentTargetEntity.removeEventListener === 'function') {
    currentTargetEntity.removeEventListener('targetFound', handleTargetFound)
    currentTargetEntity.removeEventListener('targetLost', handleTargetLost)
  }
  targetEntityRef.value = null
  // No necesitamos quitar listeners de click de los planos aquí, ya que están en el template y se destruyen/recrean con el v-if o :key
  imagePlaneRef.value = null
  videoPlaneRef.value = null
  contentScalerRef.value = null
  const currentArSystem = arSystem
  if (currentArSystem && typeof currentArSystem.stop === 'function') {
    try {
      currentArSystem.stop()
    } catch (e) {
      /*ignore*/
    }
  }
  arSystem = null
  cameraElement = null
  const currentSceneEl = sceneElement || sceneRef.value?.el
  if (currentSceneEl) {
    currentSceneEl.removeEventListener('loaded', handleSceneLoaded)
    currentSceneEl.removeEventListener('arReady', handleArReady)
    currentSceneEl.removeEventListener('arError', handleArError)
    if (currentSceneEl.hasLoaded && typeof currentSceneEl.flushToDOM === 'function') {
      try {
        currentSceneEl.flushToDOM(true)
      } catch (e) {
        /*ignore*/
      }
    }
    if (currentSceneEl.isPlaying && typeof currentSceneEl.pause === 'function') {
      try {
        currentSceneEl.pause()
      } catch (e) {
        /*ignore*/
      }
    }
  }
  sceneElement = null
  if (sceneRef.value) sceneRef.value = null
  mindFileUrl.value = ''
  associatedContents.value = []
  currentContentIndex.value = 0
  isMarkerVisible.value = false
  isARReady.value = false
  isContentLoading.value = false
  showFullscreenPrompt.value = false
  await new Promise((resolve) => setTimeout(resolve, 100))
  isCleaningUp.value = false
}

const handleGlobalOrientationAndResize = () => {
  requestAnimationFrame(() => {
    updateOrientationAndMobileState()
    handleWindowResize(false) // No necesita token ya que markerWasVisible... fue removido
  })
}

const handleFullscreenChange = () => {
  const isCurrentlyFullscreen = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  )
  if (isCurrentlyFullscreen) {
    userDismissedFullscreenPrompt.value = true
    showFullscreenPrompt.value = false
  } else {
    userDismissedFullscreenPrompt.value = false
  } // Permitir que el prompt reaparezca si sale de fullscreen
  nextTick(() => {
    handleWindowResize(true)
  }) // true para forzar re-evaluación y posible re-display de contenido
}

const handleWindowResize = (isInitialOrPostPromptAdjust = false) => {
  console.log(
    `[ARXP Resize] handleWindowResize. Initial: ${isInitialOrPostPromptAdjust}, Marker: ${isMarkerVisible.value}, ARReady: ${isARReady.value}`,
  )

  if (isARReady.value && !isCleaningUp.value) {
    if (isMarkerVisible.value) {
      // Solo llamar si el marcador está realmente visible
      checkAndShowFullscreenPrompt()
    } else {
      // Si marcador NO visible
      showFullscreenPrompt.value = false
      const vp = sceneElement?.querySelector('#videoPlane') || videoPlaneRef.value?.el
      const ip = sceneElement?.querySelector('#imagePlane') || imagePlaneRef.value?.el
      if (vp) vp.setAttribute('visible', 'false')
      if (ip) ip.setAttribute('visible', 'false')
      pauseVideo()
    }
  }

  if (!isARReady.value || isCleaningUp.value) {
    return
  }
  const currentSceneEl = sceneElement || sceneRef.value?.el
  if (!currentSceneEl?.canvas) {
    return
  }

  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    if (isCleaningUp.value) {
      return
    }
    const currentScalerEl = contentScalerRef.value?.el
    const sceneElForTimeout = sceneElement || sceneRef.value?.el

    if (
      !sceneElForTimeout ||
      !sceneElForTimeout.renderer ||
      !sceneElForTimeout.camera ||
      !currentScalerEl
    ) {
      console.warn(`[ARXP Resize] Timeout: Elementos no encontrados. Scaler:`, currentScalerEl)
      return
    }

    if (
      !(showFullscreenPrompt.value && !userDismissedFullscreenPrompt.value) ||
      isInitialOrPostPromptAdjust
    ) {
      updateOrientationAndMobileState()
      let newScale = isMobile.value ? 1.4 : 1.2
      currentScalerEl.setAttribute('scale', `${newScale} ${newScale} ${newScale}`)
      console.log(`[ARXP Resize] Escala aplicada: ${newScale}. Mobile: ${isMobile.value}`)
      if (sceneElForTimeout.camera?.el?.components?.camera?.updateAspect) {
        sceneElForTimeout.camera.el.components.camera.updateAspect()
      }
      // sceneElForTimeout.resize(); // Sigue comentado

      if (
        isMarkerVisible.value &&
        isARReady.value &&
        !(showFullscreenPrompt.value && !userDismissedFullscreenPrompt.value)
      ) {
        nextTick(() => displayCurrentContent())
      }
    }
  }, 350)
}

async function initializeARExperience(newMarkerId, oldMarkerId) {
  console.log(`[ARXP Init] initializeARExperience INICIO. NewMarker: ${newMarkerId}`)
  if (isCleaningUp.value && oldMarkerId && !newMarkerId) {
    isLoading.value = false
    return
  }
  isLoading.value = true
  isARReady.value = false
  errorLoadingContent.value = ''
  cameraPermissionError.value = ''
  showCameraPermissionPrompt.value = false
  isMarkerVisible.value = false
  userDismissedFullscreenPrompt.value = false
  if (sceneElement || arSystem || sceneRef.value?.el) {
    await cleanupARInternal(true)
    await nextTick()
  }
  if (newMarkerId) {
    const permissionGranted = await checkAndRequestCameraPermission()
    if (permissionGranted) {
      await loadMarkerAndContents()
    } else {
      mindFileUrl.value = ''
    }
  } else {
    errorLoadingContent.value = 'No se especificó un marcador.'
    mindFileUrl.value = ''
    associatedContents.value = []
    isLoading.value = false
    isARReady.value = false
  }
}

watch(
  () => props.markerId,
  (newMarkerId, oldMarkerId) => {
    initializeARExperience(newMarkerId, oldMarkerId)
  },
  { immediate: true },
)

onMounted(() => {
  updateOrientationAndMobileState() // Llamada inicial
  window.addEventListener('resize', handleGlobalOrientationAndResize)
  if (screen.orientation && typeof screen.orientation.addEventListener === 'function') {
    screen.orientation.addEventListener('change', handleGlobalOrientationAndResize)
  } else {
    orientationMediaQuery = window.matchMedia('(orientation: landscape)')
    if (typeof orientationMediaQuery.addEventListener === 'function') {
      orientationMediaQuery.addEventListener('change', handleGlobalOrientationAndResize)
    } else if (typeof orientationMediaQuery.addListener === 'function') {
      orientationMediaQuery.addListener(handleGlobalOrientationAndResize)
    }
  }
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.addEventListener('mozfullscreenchange', handleFullscreenChange)
  document.addEventListener('MSFullscreenChange', handleFullscreenChange)
})

onUnmounted(async () => {
  clearTimeout(resizeTimeout)
  window.removeEventListener('resize', handleGlobalOrientationAndResize)
  if (screen.orientation && typeof screen.orientation.removeEventListener === 'function') {
    screen.orientation.removeEventListener('change', handleGlobalOrientationAndResize)
  } else if (orientationMediaQuery) {
    if (typeof orientationMediaQuery.removeEventListener === 'function') {
      orientationMediaQuery.removeEventListener('change', handleGlobalOrientationAndResize)
    } else if (typeof orientationMediaQuery.removeListener === 'function') {
      orientationMediaQuery.removeListener(handleGlobalOrientationAndResize)
    }
    orientationMediaQuery = null
  }
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
  await cleanupARInternal(false)
})

watch(isARReady, (ready) => {
  if (ready) {
    nextTick(() => {
      hideVRButton()
      updateOrientationAndMobileState() // Asegurar estados antes del primer resize
      handleWindowResize(true)
    })
  }
})
</script>

<template>
  <div class="ar-view-container">
    <div v-if="showCameraPermissionPrompt" class="loading-overlay camera-permission-prompt">
      <p>⚠️ {{ cameraPermissionError }}</p>
      <p v-if="cameraPermissionError.includes('denied')">Debes habilitar el permiso.</p>
      <button @click="retryCameraCheck" class="retry-button">Reintentar</button>
    </div>
    <div
      v-if="isCheckingPermission && !showCameraPermissionPrompt"
      class="loading-overlay initial-loading"
    >
      <div class="spinner"></div>
      <p>Verificando permiso...</p>
    </div>
    <div
      v-else-if="
        isLoading && !errorLoadingContent && !showCameraPermissionPrompt && !cameraPermissionError
      "
      class="loading-overlay initial-loading"
    >
      <div class="spinner"></div>
      <p>Cargando datos AR...</p>
    </div>
    <div
      v-else-if="
        !isLoading &&
        !isARReady &&
        !errorLoadingContent &&
        mindFileUrl &&
        !showCameraPermissionPrompt &&
        !cameraPermissionError
      "
      class="loading-overlay initial-loading"
    >
      <div class="spinner"></div>
      <p>Iniciando AR...</p>
    </div>
    <div
      v-else-if="
        !isLoading &&
        !mindFileUrl &&
        !errorLoadingContent &&
        !cameraPermissionError &&
        !showCameraPermissionPrompt
      "
      class="loading-overlay initial-loading"
    >
      <p>Preparando marcador...</p>
    </div>
    <div
      v-else-if="
        isContentLoading && isARReady && !showCameraPermissionPrompt && !cameraPermissionError
      "
      class="loading-overlay content-loading"
    >
      <div class="spinner"></div>
      <p>Cargando contenido...</p>
    </div>
    <div
      v-else-if="errorLoadingContent && !showCameraPermissionPrompt && !cameraPermissionError"
      class="loading-overlay error-display"
    >
      <p>⚠️ {{ errorLoadingContent }}</p>
      <button
        v-if="
          !errorLoadingContent.includes('Timeout AR') &&
          !errorLoadingContent.includes('No se pudo acceder')
        "
        @click="initializeARExperience(props.markerId, null)"
        class="retry-button"
      >
        Reintentar
      </button>
    </div>

    <div
      v-if="isARReady && isMarkerVisible && showFullscreenPrompt && !userDismissedFullscreenPrompt"
      class="ar-prompt-overlay"
    >
      <p>Para mejor experiencia, usa pantalla completa.</p>
      <button @click="requestFullscreen" class="prompt-button" style="margin-right: 10px">
        P. Completa
      </button>
      <button @click="dismissFullscreenPromptAndShowContent" class="prompt-button">
        Continuar así
      </button>
    </div>

    <div
      v-if="
        !isLoading &&
        mindFileUrl &&
        !errorLoadingContent &&
        !showCameraPermissionPrompt &&
        !isCheckingPermission &&
        !cameraPermissionError
      "
      class="ar-container"
      ref="sceneContainerRef"
    >
      <a-scene
        v-if="mindFileUrl"
        ref="sceneRef"
        :key="`${mindFileUrl}-${props.markerId}`"
        embedded
        :mindar-image="`imageTargetSrc: ${mindFileUrl}; autoStart: true; maxTrack: 1; uiLoading: no; uiError: no; uiScanning: no; filterMinCF:0.001; filterBeta: 10; warmupTolerance: 2; missTolerance: 2;`"
        color-space="sRGB"
        renderer="colorManagement: true; physicallyCorrectLights: false; antialias: true; alpha: true; precision: medium;"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
        background="transparent: true;"
        @loaded="handleSceneLoaded"
        @arReady="handleArReady"
        @arError="handleArError"
        loading-screen="enabled: false;"
      >
        <a-assets timeout="30000"
          ><video
            id="videoAsset"
            preload="auto"
            loop
            crossorigin="anonymous"
            playsinline
            webkit-playsinline
            src="data:video/mp4;base64,AAAAHGZ0eXBNNFYgAAACAGlzb21pc28yYXZjMQAAAAhmcmVlAAAAG21kYXQAAAAGgAAAAABiAhARAAAAAAAAAAA="
          ></video
          ><img
            id="imageAsset"
            crossorigin="anonymous"
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        /></a-assets>
        <a-camera
          position="0 0 0"
          look-controls="enabled: false"
          camera="active: false"
          cursor="rayOrigin: mouse; fuse: false;"
          raycaster="objects: .clickable"
        ></a-camera>
        <a-entity id="targetEntity" mindar-image-target="targetIndex: 0">
          <a-entity ref="contentScalerRef" id="contentScaler" scale="1 1 1" position="0 0 0">
            <a-image
              ref="imagePlaneRef"
              id="imagePlane"
              class="clickable"
              @click="handleContentClick"
              position="0 0 0"
              rotation="0 0 0"
              width="1"
              height="1"
              :visible="
                isARReady &&
                isMarkerVisible &&
                currentContentType === 'image' &&
                !(showFullscreenPrompt && !userDismissedFullscreenPrompt)
              "
              src="#imageAsset"
            ></a-image>
            <a-video
              ref="videoPlaneRef"
              id="videoPlane"
              class="clickable"
              @click="handleContentClick"
              position="0 0 0"
              rotation="0 0 0"
              width="1"
              height="1"
              :visible="
                isARReady &&
                isMarkerVisible &&
                currentContentType === 'video' &&
                !(showFullscreenPrompt && !userDismissedFullscreenPrompt)
              "
              src="#videoAsset"
            ></a-video>
            <a-entity
              v-if="
                isContentLoading &&
                isMarkerVisible &&
                isARReady &&
                !(showFullscreenPrompt && !userDismissedFullscreenPrompt)
              "
              position="0 0 0.1"
              rotation="0 0 0"
              ><a-ring
                radius-inner="0.08"
                radius-outer="0.12"
                color="teal"
                opacity="0.8"
                animation="property: rotation; to: 0 0 360; loop: true; dur: 1000; easing: linear;"
              ></a-ring
            ></a-entity>
          </a-entity>
        </a-entity>
      </a-scene>
    </div>
    <div
      v-if="
        isARReady &&
        !isMarkerVisible &&
        !errorLoadingContent &&
        !isLoading &&
        !(showFullscreenPrompt && !userDismissedFullscreenPrompt)
      "
      class="scanning-indicator"
    >
      <p>Buscando marcador...</p>
    </div>
  </div>
</template>

<style scoped>
/* Estilos sin cambios */
:deep(.a-enter-vr-button) {
  display: none !important;
  visibility: hidden !important;
}
.ar-view-container {
  margin: 0;
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
  background-color: transparent;
}
.loading-overlay,
.error-display,
.scanning-indicator,
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
  background-color: rgba(0, 0, 0, 0.85);
  z-index: 250;
}
.camera-permission-prompt p {
  color: #fff;
  margin-bottom: 15px;
}
.error-display {
  background-color: rgba(100, 0, 0, 0.85);
}
.scanning-indicator {
  background-color: rgba(0, 0, 0, 0);
  z-index: 10;
  justify-content: flex-end;
  padding-bottom: 8%;
}
.scanning-indicator p {
  font-style: italic;
  color: #e0e0e0;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 8px 15px;
  border-radius: 20px;
  font-size: 0.9em;
}
.loading-overlay p,
.error-display p,
.camera-permission-prompt p {
  margin-top: 15px;
  font-size: 1.1em;
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
  to {
    transform: rotate(360deg);
  }
}
.retry-button {
  margin-top: 20px;
  padding: 10px 20px;
  font-size: 1em;
  cursor: pointer;
  background-color: var(--vt-c-white-mute, #ddd);
  color: var(--vt-c-black-soft, #333);
  border: none;
  border-radius: 5px;
  transition: background-color 0.3s ease;
  pointer-events: auto;
}
.retry-button:hover {
  background-color: var(--vt-c-divider-light-1, #bbb);
}
.ar-container {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: transparent;
}
a-scene {
  display: block;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background-color: transparent !important;
}
.ar-prompt-overlay {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 40px);
  max-width: 450px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--vt-c-black-soft, rgba(34, 34, 34, 0.92));
  color: var(--vt-c-text-dark-1, #fff);
  font-family: var(--font-family-base, sans-serif);
  z-index: 210;
  text-align: center;
  padding: 20px 25px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
  opacity: 1;
  transition: opacity 0.3s ease-in-out;
}
.ar-prompt-overlay p {
  font-size: 1.15em;
  margin: 0 0 15px;
  line-height: 1.5;
}
.ar-prompt-overlay .prompt-button {
  padding: 10px 22px;
  font-size: 1em;
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
  background-color: var(--brand-pink, #ff6b87);
  color: var(--vt-c-white, #fff);
  border: none;
  border-radius: 5px;
  margin-top: 8px;
  transition:
    background-color 0.2s ease,
    transform 0.1s ease;
}
.ar-prompt-overlay .prompt-button:hover {
  background-color: #e85d72;
}
.ar-prompt-overlay .prompt-button:active {
  transform: scale(0.96);
}
</style>
