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
const imagePlaneRef = ref(null)
const videoPlaneRef = ref(null)
const arViewContainerRef = ref(null)

const sceneRenderKey = ref(0) // Para forzar el remontaje de a-scene

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

let resizeDebounceTimer = null
const RESIZE_DEBOUNCE_DELAY = 400
let fullscreenChangeDebounceTimer = null
const FULLSCREEN_CHANGE_DEBOUNCE_DELAY = 400

const showFullscreenPrompt = ref(false)
const userDismissedFullscreenPrompt = ref(false)

const isSmallMobile = ref(false)
const isMobileDevice = ref(false)
const isTablet = ref(false)
const isConsideredMobileForPrompt = ref(false)

const isDeviceLandscape = ref(false)
const isInBrowserFullscreen = ref(false)
let orientationMediaQuery = null

const YOUR_R2_DOMAIN_IDENTIFIER = 'pub-48e6b80b718c43a99a9b98163de9920c.r2.dev'

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
const currentContentType = computed(() => currentContent.value?.type?.toLowerCase() || '')

const showARControls = computed(() => {
  return isARReady.value && isMarkerVisible.value && associatedContents.value.length > 1
})
const showExitFullscreenButton = computed(() => {
  return isARReady.value && isMarkerVisible.value && isInBrowserFullscreen.value
})

async function checkAndRequestCameraPermission() {
  isCheckingPermission.value = true
  cameraPermissionError.value = ''
  showCameraPermissionPrompt.value = false
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
    stream.getTracks().forEach((track) => track.stop())
    isCheckingPermission.value = false
    return true
  } catch (error) {
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
    const width = window.innerWidth
    const oldLandscape = isDeviceLandscape.value

    isSmallMobile.value = width < 480
    isMobileDevice.value = width >= 480 && width < 768
    isTablet.value = width >= 768 && width < 1200
    isConsideredMobileForPrompt.value = width < 1200

    if (screen.orientation && screen.orientation.type) {
      isDeviceLandscape.value = screen.orientation.type.startsWith('landscape')
    } else {
      isDeviceLandscape.value = window.matchMedia('(orientation: landscape)').matches
    }
    isInBrowserFullscreen.value = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    )

    if (
      isARReady.value &&
      oldLandscape !== isDeviceLandscape.value &&
      (isSmallMobile.value || isMobileDevice.value || isTablet.value)
    ) {
      console.log(
        `[ARXP Env] Cambio de orientación detectado a Landscape: ${isDeviceLandscape.value}. Forzando reinicio de escena AR.`,
      )
      isMarkerVisible.value = false // Asumir que se pierde el marcador temporalmente
      if (arSystem && typeof arSystem.stop === 'function') {
        // Detener sistema AR si existe
        try {
          arSystem.stop()
        } catch (e) {}
      }
      sceneRenderKey.value++ // Incrementar key para forzar remontaje
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
  updateOrientationAndMobileState()

  if (!isARReady.value || !isMarkerVisible.value) {
    showFullscreenPrompt.value = false
    return
  }

  if (isInBrowserFullscreen.value || userDismissedFullscreenPrompt.value) {
    showFullscreenPrompt.value = false
  } else if (isConsideredMobileForPrompt.value) {
    showFullscreenPrompt.value = true
  } else {
    showFullscreenPrompt.value = false
  }

  if (showFullscreenPrompt.value) {
    const vp = videoPlaneRef.value?.el || sceneElement?.querySelector('#videoPlane')
    const ip = imagePlaneRef.value?.el || sceneElement?.querySelector('#imagePlane')
    if (vp) vp.setAttribute('visible', 'false')
    if (ip) ip.setAttribute('visible', 'false')
    pauseVideo()
  } else if (isMarkerVisible.value && !isContentLoading.value) {
    displayCurrentContent()
  }
}

function dismissFullscreenPromptAndShowContent() {
  userDismissedFullscreenPrompt.value = true
  showFullscreenPrompt.value = false
  if (isMarkerVisible.value && isARReady.value) {
    displayCurrentContent()
    nextTick(() => {
      procesarRedimensionado(true)
    })
  }
}

function requestFullscreen() {
  const elem = arViewContainerRef.value
  if (!elem) {
    return
  }
  if (typeof document !== 'undefined' && !document.fullscreenElement) {
    const promise =
      elem.requestFullscreen?.() ||
      elem.webkitRequestFullscreen?.() ||
      elem.mozRequestFullScreen?.() ||
      elem.msRequestFullscreen?.()
    if (promise && typeof promise.catch === 'function') {
      promise.catch(() => {
        toast.info('No se pudo entrar en pantalla completa.', { timeout: 5000 })
      })
    } else if (!promise) {
      toast.info('La pantalla completa no es compatible con este navegador.', { timeout: 5000 })
    }
  }
}

function exitFullscreenCustom() {
  if (typeof document !== 'undefined' && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {})
  } else if (typeof document !== 'undefined' && document.webkitExitFullscreen) {
    document.webkitExitFullscreen()
  } else if (typeof document !== 'undefined' && document.mozCancelFullScreen) {
    document.mozCancelFullScreen()
  } else if (typeof document !== 'undefined' && document.msExitFullscreen) {
    document.msExitFullscreen()
  }
}

async function loadMarkerAndContents() {
  if (isCleaningUp.value) return
  if (!props.markerId) {
    errorLoadingContent.value = 'ID de marcador no válido.'
    isLoading.value = false
    return
  }
  isARReady.value = false
  isMarkerVisible.value = false
  associatedContents.value = []
  mindFileUrl.value = ''
  // currentContentIndex.value = 0; // No resetear aquí para persistir entre reinicios de escena por giro
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
    if (markerError) throw new Error(markerError.message)
    if (!markerData?.mind_file_name) throw new Error('Marcador sin .mind.')

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

    console.log(
      `[ARXP Load] Contenidos cargados: ${associatedContents.value.length}`,
      JSON.parse(JSON.stringify(associatedContents.value)),
    )

    if (associatedContents.value.length === 0) {
      toast.info('Este marcador no tiene contenidos para mostrar.', { timeout: 5000 })
    }

    if (mindFileUrl.value && !errorLoadingContent.value) {
      isLoading.value = false
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
  if (isContentLoading.value && !errorLoadingContent.value) return
  if (isCleaningUp.value || !isARReady.value || !isMarkerVisible.value) {
    isContentLoading.value = false
    return
  }
  if (showFullscreenPrompt.value && !userDismissedFullscreenPrompt.value) {
    isContentLoading.value = false
    return
  }

  const contentToDisplay = currentContent.value
  if (!contentToDisplay || !contentToDisplay.content_url) {
    isContentLoading.value = false
    const vpCheck = videoPlaneRef.value?.el || sceneElement?.querySelector('#videoPlane')
    const ipCheck = imagePlaneRef.value?.el || sceneElement?.querySelector('#imagePlane')
    if (vpCheck) vpCheck.setAttribute('visible', 'false')
    if (ipCheck) ipCheck.setAttribute('visible', 'false')
    return
  }

  isContentLoading.value = true
  errorLoadingContent.value = ''
  await nextTick()

  let videoPlaneEl = videoPlaneRef.value?.el
  let imagePlaneEl = imagePlaneRef.value?.el
  if (!videoPlaneEl && sceneElement) videoPlaneEl = sceneElement.querySelector('#videoPlane')
  if (!imagePlaneEl && sceneElement) imagePlaneEl = sceneElement.querySelector('#imagePlane')
  const imageAsset = document.querySelector('#imageAsset')
  const videoAsset = document.querySelector('#videoAsset')

  if (!videoPlaneEl || !imagePlaneEl || !imageAsset || !videoAsset) {
    isContentLoading.value = false
    errorLoadingContent.value = 'Error: Elementos AR no encontrados en display.'
    toast.error(errorLoadingContent.value)
    return
  }

  const type = contentToDisplay.type.toLowerCase()
  const url = contentToDisplay.content_url
  let targetPlaneElement = null,
    mediaAsset = null
  try {
    videoPlaneEl.setAttribute('visible', 'false')
    imagePlaneEl.setAttribute('visible', 'false')
    if (videoAsset.pause) videoAsset.pause()

    if (type === 'image') {
      targetPlaneElement = imagePlaneEl
      mediaAsset = imageAsset
    } else if (type === 'video') {
      targetPlaneElement = videoPlaneEl
      mediaAsset = videoAsset
      if (mediaAsset.pause) mediaAsset.pause()
      mediaAsset.removeAttribute('src')
      await nextTick()
    } else {
      throw new Error(`Tipo no soportado: ${type}`)
    }

    await loadMedia(url, mediaAsset, type)
    adjustMediaPlaneAspect(type, targetPlaneElement, mediaAsset)

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
    if (videoPlaneEl) videoPlaneEl.setAttribute('visible', 'false')
    if (imagePlaneEl) imagePlaneEl.setAttribute('visible', 'false')
  } finally {
    isContentLoading.value = false
  }
}

function loadMedia(url, mediaElement, type) {
  let urlWithCacheBust = url
  if (url && url.includes(YOUR_R2_DOMAIN_IDENTIFIER)) {
    const cacheBuster = `v=${Date.now()}`
    urlWithCacheBust = `${url}${url.includes('?') ? '&' : '?'}${cacheBuster}`
  }
  return new Promise((resolve, reject) => {
    const eventToWaitFor = type === 'image' ? 'load' : 'canplaythrough'
    const timeoutDuration = 30000

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
      let detailMessage = `Error (${errorType}) al cargar ${type} desde ${urlWithCacheBust}.`
      cleanupInternal()
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
    }
  })
}

const playVideo = async () => {
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
  const videoEl = document.querySelector('#videoAsset')
  if (videoEl && typeof videoEl.pause === 'function' && !videoEl.paused) {
    videoEl.pause()
  }
}

const adjustMediaPlaneAspect = (contentType, targetPlaneElement, mediaAssetElement) => {
  let nW = 0,
    nH = 0
  if (contentType === 'video') {
    nW = mediaAssetElement.videoWidth
    nH = mediaAssetElement.videoHeight
  } else {
    nW = mediaAssetElement.naturalWidth
    nH = mediaAssetElement.naturalHeight
  }
  if (!targetPlaneElement || !mediaAssetElement) return

  if (nW > 0 && nH > 0) {
    const aspectRatio = nW / nH
    const planeWidth = 1.0
    const planeHeight = planeWidth / aspectRatio
    targetPlaneElement.setAttribute('width', planeWidth.toString())
    targetPlaneElement.setAttribute('height', planeHeight.toString())
    targetPlaneElement.setAttribute('position', `0 0 0`)
  } else {
    targetPlaneElement.setAttribute('width', '1')
    targetPlaneElement.setAttribute('height', '1')
    targetPlaneElement.setAttribute('position', `0 0 0`)
  }
}

const handleSceneLoaded = (event) => {
  sceneElement = event.target
  if (!sceneElement) return

  addMindARListeners(sceneElement)
  addContentPlaneListeners(sceneElement)
  nextTick(hideVRButton)
}

const addContentPlaneListeners = (sceneEl) => {
  const imgPlane = imagePlaneRef.value?.el || sceneEl.querySelector('#imagePlane')
  const vidPlane = videoPlaneRef.value?.el || sceneEl.querySelector('#videoPlane')

  if (imgPlane) {
    imgPlane.removeEventListener('mousedown', handleContentClickAFRAME)
    imgPlane.addEventListener('mousedown', handleContentClickAFRAME)
  }

  if (vidPlane) {
    vidPlane.removeEventListener('mousedown', handleContentClickAFRAME)
    vidPlane.addEventListener('mousedown', handleContentClickAFRAME)
  }
}

const handleContentClickAFRAME = (event) => {
  console.log(`[ARXP AFrameInput] Evento '${event.type}' de A-Frame detectado en:`, event.target.id)
  processContentNavigation('next')
}

const handleArReady = async () => {
  if (arReadyTimeout) clearTimeout(arReadyTimeout)
  arReadyTimeout = null
  if (isCleaningUp.value) return

  isARReady.value = true
  isLoading.value = false
  if (!sceneElement && sceneRef.value?.el) sceneElement = sceneRef.value.el
  if (!sceneElement) {
    errorLoadingContent.value = 'Error: Escena AR no inicializada post arReady.'
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
  setTimeout(() => {
    if (isMarkerVisible.value && isARReady.value && !isCleaningUp.value) {
      checkAndShowFullscreenPrompt()
    }
  }, 250)
}
const handleArError = (event) => {
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

const addMindARListeners = (sceneEl) => {
  const targetMindAREntity = sceneEl.querySelector('#targetEntity')
  if (targetMindAREntity) {
    targetEntityRef.value = targetMindAREntity
    targetMindAREntity.removeEventListener('targetFound', handleTargetFound)
    targetMindAREntity.removeEventListener('targetLost', handleTargetLost)
    targetMindAREntity.addEventListener('targetFound', handleTargetFound)
    targetMindAREntity.addEventListener('targetLost', handleTargetLost)
  }
}

const handleTargetFound = () => {
  if (isCleaningUp.value) return
  clearTimeout(targetLostTimeout)
  targetLostTimeout = null
  isMarkerVisible.value = true
  errorLoadingContent.value = ''
  userDismissedFullscreenPrompt.value = false

  if (isARReady.value && associatedContents.value.length > 0) {
    checkAndShowFullscreenPrompt()
  }
}
const handleTargetLost = () => {
  if (isCleaningUp.value) return
  clearTimeout(targetLostTimeout)
  targetLostTimeout = setTimeout(() => {
    if (isCleaningUp.value) return
    isMarkerVisible.value = false
    isContentLoading.value = false
    pauseVideo()
    showFullscreenPrompt.value = false
    const currentSceneEl = sceneElement || sceneRef.value?.el
    const vp =
      videoPlaneRef.value?.el ||
      (currentSceneEl ? currentSceneEl.querySelector('#videoPlane') : null)
    const ip =
      imagePlaneRef.value?.el ||
      (currentSceneEl ? currentSceneEl.querySelector('#imagePlane') : null)
    if (vp) vp.setAttribute('visible', 'false')
    if (ip) ip.setAttribute('visible', 'false')
    targetLostTimeout = null
  }, 750)
}

const processContentNavigation = (direction = 'next') => {
  console.log(
    `[ARXP NavLogic] Navegación: ${direction}. Index actual: ${currentContentIndex.value}`,
  )
  if (
    showFullscreenPrompt.value &&
    !userDismissedFullscreenPrompt.value &&
    !isInBrowserFullscreen.value
  ) {
    console.log(
      '[ARXP NavLogic] Prompt de Fullscreen activo y no descartado (y no en fullscreen), navegación ignorada.',
    )
    return
  }
  if (!isMarkerVisible.value || !isARReady.value) {
    console.log('[ARXP NavLogic] Marcador no visible o AR no lista, navegación ignorada.')
    return
  }
  if (isContentLoading.value) {
    console.log('[ARXP NavLogic] Contenido ya está cargando, navegación ignorada.')
    return
  }

  if (associatedContents.value.length > 1) {
    pauseVideo()
    let newIndex = currentContentIndex.value
    if (direction === 'next') {
      newIndex = (currentContentIndex.value + 1) % associatedContents.value.length
    } else if (direction === 'prev') {
      newIndex =
        (currentContentIndex.value - 1 + associatedContents.value.length) %
        associatedContents.value.length
    }
    console.log(`[ARXP NavLogic] Cambiando de índice ${currentContentIndex.value} a ${newIndex}`)
    currentContentIndex.value = newIndex
  } else if (currentContentType.value === 'video' && associatedContents.value.length === 1) {
    const videoEl = document.querySelector('#videoAsset')
    if (videoEl) {
      if (videoEl.paused) playVideo()
      else pauseVideo()
    }
  } else {
    if (currentContent.value) toast.info(`Viendo: ${currentContent.value.name}`, { timeout: 1500 })
  }
}

async function cleanupARInternal(calledFromWatcher = false) {
  if (isCleaningUp.value && !calledFromWatcher) return
  isCleaningUp.value = true
  clearTimeout(arReadyTimeout)
  arReadyTimeout = null
  clearTimeout(targetLostTimeout)
  targetLostTimeout = null
  clearTimeout(resizeDebounceTimer)
  resizeDebounceTimer = null
  clearTimeout(fullscreenChangeDebounceTimer)
  fullscreenChangeDebounceTimer = null
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

  const imgPlaneEl = imagePlaneRef.value?.el || sceneElement?.querySelector('#imagePlane')
  if (imgPlaneEl) {
    imgPlaneEl.removeEventListener('mousedown', handleContentClickAFRAME)
  }
  const vidPlaneEl = videoPlaneRef.value?.el || sceneElement?.querySelector('#videoPlane')
  if (vidPlaneEl) {
    vidPlaneEl.removeEventListener('mousedown', handleContentClickAFRAME)
  }
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
  clearTimeout(resizeDebounceTimer)
  resizeDebounceTimer = setTimeout(() => {
    const previousLandscape = isDeviceLandscape.value
    updateOrientationAndMobileState() // Actualiza isDeviceLandscape entre otras

    if (
      isARReady.value &&
      previousLandscape !== isDeviceLandscape.value &&
      (isSmallMobile.value || isMobileDevice.value || isTablet.value)
    ) {
      console.log(
        `[ARXP Env] Cambio de orientación A/DESDE landscape detectado. Reiniciando escena AR via key.`,
      )
      isMarkerVisible.value = false
      if (arSystem && typeof arSystem.stop === 'function') {
        try {
          arSystem.stop()
        } catch (e) {}
      }
      sceneRenderKey.value++
    } else {
      procesarRedimensionado(false)
    }
  }, RESIZE_DEBOUNCE_DELAY)
}

const handleFullscreenChange = () => {
  clearTimeout(fullscreenChangeDebounceTimer)
  fullscreenChangeDebounceTimer = setTimeout(() => {
    updateOrientationAndMobileState()
    if (isInBrowserFullscreen.value) {
      userDismissedFullscreenPrompt.value = true
      showFullscreenPrompt.value = false
    } else {
      userDismissedFullscreenPrompt.value = false
      if (isConsideredMobileForPrompt.value && !isDeviceLandscape.value) {
        checkAndShowFullscreenPrompt()
      }
    }
    procesarRedimensionado(true)
  }, FULLSCREEN_CHANGE_DEBOUNCE_DELAY)
}

function procesarRedimensionado(isInitialOrPostPromptAdjust = false) {
  updateOrientationAndMobileState()

  if (isARReady.value && !isCleaningUp.value) {
    if (isMarkerVisible.value) {
      checkAndShowFullscreenPrompt()
    } else {
      showFullscreenPrompt.value = false
      const vp = videoPlaneRef.value?.el || sceneElement?.querySelector('#videoPlane')
      const ip = imagePlaneRef.value?.el || sceneElement?.querySelector('#imagePlane')
      if (vp) vp.setAttribute('visible', 'false')
      if (ip) ip.setAttribute('visible', 'false')
      pauseVideo()
    }
  }
  if (!isARReady.value || isCleaningUp.value) return

  const currentSceneEl = sceneElement || sceneRef.value?.el
  if (!currentSceneEl?.canvas) return

  let currentScalerEl = contentScalerRef.value?.el
  if (!currentScalerEl && sceneElement) {
    currentScalerEl = sceneElement.querySelector('#contentScaler')
  }

  if (
    currentScalerEl &&
    (isInitialOrPostPromptAdjust ||
      !(showFullscreenPrompt.value && !userDismissedFullscreenPrompt.value) ||
      isInBrowserFullscreen.value)
  ) {
    let newScale = 1.0
    if (isSmallMobile.value) {
      newScale = isDeviceLandscape.value || isInBrowserFullscreen.value ? 1.2 : 1.0
    } else if (isMobileDevice.value) {
      newScale = isDeviceLandscape.value || isInBrowserFullscreen.value ? 1.2 : 1.0
    } else if (isTablet.value) {
      newScale = isDeviceLandscape.value || isInBrowserFullscreen.value ? 1.2 : 1.0
    } else {
      newScale = isInBrowserFullscreen.value ? 1.2 : 1.0
    }

    currentScalerEl.setAttribute('scale', `${newScale} ${newScale} ${newScale}`)
    console.log(
      `[ARXP Resize] Escala aplicada: ${newScale}. SmallMobile: ${isSmallMobile.value}, MobileDevice: ${isMobileDevice.value}, Tablet: ${isTablet.value}, Landscape: ${isDeviceLandscape.value}, Fullscreen: ${isInBrowserFullscreen.value}`,
    )

    if (currentSceneEl.camera?.el?.components?.camera?.updateAspect) {
      currentSceneEl.camera.el.components.camera.updateAspect()
    }
  }

  if (
    isMarkerVisible.value &&
    isARReady.value &&
    !(showFullscreenPrompt.value && !userDismissedFullscreenPrompt.value) &&
    !isContentLoading.value
  ) {
    nextTick(() => displayCurrentContent())
  }
}

async function initializeARExperience(newMarkerId, oldMarkerId) {
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

onMounted(() => {
  updateOrientationAndMobileState()
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
  clearTimeout(resizeDebounceTimer)
  clearTimeout(fullscreenChangeDebounceTimer)
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

watch(
  () => props.markerId,
  (newMarkerId, oldMarkerId) => {
    initializeARExperience(newMarkerId, oldMarkerId)
  },
  { immediate: true },
)

watch(
  currentContent,
  (newContent, oldContent) => {
    console.log(
      `[ARXP Watch currentContent] Cambió. Nuevo: ${newContent?.name}, Viejo: ${oldContent?.name}. ARReady: ${isARReady.value}, MarkerVisible: ${isMarkerVisible.value}, IsContentLoading: ${isContentLoading.value}, ShowFullscreenPrompt: ${showFullscreenPrompt.value}, UserDismissedFullscreen: ${userDismissedFullscreenPrompt.value}`,
    )
    if (
      newContent &&
      isARReady.value &&
      isMarkerVisible.value &&
      !isContentLoading.value &&
      !(showFullscreenPrompt.value && !userDismissedFullscreenPrompt.value)
    ) {
      if ((oldContent?.id !== newContent.id || !oldContent) && !isContentLoading.value) {
        console.log(
          '[ARXP Watch currentContent] Condiciones cumplidas, llamando displayCurrentContent. Nuevo:',
          newContent?.name,
          'Viejo:',
          oldContent?.name,
        )
        displayCurrentContent()
      } else {
        console.log(
          '[ARXP Watch currentContent] No se llamó displayCurrentContent. oldContentId:',
          oldContent?.id,
          'newContentId:',
          newContent?.id,
          'isContentLoading:',
          isContentLoading.value,
        )
      }
    } else if (!newContent && isARReady.value && isMarkerVisible.value) {
      const vp = videoPlaneRef.value?.el || sceneElement?.querySelector('#videoPlane')
      const ip = imagePlaneRef.value?.el || sceneElement?.querySelector('#imagePlane')
      if (vp) vp.setAttribute('visible', 'false')
      if (ip) ip.setAttribute('visible', 'false')
      pauseVideo()
    } else {
      console.log(
        '[ARXP Watch currentContent] No se llamó displayCurrentContent debido a condiciones iniciales o prompt activo.',
      )
    }
  },
  { deep: true },
)

watch(isARReady, (ready) => {
  if (ready) {
    nextTick(() => {
      hideVRButton()
      updateOrientationAndMobileState()
      procesarRedimensionado(true)
    })
  }
})
</script>

<template>
  <div class="ar-view-container" ref="arViewContainerRef">
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
        !showCameraPermissionPrompt &&
        !isCheckingPermission
      "
      class="loading-overlay initial-loading"
    >
      <p v-if="props.markerId">Preparando marcador...</p>
      <p v-else>Esperando ID de marcador...</p>
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
          !errorLoadingContent.includes('No se pudo acceder') &&
          !errorLoadingContent.includes('Elementos AR no encontrados')
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

    <div v-if="showARControls" class="ar-controls-overlay">
      <button @click="processContentNavigation('prev')" class="ar-control-button prev-button">
        <
      </button>
      <button @click="processContentNavigation('next')" class="ar-control-button next-button">
        >
      </button>
    </div>
    <button
      v-if="showExitFullscreenButton"
      @click="exitFullscreenCustom"
      class="ar-control-button exit-fullscreen-button"
    >
      ✕
    </button>

    <div
      v-if="
        !isLoading &&
        mindFileUrl &&
        !errorLoadingContent &&
        !showCameraPermissionPrompt &&
        !isCheckingPermission &&
        !cameraPermissionError
      "
      class="ar-scene-wrapper"
    >
      <a-scene
        v-if="mindFileUrl"
        ref="sceneRef"
        :key="sceneRenderKey"
        embedded
        :mindar-image="`imageTargetSrc: ${mindFileUrl}; autoStart: true; maxTrack: 1; uiLoading: no; uiError: no; uiScanning: no; filterMinCF:0.001; filterBeta: 10; warmupTolerance: 2; missTolerance: 2;`"
        color-space="sRGB"
        renderer="colorManagement: false; physicallyCorrectLights: false; antialias: true; alpha: true; precision: medium;"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
        background="transparent: true;"
        @loaded="handleSceneLoaded"
        @arReady="handleArReady"
        @arError="handleArError"
        loading-screen="enabled: false;"
      >
        <a-assets timeout="30000">
          <video
            id="videoAsset"
            preload="auto"
            loop
            crossorigin="anonymous"
            playsinline
            webkit-playsinline
            src="data:video/mp4;base64,AAAAHGZ0eXBNNFYgAAACAGlzb21pc28yYXZjMQAAAAhmcmVlAAAAG21kYXQAAAAGgAAAAABiAhARAAAAAAAAAAA="
          ></video>
          <img
            id="imageAsset"
            crossorigin="anonymous"
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          />
        </a-assets>

        <a-camera
          position="0 0 0"
          look-controls="enabled: false"
          camera="active: false"
          cursor="rayOrigin: mouse; fuse: false;"
          raycaster="objects: a-entity, a-image, a-video; showLine: true;"
        ></a-camera>

        <a-entity id="targetEntity" mindar-image-target="targetIndex: 0">
          <a-entity ref="contentScalerRef" id="contentScaler" scale="1 1 1" position="0 0 0">
            <a-image
              ref="imagePlaneRef"
              id="imagePlane"
              class="clickable"
              position="0 0 0"
              rotation="0 0 0"
              width="1"
              height="1"
              visible="false"
              src="#imageAsset"
              material="shader: flat; transparent: true;"
            ></a-image>
            <a-video
              ref="videoPlaneRef"
              id="videoPlane"
              class="clickable"
              position="0 0 0"
              rotation="0 0 0"
              width="1"
              height="1"
              visible="false"
              src="#videoAsset"
              material="shader: flat; transparent: true;"
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
            >
              <a-ring
                radius-inner="0.08"
                radius-outer="0.12"
                color="teal"
                opacity="0.8"
                animation="property: rotation; to: 0 0 360; loop: true; dur: 1000; easing: linear;"
                material="shader: flat; transparent: true;"
              ></a-ring>
            </a-entity>
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
        !(showFullscreenPrompt && !userDismissedFullscreenPrompt) &&
        associatedContents.length > 0
      "
      class="scanning-indicator"
    >
      <p>Buscando marcador...</p>
    </div>
    <div
      v-if="
        isARReady &&
        !isMarkerVisible &&
        associatedContents.length === 0 &&
        !errorLoadingContent &&
        !isLoading &&
        mindFileUrl
      "
      class="scanning-indicator"
    >
      <p>Marcador sin contenidos. Buscando otro marcador...</p>
    </div>
  </div>
</template>

<style scoped>
.ar-view-container {
  margin: 0;
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
  background-color: transparent;
}

.ar-scene-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: transparent;
}

.ar-controls-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
  z-index: 150;
}

.ar-control-button {
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  pointer-events: auto;
  width: 55px;
  height: 55px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20px;
  user-select: none;
  font-family: 'Roboto', Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
}
.ar-control-button:hover {
  background-color: rgba(0, 0, 0, 0.8);
}

.exit-fullscreen-button {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 45px;
  height: 45px;
  font-size: 24px;
  z-index: 160;
}

:deep(.a-enter-vr-button) {
  display: none !important;
  visibility: hidden !important;
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
  font-size: 1em;
}
.loading-overlay p,
.error-display p,
.camera-permission-prompt p,
.ar-prompt-overlay p {
  margin-top: 15px;
  font-size: 1.2em;
  font-family: 'Roboto', Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
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
.retry-button,
.ar-prompt-overlay .prompt-button {
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
.ar-prompt-overlay .prompt-button {
  background-color: var(--brand-pink, #ff6b87);
  color: var(--vt-c-white, #fff);
}
.ar-prompt-overlay .prompt-button:hover {
  background-color: #e85d72;
}
.ar-prompt-overlay .prompt-button:active {
  transform: scale(0.96);
}
</style>
