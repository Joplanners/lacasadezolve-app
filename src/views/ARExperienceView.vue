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
let sceneElement = null // Almacenará el elemento de la escena A-Frame
let cameraElement = null // Almacenará el elemento de la cámara A-Frame
let targetLostTimeout = null
const isCleaningUp = ref(false)
const imagePlaneRef = ref(null)
const videoPlaneRef = ref(null)
let resizeTimeout = null
const showRotatePrompt = ref(false)
const showFullscreenPrompt = ref(false)
const userDismissedPrompt = ref(false)
const isMobileForPrompt = ref(false)
const isDeviceLandscape = ref(window.matchMedia('(orientation: landscape)').matches)
const YOUR_R2_DOMAIN_IDENTIFIER = 'pub-48e6b80b718c43a99a9b98163de9920c.r2.dev'

let markerWasVisibleBeforeResize = false
let resizeEventToken = 0

console.log(`[ARXP GLOBAL] Componente ARXP Creado/Inicializado. Props markerId: ${props.markerId}`)

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
      errorMessage = 'Permiso de cámara denegado. Habilítalo en ajustes y recarga.'
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = 'No se encontró cámara. Asegúrate de tener una conectada y habilitada.'
    } else {
      errorMessage = `No se pudo acceder a la cámara: ${error.name} - ${error.message}`
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
  console.log('[ARXP Perm] Reintentando chequeo de cámara...')
  showCameraPermissionPrompt.value = false
  cameraPermissionError.value = ''
  await initializeARExperience(props.markerId, null)
}

function updateOrientationState() {
  const oldOrientation = isDeviceLandscape.value
  if (screen.orientation && screen.orientation.type) {
    isDeviceLandscape.value = screen.orientation.type.startsWith('landscape')
  } else {
    isDeviceLandscape.value = window.matchMedia('(orientation: landscape)').matches
  }

  if (oldOrientation !== isDeviceLandscape.value) {
    console.log(
      `[ARXP Orientation] CAMBIO. Landscape ANTES: ${oldOrientation}, AHORA: ${isDeviceLandscape.value}. MarkerVisible: ${isMarkerVisible.value}`,
    )
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

function checkAndShowPrompts(currentResizeToken = 0) {
  const considerMarkerVisibleForPrompts =
    markerWasVisibleBeforeResize &&
    currentResizeToken !== 0 &&
    currentResizeToken === resizeEventToken &&
    isDeviceLandscape.value
      ? true
      : isMarkerVisible.value

  console.log(
    `[ARXP Prompts] checkAndShowPrompts (#${currentResizeToken}) INICIO. MarkerVisible(actual): ${isMarkerVisible.value}, MarkerVisible(prompts): ${considerMarkerVisibleForPrompts}, ARReady: ${isARReady.value}, UserDismissed: ${userDismissedPrompt.value}, Landscape: ${isDeviceLandscape.value}`,
  )

  if (!isARReady.value || !considerMarkerVisibleForPrompts) {
    showRotatePrompt.value = false
    showFullscreenPrompt.value = false
    const vp = sceneElement?.querySelector('#videoPlane') || videoPlaneRef.value?.el
    const ip = sceneElement?.querySelector('#imagePlane') || imagePlaneRef.value?.el
    if (vp) vp.setAttribute('visible', 'false')
    if (ip) ip.setAttribute('visible', 'false')
    pauseVideo()
    return
  }

  if (
    userDismissedPrompt.value &&
    (currentResizeToken === 0 ||
      currentResizeToken !== resizeEventToken ||
      !markerWasVisibleBeforeResize)
  ) {
    showRotatePrompt.value = false
    showFullscreenPrompt.value = false
    if (isMarkerVisible.value) displayCurrentContent()
    return
  }

  isMobileForPrompt.value = window.innerWidth < 768

  const currentIsFullscreen = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  )

  let needsRotatePrompt =
    isMobileForPrompt.value && !isDeviceLandscape.value && considerMarkerVisibleForPrompts
  let needsFullscreenPrompt =
    isMobileForPrompt.value &&
    isDeviceLandscape.value &&
    considerMarkerVisibleForPrompts &&
    !currentIsFullscreen

  if (needsRotatePrompt) {
    showRotatePrompt.value = true
    showFullscreenPrompt.value = false
  } else if (needsFullscreenPrompt) {
    showFullscreenPrompt.value = true
    showRotatePrompt.value = false
  } else {
    showRotatePrompt.value = false
    showFullscreenPrompt.value = false
  }
  console.log(
    `[ARXP Prompts] (#${currentResizeToken}) FIN. Rotate: ${showRotatePrompt.value}, Fullscreen: ${showFullscreenPrompt.value}. MarkerVisible(actual): ${isMarkerVisible.value}`,
  )

  if (showRotatePrompt.value || showFullscreenPrompt.value) {
    const vp = sceneElement?.querySelector('#videoPlane') || videoPlaneRef.value?.el
    const ip = sceneElement?.querySelector('#imagePlane') || imagePlaneRef.value?.el
    if (vp) vp.setAttribute('visible', 'false')
    if (ip) ip.setAttribute('visible', 'false')
    pauseVideo()
  } else if (isMarkerVisible.value) {
    displayCurrentContent()
  }
}

function dismissPromptAndShowContent() {
  console.log('[ARXP Prompts] dismissPromptAndShowContent.')
  userDismissedPrompt.value = true
  showRotatePrompt.value = false
  showFullscreenPrompt.value = false
  nextTick(() => {
    handleWindowResize(true, resizeEventToken)
  })
}

function requestFullscreen() {
  const elem = sceneContainerRef.value
  console.log('[ARXP Fullscreen] Intentando para:', elem)
  if (!elem) {
    console.error('[ARXP Fullscreen] sceneContainerRef no encontrado.')
    toast.error('Error Fullscreen.')
    return
  }
  if (typeof document !== 'undefined' && !document.fullscreenElement) {
    const promise =
      elem.requestFullscreen?.() ||
      elem.webkitRequestFullscreen?.() ||
      elem.mozRequestFullScreen?.() ||
      elem.msRequestFullscreen?.()
    if (promise && typeof promise.catch === 'function') {
      promise.catch((err) => {
        console.error('[ARXP Fullscreen] Error al solicitar:', err.name, err.message)
        toast.info('No se pudo entrar en pantalla completa.', { timeout: 5000 })
      })
    } else if (!promise) {
      console.warn('[ARXP Fullscreen] API no disponible.')
      toast.info('Pantalla completa no compatible.', { timeout: 5000 })
    }
  } else if (document.fullscreenElement) {
    userDismissedPrompt.value = true
    showFullscreenPrompt.value = false
    showRotatePrompt.value = false
    nextTick(() => {
      handleWindowResize(true, resizeEventToken)
    })
  }
}

function nextContent() {
  if (
    associatedContents.value.length <= 1 ||
    !isMarkerVisible.value ||
    isContentLoading.value ||
    !isARReady.value ||
    ((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value)
  )
    return
  pauseVideo()
  currentContentIndex.value = (currentContentIndex.value + 1) % associatedContents.value.length
  displayCurrentContent()
}
function prevContent() {
  if (
    associatedContents.value.length <= 1 ||
    !isMarkerVisible.value ||
    isContentLoading.value ||
    !isARReady.value ||
    ((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value)
  )
    return
  pauseVideo()
  currentContentIndex.value =
    (currentContentIndex.value - 1 + associatedContents.value.length) %
    associatedContents.value.length
  displayCurrentContent()
}

async function loadMarkerAndContents() {
  console.log(`[ARXP Load] loadMarkerAndContents INICIO. MarkerId: ${props.markerId}`)
  if (isCleaningUp.value) {
    console.log('[ARXP Load] Cleanup en progreso.')
    return
  }
  if (!props.markerId) {
    errorLoadingContent.value = 'ID de marcador no válido.'
    isLoading.value = false
    console.log('[ARXP Load] No markerId.')
    return
  }

  isARReady.value = false
  isMarkerVisible.value = false
  associatedContents.value = []
  mindFileUrl.value = ''
  currentContentIndex.value = 0
  userDismissedPrompt.value = false
  showRotatePrompt.value = false
  showFullscreenPrompt.value = false

  if (arReadyTimeout) clearTimeout(arReadyTimeout)
  arReadyTimeout = null
  if (targetLostTimeout) clearTimeout(targetLostTimeout)
  targetLostTimeout = null

  try {
    const { data: markerData, error: markerError } = await supabase
      .from('markers')
      .select('mind_file_name, name, user_id, is_public')
      .eq('id', props.markerId)
      .single()
    if (markerError) {
      if (markerError.code === 'PGRST116')
        throw new Error(`Marcador ${props.markerId} no encontrado.`)
      throw new Error(markerError.message)
    }
    if (!markerData?.mind_file_name) {
      throw new Error('Marcador sin .mind o datos inválidos.')
    }

    let rawMindFileUrl = markerData.mind_file_name
    if (rawMindFileUrl && rawMindFileUrl.includes(YOUR_R2_DOMAIN_IDENTIFIER)) {
      const mindCacheBuster = `v=${Date.now()}`
      mindFileUrl.value = `${rawMindFileUrl}${rawMindFileUrl.includes('?') ? '&' : '?'}${mindCacheBuster}`
    } else {
      mindFileUrl.value = rawMindFileUrl
    }
    if (!mindFileUrl.value) {
      throw new Error('Error crítico: mindFileUrl nulo post-procesado.')
    }

    const { data: contentsData, error: contentsError } = await supabase
      .from('marker_contents')
      .select(`display_order, contents (id,content_url,type,name,is_public,user_id)`)
      .eq('marker_id', props.markerId)
      .order('display_order')
    if (contentsError) throw new Error(`Error al buscar contenidos: ${contentsError.message}`)
    associatedContents.value = (contentsData || [])
      .filter((i) => i.contents?.content_url && i.contents?.type)
      .map((i) => ({ ...i.contents, display_order: i.display_order }))
      .sort((a, b) => a.display_order - b.display_order)

    if (mindFileUrl.value && associatedContents.value.length >= 0 && !errorLoadingContent.value) {
      isLoading.value = false
      console.log('[ARXP Load] isLoading = false. Listo para montar escena AR.')
    } else {
      console.warn(
        '[ARXP Load] mindFileUrl no listo o error previo. isLoading no se cambia a false aquí.',
      )
    }

    arReadyTimeout = setTimeout(() => {
      if (
        !isARReady.value &&
        !errorLoadingContent.value &&
        !isCleaningUp.value &&
        !cameraPermissionError.value
      ) {
        errorLoadingContent.value = 'Timeout AR: La carga tardó demasiado.'
        isARReady.value = false
        isLoading.value = false
        toast.error(errorLoadingContent.value, { timeout: 7000 })
      }
    }, 25000)
  } catch (error) {
    errorLoadingContent.value = `Error AR (loadMarker): ${error.message}.`
    toast.error(errorLoadingContent.value, { timeout: 10000 })
    isLoading.value = false
    isARReady.value = false
    if (arReadyTimeout) clearTimeout(arReadyTimeout)
  }
}

async function displayCurrentContent() {
  const currentResizeTokenVal = resizeEventToken // Capturar token al inicio
  console.log(
    `[ARXP Display] (#${currentResizeTokenVal}) displayCurrentContent INICIO. MarkerVisible: ${isMarkerVisible.value}, ARReady: ${isARReady.value}, ContentLoading: ${isContentLoading.value}`,
  )

  if (isCleaningUp.value) {
    console.log(`[ARXP Display] (#${currentResizeTokenVal}) Aborted: cleanup.`)
    return
  }
  if (!isARReady.value || !isMarkerVisible.value) {
    console.log(
      `[ARXP Display] (#${currentResizeTokenVal}) Aborted: AR not ready or marker not visible.`,
    )
    return
  }
  if (
    (showRotatePrompt.value || showFullscreenPrompt.value) &&
    !userDismissedPrompt.value &&
    !showCameraPermissionPrompt.value
  ) {
    console.log(`[ARXP Display] (#${currentResizeTokenVal}) Aborted: prompts active.`)
    return
  }
  if (showCameraPermissionPrompt.value || isCheckingPermission.value) {
    console.log(`[ARXP Display] (#${currentResizeTokenVal}) Aborted: camera perm handling.`)
    return
  }

  const content = currentContent.value
  if (!content || !content.content_url) {
    const vp = sceneElement?.querySelector('#videoPlane') || videoPlaneRef.value?.el
    const ip = sceneElement?.querySelector('#imagePlane') || imagePlaneRef.value?.el
    if (vp) vp.setAttribute('visible', 'false')
    if (ip) ip.setAttribute('visible', 'false')
    isContentLoading.value = false
    return
  }
  if (!sceneElement) {
    console.error(`[ARXP Display] (#${currentResizeTokenVal}) Aborted: sceneElement null.`)
    isContentLoading.value = false
    return
  }

  isContentLoading.value = true
  await nextTick()

  const videoPlaneCurrent = videoPlaneRef.value?.el || sceneElement?.querySelector('#videoPlane')
  const imagePlaneCurrent = imagePlaneRef.value?.el || sceneElement?.querySelector('#imagePlane')
  const imageAsset = document.querySelector('#imageAsset')
  const videoAsset = document.querySelector('#videoAsset')

  if (!videoPlaneCurrent || !imagePlaneCurrent || !imageAsset || !videoAsset) {
    console.error(
      `[ARXP Display] (#${currentResizeTokenVal}) Error crítico: Planos o assets no encontrados.`,
    )
    isContentLoading.value = false
    errorLoadingContent.value = 'Error: Elementos AR no encontrados.'
    toast.error(errorLoadingContent.value)
    return
  }
  videoPlaneCurrent.setAttribute('visible', 'false')
  imagePlaneCurrent.setAttribute('visible', 'false')
  if (videoAsset.pause) videoAsset.pause()

  imagePlaneCurrent.removeEventListener('click', handleContentClick)
  videoPlaneCurrent.removeEventListener('click', handleContentClick)

  const type = content.type.toLowerCase()
  const url = content.content_url
  let targetPlaneElement = null
  let mediaAsset = null

  try {
    if (type === 'image') {
      targetPlaneElement = imagePlaneCurrent
      mediaAsset = imageAsset
      await loadMedia(url, mediaAsset, type)
    } else if (type === 'video') {
      targetPlaneElement = videoPlaneCurrent
      mediaAsset = videoAsset
      if (mediaAsset.pause) mediaAsset.pause()
      mediaAsset.removeAttribute('src')
      await nextTick()
      await loadMedia(url, mediaAsset, type)
    } else {
      throw new Error(`Tipo de contenido no soportado: ${type}`)
    }

    adjustMediaPlaneAspect(type, targetPlaneElement, mediaAsset)
    if (targetPlaneElement) targetPlaneElement.addEventListener('click', handleContentClick)

    if (
      isMarkerVisible.value &&
      isARReady.value &&
      !isCleaningUp.value &&
      !((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value) &&
      !showCameraPermissionPrompt.value
    ) {
      if (targetPlaneElement) targetPlaneElement.setAttribute('visible', 'true')
      if (type === 'video') {
        playVideo()
      }
    } else {
      if (targetPlaneElement) targetPlaneElement.setAttribute('visible', 'false')
      if (type === 'video') pauseVideo()
    }
  } catch (error) {
    console.error(
      `[ARXP Display] (#${currentResizeTokenVal}) Error al cargar/mostrar ${type} (${url}):`,
      error,
    )
    errorLoadingContent.value = `Error mostrando ${type}: ${error.message}`
    toast.error(errorLoadingContent.value)
    if (videoPlaneCurrent) videoPlaneCurrent.setAttribute('visible', 'false')
    if (imagePlaneCurrent) imagePlaneCurrent.setAttribute('visible', 'false')
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
      let detailMessage = `Error (${errorType}) al cargar ${type} desde ${urlWithCacheBust}.`
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
  const videoEl = document.querySelector('#videoAsset')
  if (
    videoEl &&
    isMarkerVisible.value &&
    isARReady.value &&
    !isCleaningUp.value &&
    !showCameraPermissionPrompt.value &&
    !((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value)
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
  sceneElement = event.target
  if (!sceneElement) {
    return
  }
  addEntityListeners(sceneElement)
  nextTick(hideVRButton)
}
const handleArReady = async () => {
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
    checkAndShowPrompts(resizeEventToken)
  }
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

const addEntityListeners = (sceneEl) => {
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
    checkAndShowPrompts(resizeEventToken)
  }
}

const handleTargetLost = () => {
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
    showRotatePrompt.value = false
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
  if (
    currentContentType.value === 'video' &&
    associatedContents.value.length <= 1 &&
    !((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value)
  ) {
    const videoEl = document.querySelector('#videoAsset')
    if (videoEl) {
      if (videoEl.paused) {
        playVideo()
      } else {
        pauseVideo()
      }
    }
  } else if (
    associatedContents.value.length > 1 &&
    !((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value)
  ) {
    nextContent()
  }
}

async function cleanupARInternal(calledFromWatcher = false) {
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
  const imgPlane = imagePlaneRef.value?.el
  if (imgPlane && typeof imgPlane.removeEventListener === 'function') {
    imgPlane.removeEventListener('click', handleContentClick)
  }
  imagePlaneRef.value = null
  const vidPlane = videoPlaneRef.value?.el
  if (vidPlane && typeof vidPlane.removeEventListener === 'function') {
    vidPlane.removeEventListener('click', handleContentClick)
  }
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
  showRotatePrompt.value = false
  showFullscreenPrompt.value = false
  await new Promise((resolve) => setTimeout(resolve, 100))
  isCleaningUp.value = false
}

const handleOrientationAndResize = () => {
  const newResizeToken = Date.now()
  markerWasVisibleBeforeResize = isMarkerVisible.value
  resizeEventToken = newResizeToken
  requestAnimationFrame(() => {
    updateOrientationState()
    handleWindowResize(false, resizeEventToken)
  })
}

const handleFullscreenChange = () => {
  const currentToken = resizeEventToken
  const isCurrentlyFullscreen = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  )
  if (isCurrentlyFullscreen) {
    userDismissedPrompt.value = true
    showFullscreenPrompt.value = false
    showRotatePrompt.value = false
  } else {
    userDismissedPrompt.value = false
  }
  nextTick(() => {
    handleWindowResize(true, currentToken)
  })
}

const handleWindowResize = (isInitialOrPostPromptAdjust = false, currentResizeToken = 0) => {
  console.log(
    `[ARXP Resize] handleWindowResize (#${currentResizeToken}) INICIO. isInitial: ${isInitialOrPostPromptAdjust}, MarkerVisible(actual): ${isMarkerVisible.value}, ARReady: ${isARReady.value}`,
  )

  if (isARReady.value && !isCleaningUp.value) {
    const considerMarkerVisible =
      markerWasVisibleBeforeResize &&
      currentResizeToken !== 0 &&
      currentResizeToken === resizeEventToken &&
      isDeviceLandscape.value
        ? true
        : isMarkerVisible.value
    if (considerMarkerVisible) {
      checkAndShowPrompts(currentResizeToken)
    } else if (!isMarkerVisible.value) {
      showRotatePrompt.value = false
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
    const currentScalerEl = contentScalerRef.value?.el // Volver a obtener la ref aquí
    const sceneElForTimeout = sceneElement || sceneRef.value?.el // Y la escena

    if (
      !sceneElForTimeout ||
      !sceneElForTimeout.renderer ||
      !sceneElForTimeout.camera ||
      !currentScalerEl
    ) {
      console.warn(
        `[ARXP Resize] (#${currentResizeToken}) Timeout: Elementos (escena/renderer/camara/scaler) no encontrados. Scaler:`,
        currentScalerEl,
      )
      return
    }

    if (
      !((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value) ||
      isInitialOrPostPromptAdjust
    ) {
      let newScale = 1.0
      isMobileForPrompt.value = window.innerWidth < 768
      if (isMobileForPrompt.value) {
        newScale = isDeviceLandscape.value ? 1.55 : 1.15
      }
      newScale = Math.max(0.5, Math.min(newScale, 2.5))
      currentScalerEl.setAttribute('scale', `${newScale} ${newScale} ${newScale}`)

      if (sceneElForTimeout.camera?.el?.components?.camera?.updateAspect) {
        sceneElForTimeout.camera.el.components.camera.updateAspect()
      }
      // Comentado temporalmente para probar si causa el error de FOV en MindAR
      // if (typeof sceneElForTimeout.resize === 'function') {
      //     console.log(`[ARXP Resize] (#${currentResizeToken}) Llamando scene.resize() explícitamente.`);
      //     sceneElForTimeout.resize();
      // }

      if (
        isMarkerVisible.value &&
        isARReady.value &&
        !showRotatePrompt.value &&
        !showFullscreenPrompt.value
      ) {
        nextTick(() => displayCurrentContent())
      }
    }
  }, 350) // Aumentar ligeramente el debounce
}

async function initializeARExperience(newMarkerId, oldMarkerId) {
  console.log(
    `[ARXP Init] initializeARExperience INICIO. NewMarker: ${newMarkerId}, OldMarker: ${oldMarkerId}, isCleaningUp: ${isCleaningUp.value}`,
  )
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
  userDismissedPrompt.value = false

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
  console.log(
    `[ARXP Init] initializeARExperience FIN. isLoading: ${isLoading.value}, isARReady: ${isARReady.value}, mindFileUrl: ${mindFileUrl.value ? 'SET' : 'EMPTY'}`,
  )
}

watch(
  () => props.markerId,
  (newMarkerId, oldMarkerId) => {
    initializeARExperience(newMarkerId, oldMarkerId)
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('resize', handleOrientationAndResize)
  if (screen.orientation && typeof screen.orientation.addEventListener === 'function') {
    screen.orientation.addEventListener('change', handleOrientationAndResize)
  } else {
    orientationMediaQuery = window.matchMedia('(orientation: landscape)')
    if (typeof orientationMediaQuery.addEventListener === 'function') {
      orientationMediaQuery.addEventListener('change', handleOrientationAndResize)
    } else if (typeof orientationMediaQuery.addListener === 'function') {
      orientationMediaQuery.addListener(handleOrientationAndResize)
    }
  }
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.addEventListener('mozfullscreenchange', handleFullscreenChange)
  document.addEventListener('MSFullscreenChange', handleFullscreenChange)
  handleOrientationAndResize()
})

onUnmounted(async () => {
  clearTimeout(resizeTimeout)
  window.removeEventListener('resize', handleOrientationAndResize)
  if (screen.orientation && typeof screen.orientation.removeEventListener === 'function') {
    screen.orientation.removeEventListener('change', handleOrientationAndResize)
  } else if (orientationMediaQuery) {
    if (typeof orientationMediaQuery.removeEventListener === 'function') {
      orientationMediaQuery.removeEventListener('change', handleOrientationAndResize)
    } else if (typeof orientationMediaQuery.removeListener === 'function') {
      orientationMediaQuery.removeListener(handleOrientationAndResize)
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
      handleWindowResize(true, resizeEventToken)
    })
  }
})
</script>

<template>
  <!-- El template se mantiene igual que la versión anterior -->
  <div class="ar-view-container">
    <div v-if="showCameraPermissionPrompt" class="loading-overlay camera-permission-prompt">
      <p>⚠️ {{ cameraPermissionError }}</p>
      <p v-if="cameraPermissionError.includes('denied')">
        Debes habilitar el permiso en los ajustes de tu navegador para este sitio.
      </p>
      <button @click="retryCameraCheck" class="retry-button">Reintentar Permiso</button>
    </div>
    <div
      v-if="isCheckingPermission && !showCameraPermissionPrompt"
      class="loading-overlay initial-loading"
    >
      <div class="spinner"></div>
      <p>Verificando permiso de cámara...</p>
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
      <p>Preparando archivo de marcador...</p>
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
          !errorLoadingContent.includes('tardó demasiado') &&
          !errorLoadingContent.includes('AR target no encontrado') &&
          !errorLoadingContent.includes('ID de marcador no válido') &&
          !errorLoadingContent.includes('Error de MindAR') &&
          !errorLoadingContent.includes('Timeout AR') &&
          !errorLoadingContent.includes('Could not access camera') &&
          !errorLoadingContent.includes('No se pudo acceder a la cámara')
        "
        @click="initializeARExperience(props.markerId, null)"
        class="retry-button"
      >
        Reintentar
      </button>
      <p
        v-if="
          errorLoadingContent.includes('Timeout AR') ||
          errorLoadingContent.includes('AR target no encontrado') ||
          errorLoadingContent.includes('ID de marcador no válido') ||
          errorLoadingContent.includes('Error de MindAR')
        "
        style="font-size: 0.9em; margin-top: 10px"
      >
        (Intenta recargar la página. Si persiste, contacta soporte.)
      </p>
    </div>
    <div
      v-if="isARReady && isMarkerVisible && showRotatePrompt && !userDismissedPrompt"
      class="ar-prompt-overlay"
    >
      <p>Para una mejor experiencia, por favor, gira tu dispositivo a horizontal.</p>
      <button @click="dismissPromptAndShowContent" class="prompt-button">Entendido</button>
    </div>
    <div
      v-if="isARReady && isMarkerVisible && showFullscreenPrompt && !userDismissedPrompt"
      class="ar-prompt-overlay"
    >
      <p>Para una mejor experiencia, te recomendamos usar el modo pantalla completa.</p>
      <button @click="requestFullscreen" class="prompt-button" style="margin-right: 10px">
        Ir a Pantalla Completa</button
      ><button @click="dismissPromptAndShowContent" class="prompt-button">Continuar así</button>
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
        v-if="
          mindFileUrl &&
          !showCameraPermissionPrompt &&
          !isCheckingPermission &&
          !cameraPermissionError
        "
        ref="sceneRef"
        :key="`${mindFileUrl}-${props.markerId}`"
        embedded
        :mindar-image="`imageTargetSrc: ${mindFileUrl}; autoStart: true; maxTrack: 1; showStats: false; uiLoading: no; uiError: no; uiScanning: no; filterMinCF:0.001; filterBeta: 10; warmupTolerance: 2; missTolerance: 2;`"
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
            response-type="arraybuffer"
            loop="true"
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
              position="0 0 0"
              rotation="0 0 0"
              width="1"
              height="1"
              visible="false"
              src="#imageAsset"
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
            ></a-video>
            <a-entity
              v-if="
                isContentLoading &&
                isMarkerVisible &&
                isARReady &&
                !((showRotatePrompt || showFullscreenPrompt) && !userDismissedPrompt)
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
      <div
        v-else-if="
          !cameraPermissionError &&
          !showCameraPermissionPrompt &&
          !isCheckingPermission &&
          !isLoading &&
          !mindFileUrl
        "
        class="loading-overlay"
      >
        <p>Preparando datos del marcador (.mind)...</p>
      </div>
    </div>
    <div
      v-if="
        associatedContents.length > 1 &&
        isMarkerVisible &&
        !isContentLoading &&
        isARReady &&
        !((showRotatePrompt || showFullscreenPrompt) && !userDismissedPrompt)
      "
      class="nav-buttons"
      :class="{ 'landscape-buttons': isDeviceLandscape, 'portrait-buttons': !isDeviceLandscape }"
    >
      <button @click="prevContent" class="nav-button prev"><</button
      ><button @click="nextContent" class="nav-button next">></button>
    </div>
    <div
      v-if="
        isARReady &&
        !isMarkerVisible &&
        !errorLoadingContent &&
        !isLoading &&
        !((showRotatePrompt || showFullscreenPrompt) && !userDismissedPrompt)
      "
      class="scanning-indicator"
    >
      <p>Buscando marcador...</p>
    </div>
  </div>
</template>

<style scoped>
/* Estilos de Jules sin cambios */
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
.nav-buttons {
  position: absolute;
  z-index: 150;
  display: flex;
  pointer-events: none;
  box-sizing: border-box;
}
.nav-buttons.portrait-buttons {
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}
.nav-buttons.landscape-buttons {
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}
.nav-button {
  padding: 10px;
  font-size: 28px;
  line-height: 1;
  font-weight: 700;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.45);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 55px;
  height: 55px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition:
    background-color 0.3s ease,
    transform 0.2s ease;
  pointer-events: auto;
  -webkit-user-select: none;
  user-select: none;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}
.nav-button:hover {
  background-color: rgba(0, 0, 0, 0.7);
}
.nav-button:active {
  transform: scale(0.92);
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
