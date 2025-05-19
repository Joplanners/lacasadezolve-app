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
let arSystem = null
let arReadyTimeout = null
let sceneElement = null
let cameraElement = null
let targetLostTimeout = null
const isCleaningUp = ref(false)
const imagePlaneRef = ref(null)
const videoPlaneRef = ref(null)
let resizeTimeout = null

const showRotatePrompt = ref(false)
const showFullscreenPrompt = ref(false)
const userDismissedPrompt = ref(false)
const isMobileForPrompt = ref(false)

console.log('ARXP (Y-Pos Adjust): Script Setup Initializing')

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

function checkAndShowPrompts() {
  console.log(
    'ARXP checkAndShowPrompts: Running. userDismissedPrompt:',
    userDismissedPrompt.value,
    'isMarkerVisible:',
    isMarkerVisible.value,
    'isARReady:',
    isARReady.value,
  )

  if (!isARReady.value || !isMarkerVisible.value) {
    console.log('ARXP checkAndShowPrompts: AR not ready or marker not visible. Hiding prompts.')
    showRotatePrompt.value = false
    showFullscreenPrompt.value = false
    return
  }

  if (userDismissedPrompt.value) {
    console.log(
      'ARXP checkAndShowPrompts: User already dismissed prompt. Hiding prompts and attempting to show content.',
    )
    showRotatePrompt.value = false
    showFullscreenPrompt.value = false
    displayCurrentContent()
    return
  }

  isMobileForPrompt.value = window.innerWidth < 768
  let currentIsLandscape = window.matchMedia('(orientation: landscape)').matches
  if (screen.orientation) {
    currentIsLandscape = screen.orientation.type.startsWith('landscape')
  }
  const currentIsFullscreen = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  )
  console.log(
    'ARXP checkAndShowPrompts: Mobile:',
    isMobileForPrompt.value,
    'Landscape:',
    currentIsLandscape,
    'Fullscreen:',
    currentIsFullscreen,
  )

  let needsRotatePrompt = isMobileForPrompt.value && !currentIsLandscape
  let needsFullscreenPrompt = !isMobileForPrompt.value && !currentIsFullscreen

  const wasShowingRotatePrompt = showRotatePrompt.value
  const wasShowingFullscreenPrompt = showFullscreenPrompt.value

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

  if (
    wasShowingRotatePrompt !== showRotatePrompt.value ||
    wasShowingFullscreenPrompt !== showFullscreenPrompt.value
  ) {
    console.log(
      'ARXP checkAndShowPrompts: Prompt state changed. Rotate:',
      showRotatePrompt.value,
      'Fullscreen:',
      showFullscreenPrompt.value,
    )
  }

  if (showRotatePrompt.value || showFullscreenPrompt.value) {
    console.log('ARXP checkAndShowPrompts: Prompt active, ensuring 3D content is hidden.')
    const vp = sceneElement?.querySelector('#videoPlane')
    const ip = sceneElement?.querySelector('#imagePlane')
    if (vp) vp.setAttribute('visible', 'false')
    if (ip) ip.setAttribute('visible', 'false')
    pauseVideo()
  } else {
    console.log('ARXP checkAndShowPrompts: Optimal state (no prompts). Attempting to show content.')
    displayCurrentContent()
  }
}

function dismissPromptAndShowContent() {
  console.log('ARXP dismissPromptAndShowContent: User clicked "Entendido" or "Continuar así".')
  userDismissedPrompt.value = true
  showRotatePrompt.value = false
  showFullscreenPrompt.value = false

  console.log('ARXP dismissPromptAndShowContent: Attempting to display content.')
  if (isMarkerVisible.value && isARReady.value) {
    displayCurrentContent()
    nextTick(() => {
      handleWindowResize(true)
    })
  }
}

function requestFullscreen() {
  console.log('ARXP requestFullscreen: Attempting.')
  const elem = document.documentElement
  if (typeof document !== 'undefined' && !document.fullscreenElement) {
    if (elem.requestFullscreen) {
      elem
        .requestFullscreen()
        .catch((err) => console.warn('ARXP requestFullscreen: Native request failed:', err.message))
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen()
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen()
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen()
    }
  } else {
    console.log('ARXP requestFullscreen: Already in fullscreen or document undefined.')
    checkAndShowPrompts()
  }
}

function nextContent() {
  console.log(
    'ARXP nextContent: Called. PromptsActive:',
    (showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value,
  )
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
  console.log(
    'ARXP prevContent: Called. PromptsActive:',
    (showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value,
  )
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
  console.log('ARXP loadMarkerAndContents: Starting for markerId:', props.markerId)
  if (isCleaningUp.value) return

  if (!props.markerId) {
    errorLoadingContent.value = 'ID de marcador no válido.'
    isLoading.value = false
    return
  }
  isLoading.value = true
  isARReady.value = false
  isMarkerVisible.value = false
  errorLoadingContent.value = ''
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
      .select('mind_file_name')
      .eq('id', props.markerId)
      .single()
    if (markerError) {
      if (markerError.code === 'PGRST116')
        throw new Error(`Marcador ${props.markerId} no encontrado.`)
      throw new Error(markerError.message)
    }
    if (!markerData?.mind_file_name) throw new Error('Marcador sin .mind o datos inválidos.')

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
    mindFileUrl.value = markerData.mind_file_name
    isLoading.value = false
    console.log('ARXP loadMarkerAndContents: Data loaded. mindFileUrl:', mindFileUrl.value)

    if (!mindFileUrl.value) throw new Error('mindFileUrl vacío después de cargar.')
    arReadyTimeout = setTimeout(() => {
      if (!isARReady.value && !errorLoadingContent.value && !isCleaningUp.value) {
        errorLoadingContent.value = 'Timeout AR.' // Modificado para ser más genérico, o puedes poner 'AR tardó demasiado en iniciar.'
        isARReady.value = false
        toast.error(errorLoadingContent.value)
        console.error('ARXP loadMarkerAndContents: AR Ready Timeout!')
      }
    }, 25000)
  } catch (error) {
    errorLoadingContent.value = `Error AR: ${error.message}.`
    toast.error(errorLoadingContent.value, { timeout: false })
    isLoading.value = false
    isARReady.value = false
    if (arReadyTimeout) clearTimeout(arReadyTimeout)
    console.error('ARXP loadMarkerAndContents: Catch error:', error.message)
  }
}

async function displayCurrentContent() {
  console.log(
    'ARXP displayCurrentContent: Called. userDismissedPrompt:',
    userDismissedPrompt.value,
    'ShowRotate:',
    showRotatePrompt.value,
    'ShowFullscreen:',
    showFullscreenPrompt.value,
  )

  if ((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value) {
    console.log(
      'ARXP displayCurrentContent: Prompt activo y no descartado. Ocultando contenido 3D.',
    )
    const vp = sceneElement?.querySelector('#videoPlane')
    const ip = sceneElement?.querySelector('#imagePlane')
    if (vp) vp.setAttribute('visible', 'false')
    if (ip) ip.setAttribute('visible', 'false')
    pauseVideo()
    isContentLoading.value = false
    return
  }

  const content = currentContent.value
  if (!content || !sceneElement || !isMarkerVisible.value || !isARReady.value) {
    console.log('ARXP displayCurrentContent: Condiciones básicas no cumplidas. Hiding planes.')
    const vp = sceneElement?.querySelector('#videoPlane')
    const ip = sceneElement?.querySelector('#imagePlane')
    if (vp) vp.setAttribute('visible', 'false')
    if (ip) ip.setAttribute('visible', 'false')
    isContentLoading.value = false
    return
  }

  isContentLoading.value = true
  console.log('ARXP displayCurrentContent: isContentLoading = true. Content type:', content.type)
  await nextTick()

  const videoPlaneCurrent = videoPlaneRef.value?.el || sceneElement?.querySelector('#videoPlane')
  const imagePlaneCurrent = imagePlaneRef.value?.el || sceneElement?.querySelector('#imagePlane')
  const imageAsset = document.querySelector('#imageAsset')
  const videoAsset = document.querySelector('#videoAsset')

  if (!videoPlaneCurrent || !imagePlaneCurrent || !imageAsset || !videoAsset) {
    isContentLoading.value = false
    console.error('ARXP displayCurrentContent: Faltan elementos de plano o asset.')
    return
  }

  videoPlaneCurrent.setAttribute('visible', 'false')
  imagePlaneCurrent.setAttribute('visible', 'false')
  if (videoAsset.pause) videoAsset.pause()

  if (imagePlaneCurrent) imagePlaneCurrent.removeEventListener('click', handleContentClick)
  if (videoPlaneCurrent) videoPlaneCurrent.removeEventListener('click', handleContentClick)

  const type = content.type.toLowerCase()
  const url = content.content_url
  let targetPlaneElement = null
  let mediaAsset = null

  try {
    console.log(`ARXP displayCurrentContent: Intentando cargar ${type} desde ${url}`)
    if (type === 'image') {
      targetPlaneElement = imagePlaneCurrent
      mediaAsset = imageAsset
      await loadMedia(url, mediaAsset, type)
    } else if (type === 'video') {
      targetPlaneElement = videoPlaneCurrent
      mediaAsset = videoAsset
      if (mediaAsset.pause) mediaAsset.pause()
      mediaAsset.removeAttribute('src')
      mediaAsset.load()
      await nextTick()
      await loadMedia(url, mediaAsset, type)
    } else {
      throw new Error(`Tipo de contenido no soportado: ${type}`)
    }
    console.log(`ARXP displayCurrentContent: Media cargada para ${type}`)

    adjustMediaPlaneAspect(type, targetPlaneElement, mediaAsset) // <-- AQUÍ SE AJUSTARÁ LA POSICIÓN Y

    if (targetPlaneElement) targetPlaneElement.addEventListener('click', handleContentClick)

    if (
      isMarkerVisible.value &&
      isARReady.value &&
      !((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value)
    ) {
      console.log(`ARXP displayCurrentContent: Condiciones finales OK. Mostrando ${type}`)
      if (targetPlaneElement) targetPlaneElement.setAttribute('visible', 'true')
      if (type === 'video') playVideo()
    } else {
      console.log(
        `ARXP displayCurrentContent: Condiciones finales NO OK o prompt activo. No mostrando ${type}.`,
      )
      if (targetPlaneElement) targetPlaneElement.setAttribute('visible', 'false')
      if (type === 'video') pauseVideo()
    }
  } catch (error) {
    errorLoadingContent.value = `Error al mostrar ${type}: ${error.message}`
    toast.error(errorLoadingContent.value)
    console.error(`ARXP displayCurrentContent: Error al mostrar contenido - ${error.message}`)
    if (videoPlaneCurrent) videoPlaneCurrent.setAttribute('visible', 'false')
    if (imagePlaneCurrent) imagePlaneCurrent.setAttribute('visible', 'false')
  } finally {
    isContentLoading.value = false
    console.log('ARXP displayCurrentContent: isContentLoading = false.')
  }
}

function loadMedia(url, mediaElement, type) {
  console.log(`ARXP loadMedia: Loading ${type} from ${url}`)
  return new Promise((resolve, reject) => {
    const eventToWaitFor = type === 'image' ? 'load' : 'canplaythrough'
    const timeoutDuration = 20000

    mediaElement.removeEventListener('load', loadHandlerInternal)
    mediaElement.removeEventListener('canplaythrough', loadHandlerInternal)
    mediaElement.removeEventListener('error', errorHandlerInternal)

    let loadTimeout = null

    function loadHandlerInternal() {
      console.log(`ARXP loadMedia: Evento '${eventToWaitFor}' para ${type} ${url}`)
      clearTimeout(loadTimeout)
      cleanupInternal()
      resolve()
    }
    function errorHandlerInternal(err) {
      clearTimeout(loadTimeout)
      const errorType = err?.type || 'desconocido'
      console.error(
        `ARXP loadMedia: Error (${errorType}) al cargar ${type} desde ${url}`,
        err.target?.error || err,
      )
      cleanupInternal()
      reject(new Error(`Error (${errorType}) al cargar ${type}`))
    }
    function cleanupInternal() {
      mediaElement.removeEventListener(eventToWaitFor, loadHandlerInternal)
      mediaElement.removeEventListener('error', errorHandlerInternal)
    }

    if (type === 'video' && mediaElement.pause) {
      mediaElement.pause()
      mediaElement.currentTime = 0
    }

    mediaElement.addEventListener(eventToWaitFor, loadHandlerInternal, { once: true })
    mediaElement.addEventListener('error', errorHandlerInternal, { once: true })

    mediaElement.setAttribute('crossorigin', 'anonymous')
    mediaElement.setAttribute('src', url)

    loadTimeout = setTimeout(() => {
      errorHandlerInternal({ type: 'timeout' })
    }, timeoutDuration)

    if (type === 'video') {
      console.log(`ARXP loadMedia: Calling mediaElement.load() for video ${url}`)
      mediaElement.load()
    } else if (type === 'image' && mediaElement.complete) {
      console.log(`ARXP loadMedia: Image ${url} already complete, calling loadHandler.`)
      loadHandlerInternal()
    }
  })
}

const playVideo = async () => {
  const videoEl = document.querySelector('#videoAsset')
  if (
    videoEl &&
    isMarkerVisible.value &&
    isARReady.value &&
    !((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value)
  ) {
    await nextTick()
    if (videoEl.readyState >= 3) {
      try {
        console.log('ARXP playVideo: Intentando reproducir video.')
        await videoEl.play()
      } catch (e) {
        console.warn('ARXP playVideo: Error al reproducir video:', e.message)
      }
    } else {
      console.log('ARXP playVideo: Video no listo (readyState < 3).')
    }
  }
}
const pauseVideo = () => {
  const videoEl = document.querySelector('#videoAsset')
  if (videoEl && !videoEl.paused) {
    console.log('ARXP pauseVideo: Pausando video.')
    videoEl.pause()
  }
}

// --- FUNCIÓN MODIFICADA ---
const adjustMediaPlaneAspect = (contentType, targetPlaneElement, mediaAssetElement) => {
  console.log('ARXP adjustMediaPlaneAspect for type:', contentType)
  let nW = 0,
    nH = 0
  if (contentType === 'video') {
    nW = mediaAssetElement.videoWidth
    nH = mediaAssetElement.videoHeight
  } else {
    nW = mediaAssetElement.naturalWidth
    nH = mediaAssetElement.naturalHeight
  }
  console.log('ARXP adjustMediaPlaneAspect: Native WxH:', nW, nH)

  if (!targetPlaneElement || !mediaAssetElement) {
    console.warn('ARXP adjustMediaPlaneAspect: Target plane o media asset faltante.')
    return
  }

  if (nW > 0 && nH > 0) {
    const aspectRatio = nW / nH
    const planeWidth = 0.8 // Ancho base del plano
    const planeHeight = planeWidth / aspectRatio // Alto calculado
    targetPlaneElement.setAttribute('width', planeWidth.toString())
    targetPlaneElement.setAttribute('height', planeHeight.toString())

    // --- AJUSTE DE POSICIÓN Y ---
    // Opción 1 (default anterior): La base del contenido se alinea con el Y=0 del marcador.
    // let yPosition = planeHeight / 2;

    // Opción 2 (ACTUAL - CENTRADO): El centro del contenido se alinea con el Y=0 del marcador.
    let yPosition = 0 // << CAMBIO AQUÍ

    targetPlaneElement.setAttribute('position', `0 ${yPosition} 0`)
    console.log(
      'ARXP adjustMediaPlaneAspect: Dimensiones aplicadas WxH:',
      planeWidth,
      planeHeight,
      'Posición Y:',
      yPosition,
    )
  } else {
    console.warn('ARXP adjustMediaPlaneAspect: Dimensiones nativas son 0. Usando fallback.')
    const fallbackWidth = 0.8
    const fallbackHeight = fallbackWidth * (9 / 16) // 16:9 aspect ratio
    targetPlaneElement.setAttribute('width', fallbackWidth.toString())
    targetPlaneElement.setAttribute('height', fallbackHeight.toString())
    // Aplicar el mismo principio de yPosition para el fallback si es necesario
    const yPositionFallback = 0 // << CAMBIO AQUÍ
    targetPlaneElement.setAttribute('position', `0 ${yPositionFallback} 0`)
    console.log(
      'ARXP adjustMediaPlaneAspect: Fallback WxH:',
      fallbackWidth,
      fallbackHeight,
      'Posición Y:',
      yPositionFallback,
    )
  }
}

const handleSceneLoaded = (event) => {
  console.log('ARXP handleSceneLoaded: Scene loaded.')
  sceneElement = event.target
  if (!sceneElement) return
  addEntityListeners(sceneElement)
}

const handleArReady = async () => {
  if (arReadyTimeout) clearTimeout(arReadyTimeout)
  arReadyTimeout = null
  if (isCleaningUp.value) return

  isARReady.value = true
  console.log('ARXP handleArReady: AR System Ready')
  arSystem = sceneElement?.systems['mindar-image']
  cameraElement = sceneElement?.querySelector('a-camera')
  if (cameraElement) cameraElement.setAttribute('camera', { active: true })

  await nextTick()
  if (isMarkerVisible.value) {
    console.log('ARXP handleArReady: Marcador ya visible, llamando checkAndShowPrompts.')
    checkAndShowPrompts()
  } else {
    console.log('ARXP handleArReady: Marcador no visible aún.')
    // Comentado para evitar warnings tempranos de contentScalerRef.value.el no disponible
    // handleWindowResize(true);
  }
}

const handleArError = (event) => {
  const errorDetail = event.detail?.error || event.detail?.message || event.detail
  if (arReadyTimeout) clearTimeout(arReadyTimeout)
  errorLoadingContent.value = `Error AR: ${errorDetail || 'Desconocido'}.`
  isLoading.value = false
  isARReady.value = false
  toast.error(errorLoadingContent.value, { timeout: 10000 })
  console.error('ARXP handleArError:', errorDetail)
}
const addEntityListeners = (sceneEl) => {
  const targetMindAREntity = sceneEl.querySelector('#targetEntity')
  if (targetMindAREntity) {
    targetEntityRef.value = targetMindAREntity
    targetMindAREntity.removeEventListener('targetFound', handleTargetFound)
    targetMindAREntity.removeEventListener('targetLost', handleTargetLost)
    targetMindAREntity.addEventListener('targetFound', handleTargetFound)
    targetMindAREntity.addEventListener('targetLost', handleTargetLost)
    console.log('ARXP addEntityListeners: Listeners añadidos a #targetEntity.')
  } else {
    errorLoadingContent.value = 'Error crítico: AR target no encontrado.'
    toast.error(errorLoadingContent.value, { timeout: false })
    console.error('ARXP addEntityListeners: #targetEntity NO ENCONTRADA.')
  }
}

const handleTargetFound = () => {
  console.log('ARXP handleTargetFound: Target Found!')
  clearTimeout(targetLostTimeout)
  targetLostTimeout = null
  isMarkerVisible.value = true
  errorLoadingContent.value = ''
  userDismissedPrompt.value = false

  if (isARReady.value && associatedContents.value.length > 0) {
    console.log('ARXP handleTargetFound: AR lista y hay contenidos. Llamando checkAndShowPrompts.')
    checkAndShowPrompts()
  } else {
    console.log('ARXP handleTargetFound: AR no lista o no hay contenidos.')
  }
}

const handleTargetLost = () => {
  console.log('ARXP handleTargetLost: Target Lost!')
  clearTimeout(targetLostTimeout)
  targetLostTimeout = setTimeout(() => {
    if (isCleaningUp.value) return

    console.log('ARXP handleTargetLost (delayed): Procesando pérdida de target.')
    isMarkerVisible.value = false
    isContentLoading.value = false
    pauseVideo()
    showRotatePrompt.value = false
    showFullscreenPrompt.value = false

    if (sceneElement) {
      const vp = videoPlaneRef.value?.el || sceneElement.querySelector('#videoPlane')
      const ip = imagePlaneRef.value?.el || sceneElement.querySelector('#imagePlane')
      if (vp) vp.setAttribute('visible', 'false')
      if (ip) ip.setAttribute('visible', 'false')
      console.log('ARXP handleTargetLost (delayed): Planos ocultos.')
    }
    targetLostTimeout = null
  }, 300)
}

const handleContentClick = (event) => {
  console.log('ARXP handleContentClick.')
  if (
    associatedContents.value.length > 1 &&
    !((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value)
  ) {
    nextContent()
  }
}

async function cleanupARInternal(calledFromWatcher = false) {
  if (isCleaningUp.value && !calledFromWatcher) return
  isCleaningUp.value = true
  console.log('ARXP cleanupARInternal: Starting cleanup, from watcher:', calledFromWatcher)

  clearTimeout(arReadyTimeout)
  arReadyTimeout = null
  clearTimeout(targetLostTimeout)
  targetLostTimeout = null
  clearTimeout(resizeTimeout)
  resizeTimeout = null

  pauseVideo()
  const va = document.querySelector('#videoAsset')
  if (va) {
    va.pause()
    va.removeAttribute('src')
    va.load()
  }
  const ia = document.querySelector('#imageAsset')
  if (ia) {
    ia.removeAttribute('src')
  }

  if (targetEntityRef.value) {
    const entity = targetEntityRef.value.el || targetEntityRef.value
    if (entity && entity.removeEventListener) {
      entity.removeEventListener('targetFound', handleTargetFound)
      entity.removeEventListener('targetLost', handleTargetLost)
    }
    targetEntityRef.value = null
  }
  contentScalerRef.value = null

  const imgPlane = imagePlaneRef.value?.el || sceneElement?.querySelector('#imagePlane')
  const vidPlane = videoPlaneRef.value?.el || sceneElement?.querySelector('#videoPlane')
  if (imgPlane) imgPlane.removeEventListener('click', handleContentClick)
  if (vidPlane) vidPlane.removeEventListener('click', handleContentClick)
  imagePlaneRef.value = null
  videoPlaneRef.value = null

  const arSys = arSystem
  if (arSys && arSys.stop) {
    try {
      arSys.stop()
    } catch (e) {}
  }
  arSystem = null

  const sceneEl = sceneElement
  if (sceneEl) {
    sceneEl.removeEventListener('loaded', handleSceneLoaded)
    sceneEl.removeEventListener('arReady', handleArReady)
    sceneEl.removeEventListener('arError', handleArError)
    if (sceneEl.isPlaying && sceneEl.pause) sceneEl.pause()
    if (sceneEl.parentNode && sceneEl.parentNode.removeChild) {
      try {
        sceneEl.parentNode.removeChild(sceneEl)
      } catch (e) {}
    }
  }
  sceneElement = null
  mindFileUrl.value = ''
  associatedContents.value = []
  isMarkerVisible.value = false
  isARReady.value = false
  isContentLoading.value = false
  currentContentIndex.value = 0
  cameraElement = null
  showRotatePrompt.value = false
  showFullscreenPrompt.value = false
  userDismissedPrompt.value = false
  isMobileForPrompt.value = false

  if (!calledFromWatcher) {
    isLoading.value = true
    errorLoadingContent.value = ''
  }
  await new Promise((resolve) => setTimeout(resolve, 100))
  isCleaningUp.value = false
  console.log('ARXP cleanupARInternal: Cleanup complete.')
}

const handleWindowResize = (isInitialOrPostPromptAdjust = false) => {
  console.log(
    'ARXP handleWindowResize: Called. isInitialOrPostPromptAdjust:',
    isInitialOrPostPromptAdjust,
  )

  let needsContentDisplayAfterScale = false
  if (isARReady.value && isMarkerVisible.value && !isCleaningUp.value) {
    const oldShowRotate = showRotatePrompt.value
    const oldShowFullscreen = showFullscreenPrompt.value

    checkAndShowPrompts()

    if (
      (oldShowRotate && !showRotatePrompt.value) ||
      (oldShowFullscreen && !showFullscreenPrompt.value)
    ) {
      console.log(
        'ARXP handleWindowResize: Prompts were hidden by this resize/change. Flagging needsContentDisplayAfterScale.',
      )
      needsContentDisplayAfterScale = true
    }
  }

  if (!isARReady.value || isCleaningUp.value || isLoading.value) {
    console.log(
      'ARXP handleWindowResize: AR no lista, limpiando o cargando. No se ajustará escala 3D.',
    )
    return
  }
  if (!sceneElement || !sceneElement.canvas) {
    console.warn('ARXP handleWindowResize: Scene element o canvas no disponibles para escalado 3D.')
    return
  }

  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    if (isCleaningUp.value) {
      console.log(
        'ARXP handleWindowResize (delayed): Cleanup in progress, exiting scale adjustment.',
      )
      return
    }

    if (
      !((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value) ||
      isInitialOrPostPromptAdjust
    ) {
      const currentScalerEl = contentScalerRef.value?.el
      if (sceneElement.renderer && sceneElement.camera && currentScalerEl) {
        console.log('ARXP handleWindowResize (delayed): Ajustando escala del contenido.')
        const viewportWidth = sceneElement.canvas.clientWidth
        const viewportHeight = sceneElement.canvas.clientHeight
        let newScale = 1.0

        const isFullscreenNow = !!(
          document.fullscreenElement ||
          document.mozFullScreenElement ||
          document.webkitFullscreenElement ||
          document.msFullscreenElement
        )
        const isEffectivelyFullscreen =
          viewportWidth >= window.screen.width * 0.95 &&
          viewportHeight >= window.screen.height * 0.95

        if (isMarkerVisible.value && currentContent.value) {
          const type = currentContentType.value
          const planeEl =
            (type === 'image' ? imagePlaneRef.value?.el : videoPlaneRef.value?.el) ||
            sceneElement.querySelector(type === 'image' ? '#imagePlane' : '#videoPlane')
          const asset = document.querySelector(type === 'image' ? '#imageAsset' : '#videoAsset')
          if (
            planeEl &&
            planeEl.getAttribute('visible') === 'true' &&
            asset &&
            ((type === 'image' && asset.naturalWidth > 0) ||
              (type === 'video' && asset.videoWidth > 0))
          ) {
            adjustMediaPlaneAspect(type, planeEl, asset) // << AHORA TAMBIÉN SE LLAMA DESDE AQUÍ SI EL CONTENIDO ESTÁ VISIBLE
          }
        }

        if (isFullscreenNow || isEffectivelyFullscreen) {
          const minFullscreenDim = Math.min(viewportWidth, viewportHeight)
          if (minFullscreenDim < 500) newScale = 1.3
          else if (minFullscreenDim < 800) newScale = 1.15
          else newScale = 1.0
        } else {
          const minNormalDim = Math.min(viewportWidth, viewportHeight)
          if (minNormalDim < 350) newScale = 1.0
          else if (minNormalDim < 550) newScale = 0.9
          else newScale = 0.8
        }

        newScale = Math.max(0.5, Math.min(newScale, 2.0))
        currentScalerEl.setAttribute('scale', `${newScale} ${newScale} ${newScale}`)
        console.log(`ARXP handleWindowResize (delayed): Escala aplicada: ${newScale}`)

        if (
          needsContentDisplayAfterScale &&
          !showRotatePrompt.value &&
          !showFullscreenPrompt.value
        ) {
          console.log(
            'ARXP handleWindowResize (delayed): needsContentDisplayAfterScale=true & no prompts. Calling displayCurrentContent.',
          )
          nextTick(() => displayCurrentContent())
        } else if (
          isInitialOrPostPromptAdjust &&
          !showRotatePrompt.value &&
          !showFullscreenPrompt.value &&
          isMarkerVisible.value
        ) {
          console.log(
            'ARXP handleWindowResize (delayed): Initial/PostPrompt adjust & no prompts. Calling displayCurrentContent.',
          )
          nextTick(() => displayCurrentContent())
        }
      } else {
        if (!currentScalerEl)
          console.warn(
            'ARXP handleWindowResize (delayed): contentScalerRef.value.el AÚN NO disponible para aplicar escala. Puede ser normal al inicio.',
          )
        else
          console.warn(
            'ARXP handleWindowResize (delayed): Renderer o cámara no disponibles para aplicar escala.',
          )
      }
    } else {
      console.log(
        'ARXP handleWindowResize (delayed): Prompt activo y no es ajuste inicial/post-prompt, no se ajustará escala de contenido 3D.',
      )
    }
  }, 150)
}

watch(
  () => props.markerId,
  async (newMarkerId, oldMarkerId) => {
    console.log(`ARXP Watcher markerId: Changed from ${oldMarkerId} to ${newMarkerId}.`)
    if (isCleaningUp.value && oldMarkerId && !newMarkerId) return
    isLoading.value = true
    isARReady.value = false
    if (sceneElement || arSystem) {
      await cleanupARInternal(true)
      await nextTick()
    }
    if (newMarkerId) {
      loadMarkerAndContents()
    } else {
      errorLoadingContent.value = 'No se especificó un marcador.'
      mindFileUrl.value = ''
      associatedContents.value = []
      isLoading.value = false
      isARReady.value = false
    }
  },
  { immediate: true },
)

let orientationMediaQuery = null
onMounted(() => {
  console.log('ARXP onMounted: Adding global listeners.')
  window.addEventListener('resize', handleWindowResize)
  if (screen.orientation) {
    screen.orientation.addEventListener('change', handleWindowResize)
  } else {
    orientationMediaQuery = window.matchMedia('(orientation: landscape)')
    if (orientationMediaQuery.addEventListener) {
      orientationMediaQuery.addEventListener('change', handleWindowResize)
    } else {
      orientationMediaQuery.addListener(handleWindowResize)
    }
  }
  document.addEventListener('fullscreenchange', handleWindowResize)
  document.addEventListener('webkitfullscreenchange', handleWindowResize)
  document.addEventListener('mozfullscreenchange', handleWindowResize)
  document.addEventListener('MSFullscreenChange', handleWindowResize)
})

onUnmounted(async () => {
  console.log('ARXP onUnmounted: Removing global listeners and cleaning up.')
  clearTimeout(resizeTimeout)
  window.removeEventListener('resize', handleWindowResize)
  if (screen.orientation) {
    screen.orientation.removeEventListener('change', handleWindowResize)
  } else if (orientationMediaQuery) {
    if (orientationMediaQuery.removeEventListener) {
      orientationMediaQuery.removeEventListener('change', handleWindowResize)
    } else {
      orientationMediaQuery.removeListener(handleWindowResize)
    }
    orientationMediaQuery = null
  }
  document.removeEventListener('fullscreenchange', handleWindowResize)
  document.removeEventListener('webkitfullscreenchange', handleWindowResize)
  document.removeEventListener('mozfullscreenchange', handleWindowResize)
  document.removeEventListener('MSFullscreenChange', handleWindowResize)
  await cleanupARInternal(false)
})
</script>

<template>
  <div class="ar-view-container">
    <!-- Overlays de Carga y Error -->
    <div v-if="isLoading && !errorLoadingContent" class="loading-overlay initial-loading">
      <div class="spinner"></div>
      <p>Cargando datos AR...</p>
    </div>
    <div
      v-else-if="!isLoading && !isARReady && !errorLoadingContent && mindFileUrl"
      class="loading-overlay initial-loading"
    >
      <div class="spinner"></div>
      <p>Iniciando AR...</p>
    </div>
    <div
      v-else-if="!isLoading && !mindFileUrl && !errorLoadingContent"
      class="loading-overlay initial-loading"
    >
      <p>Preparando archivo de marcador...</p>
    </div>
    <div v-else-if="isContentLoading && isARReady" class="loading-overlay content-loading">
      <div class="spinner"></div>
      <p>Cargando contenido...</p>
    </div>
    <div v-else-if="errorLoadingContent" class="loading-overlay error-display">
      <p>⚠️ {{ errorLoadingContent }}</p>
      <button
        v-if="
          !errorLoadingContent.includes('tardó demasiado') &&
          !errorLoadingContent.includes('AR target no encontrado') &&
          !errorLoadingContent.includes('ID de marcador no válido') &&
          !errorLoadingContent.includes('Error de MindAR') && // Corregido: el mensaje de timeout es 'Timeout AR.'
          !errorLoadingContent.includes('Timeout AR.')
        "
        @click="loadMarkerAndContents"
        class="retry-button"
      >
        Reintentar
      </button>
      <p
        v-if="
          errorLoadingContent.includes('Timeout AR.') || // Corregido: usa el mensaje de timeout que estableces
          errorLoadingContent.includes('AR target no encontrado') ||
          errorLoadingContent.includes('ID de marcador no válido') ||
          errorLoadingContent.includes('Error de MindAR')
        "
        style="font-size: 0.9em; margin-top: 10px"
      >
        (Intenta recargar la página. Si persiste, contacta soporte.)
      </p>
    </div>

    <!-- Prompts -->
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
        Ir a Pantalla Completa
      </button>
      <button @click="dismissPromptAndShowContent" class="prompt-button">Continuar así</button>
    </div>

    <div v-if="!isLoading && mindFileUrl && !errorLoadingContent" class="ar-container">
      <div ref="sceneContainerRef" style="width: 100%; height: 100%">
        <a-scene
          v-if="mindFileUrl"
          ref="sceneRef"
          :key="mindFileUrl"
          embedded
          :mindar-image="`imageTargetSrc: ${mindFileUrl}; autoStart: true; maxTrack: 1; showStats: false; uiLoading: no; uiError: no; uiScanning: no; filterMinCF:0.001; filterBeta: 10; warmupTolerance: 5; missTolerance: 5;`"
          color-space="sRGB"
          renderer="colorManagement: true; physicallyCorrectLights: false; antialias: true; alpha: true;"
          vr-mode-ui="enabled: false"
          device-orientation-permission-ui="enabled: false"
          background="transparent: true;"
          @loaded="handleSceneLoaded"
          @arReady="handleArReady"
          @arError="handleArError"
        >
          <a-assets timeout="30000">
            <video
              id="videoAsset"
              preload="auto"
              response-type="arraybuffer"
              loop="true"
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
            raycaster="objects: .clickable"
          ></a-camera>

          <a-entity id="targetEntity" mindar-image-target="targetIndex: 0">
            <a-entity ref="contentScalerRef" id="contentScaler" scale="1 1 1" position="0 0 0">
              <a-image
                ref="imagePlaneRef"
                id="imagePlane"
                class="clickable"
                position="0 0.5 0"
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
                position="0 0.5 0"
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
                rotation="-90 0 0"
              >
                <a-ring
                  radius-inner="0.1"
                  radius-outer="0.15"
                  color="teal"
                  opacity="0.8"
                  animation="property: rotation; to: 0 0 360; loop: true; dur: 1000; easing: linear;"
                ></a-ring>
              </a-entity>
            </a-entity>
          </a-entity>
        </a-scene>
        <div v-else class="loading-overlay"><p>Preparando datos del marcador (.mind)...</p></div>
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
      >
        <button @click="prevContent" class="nav-button prev"><</button>
        <button @click="nextContent" class="nav-button next">></button>
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
  </div>
</template>

<style scoped>
/* Estilos (sin cambios) */
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
.scanning-indicator {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.85);
  color: white;
  font-family: sans-serif;
  z-index: 200;
  text-align: center;
  padding: 20px;
  pointer-events: none;
}
.error-display {
  pointer-events: auto;
  background-color: rgba(100, 0, 0, 0.85);
}
.scanning-indicator {
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 10;
}
.scanning-indicator p {
  font-style: italic;
  color: #ccc;
}
.loading-overlay p,
.error-display p {
  margin-top: 15px;
  font-size: 1.1em;
}
.error-display p {
  color: #ffdddd;
}
.spinner {
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
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
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 150;
  padding: 0 15px;
  box-sizing: border-box;
  pointer-events: none;
}
.nav-button {
  padding: 10px;
  font-size: 28px;
  line-height: 1;
  font-weight: bold;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.4);
  color: white;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.3s ease;
  pointer-events: auto;
  user-select: none;
}
.nav-button:hover {
  background-color: rgba(0, 0, 0, 0.7);
}
.nav-button:active {
  transform: scale(0.95);
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
  color: var(--vt-c-text-dark-1, white);
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
  margin: 0 0 15px 0;
  line-height: 1.5;
}

.ar-prompt-overlay .prompt-button {
  padding: 10px 22px;
  font-size: 1em;
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
  background-color: var(--brand-pink, #ff6b87);
  color: var(--vt-c-white, white);
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
