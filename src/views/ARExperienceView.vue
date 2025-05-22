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
const showCameraPermissionPrompt = ref(false) // For camera permission UI
const cameraPermissionError = ref('') // Stores camera permission error messages
const isCheckingPermission = ref(false) // True while checking camera permission
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
const isDeviceLandscape = ref(window.matchMedia('(orientation: landscape)').matches)
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
const currentContentUrl = computed(() => currentContent.value?.content_url || '')
const currentContentType = computed(() => currentContent.value?.type?.toLowerCase() || '')

async function checkAndRequestCameraPermission() {
  isCheckingPermission.value = true
  cameraPermissionError.value = ''
  showCameraPermissionPrompt.value = false
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    stream.getTracks().forEach(track => track.stop())
    console.log('Camera permission granted.')
    // No need to set showCameraPermissionPrompt or cameraPermissionError if successful
    isCheckingPermission.value = false
    return true
  } catch (error) {
    console.error('Camera permission error:', error)
    let errorMessage = ''
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Camera access was denied. Please enable it in your browser settings and reload the page.'
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = 'No camera found. Please ensure you have a camera connected and enabled.'
    } else {
      errorMessage = `Could not access the camera. Error: ${error.message}`
    }
    cameraPermissionError.value = errorMessage
    showCameraPermissionPrompt.value = true
    toast.error(errorMessage, { timeout: 10000 })
    isLoading.value = false // Stop loading as AR can't proceed
    isCheckingPermission.value = false
    return false
  }
}

async function retryCameraCheck() {
  // Reset states related to permission error
  showCameraPermissionPrompt.value = false;
  cameraPermissionError.value = '';
  // isLoading.value will be managed by initializeARExperience
  // Re-run the initialization flow. Pass current markerId. oldMarkerId can be null.
  await initializeARExperience(props.markerId, null);
}

function updateOrientationState() {
  if (screen.orientation) {
    isDeviceLandscape.value = screen.orientation.type.startsWith('landscape')
  } else {
    isDeviceLandscape.value = window.matchMedia('(orientation: landscape)').matches
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

function checkAndShowPrompts() {
  if (!isARReady.value || !isMarkerVisible.value) {
    showRotatePrompt.value = false
    showFullscreenPrompt.value = false
    return
  }
  if (userDismissedPrompt.value) {
    showRotatePrompt.value = false
    showFullscreenPrompt.value = false
    displayCurrentContent()
    return
  }
  isMobileForPrompt.value = window.innerWidth < 768
  updateOrientationState()
  const currentIsFullscreen = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  )
  let needsRotatePrompt = isMobileForPrompt.value && !isDeviceLandscape.value
  let needsFullscreenPrompt = !isMobileForPrompt.value && !currentIsFullscreen
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
  if (showRotatePrompt.value || showFullscreenPrompt.value) {
    const vp = sceneElement?.querySelector('#videoPlane')
    const ip = sceneElement?.querySelector('#imagePlane')
    if (vp) vp.setAttribute('visible', 'false')
    if (ip) ip.setAttribute('visible', 'false')
    pauseVideo()
  } else {
    displayCurrentContent()
  }
}
function dismissPromptAndShowContent() {
  userDismissedPrompt.value = true
  showRotatePrompt.value = false
  showFullscreenPrompt.value = false
  if (isMarkerVisible.value && isARReady.value) {
    displayCurrentContent()
    nextTick(() => {
      handleWindowResize(true)
    })
  }
}
function requestFullscreen() {
  const elem = document.documentElement
  if (typeof document !== 'undefined' && !document.fullscreenElement) {
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => {})
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen()
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen()
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen()
    }
  } else {
    checkAndShowPrompts()
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
  // isLoading.value = true; // This is now handled by initializeARExperience
  // isARReady.value = false; // Also handled by initializeARExperience
  // isMarkerVisible.value = false; // Also handled by initializeARExperience
  // errorLoadingContent.value = ''; // Also handled by initializeARExperience

  // Camera permission is now expected to be granted before this function is called.
  if (isCleaningUp.value) {
    console.log("loadMarkerAndContents: Cleanup in progress, returning.");
    return
  }
  if (!props.markerId) { // This check is still important.
    errorLoadingContent.value = 'ID de marcador no válido.'
    isLoading.value = false // Ensure loading stops if called with no marker ID.
    return
  }
  // Ensure AR states are reset if we are genuinely starting to load for a new/valid marker
  isARReady.value = false;
  isMarkerVisible.value = false;
  // errorLoadingContent is managed by initializeARExperience or permission check mostly
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
      throw new Error('Marcador sin .mind o datos inválidos (mind_file_name nulo/vacío).')
    }
    let rawMindFileUrl = markerData.mind_file_name
    if (rawMindFileUrl && rawMindFileUrl.includes(YOUR_R2_DOMAIN_IDENTIFIER)) {
      const mindCacheBuster = `v=${Date.now()}`
      mindFileUrl.value = `${rawMindFileUrl}${rawMindFileUrl.includes('?') ? '&' : '?'}${mindCacheBuster}`
    } else {
      mindFileUrl.value = rawMindFileUrl
    }
    if (!mindFileUrl.value) {
      throw new Error('Error crítico: mindFileUrl es nulo o vacío después de procesar.')
    }
    console.log('AR.js imageTargetSrc (mind file) will be set to:', mindFileUrl.value);
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
    isLoading.value = false
    arReadyTimeout = setTimeout(() => {
      if (!isARReady.value && !errorLoadingContent.value && !isCleaningUp.value) {
        errorLoadingContent.value = 'Timeout AR.'
        isARReady.value = false
        toast.error(errorLoadingContent.value)
      }
    }, 25000)
  } catch (error) {
    errorLoadingContent.value = `Error AR: ${error.message}.`
    toast.error(errorLoadingContent.value, { timeout: false })
    isLoading.value = false
    isARReady.value = false
    if (arReadyTimeout) clearTimeout(arReadyTimeout)
  }
}
async function displayCurrentContent() {
  // Robust checks at the beginning
  if (isCleaningUp.value) {
    console.log('displayCurrentContent aborted: cleanup in progress.');
    return;
  }
  if (!isARReady.value || !isMarkerVisible.value) {
    console.log('displayCurrentContent aborted: AR not ready or marker not visible.');
    const vp = sceneElement?.querySelector('#videoPlane') || videoPlaneRef.value?.el;
    const ip = sceneElement?.querySelector('#imagePlane') || imagePlaneRef.value?.el;
    if (vp) vp.setAttribute('visible', 'false');
    if (ip) ip.setAttribute('visible', 'false');
    pauseVideo(); // Ensure video is paused
    isContentLoading.value = false;
    return;
  }
  if (((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value) && !showCameraPermissionPrompt.value) {
    console.log('displayCurrentContent aborted: prompts are active.');
    const vp = sceneElement?.querySelector('#videoPlane') || videoPlaneRef.value?.el;
    const ip = sceneElement?.querySelector('#imagePlane') || imagePlaneRef.value?.el;
    if (vp) vp.setAttribute('visible', 'false');
    if (ip) ip.setAttribute('visible', 'false');
    pauseVideo();
    isContentLoading.value = false;
    return;
  }
  if (showCameraPermissionPrompt.value || isCheckingPermission.value) {
      console.log('displayCurrentContent aborted: camera permission prompt active or being checked.');
      const vp = sceneElement?.querySelector('#videoPlane') || videoPlaneRef.value?.el;
      const ip = sceneElement?.querySelector('#imagePlane') || imagePlaneRef.value?.el;
      if (vp) vp.setAttribute('visible', 'false');
      if (ip) ip.setAttribute('visible', 'false');
      pauseVideo();
      isContentLoading.value = false;
      return;
  }

  const content = currentContent.value;
  if (!content || !content.content_url) {
    console.log('displayCurrentContent aborted: no content or content_url.');
    const vp = sceneElement?.querySelector('#videoPlane') || videoPlaneRef.value?.el;
    const ip = sceneElement?.querySelector('#imagePlane') || imagePlaneRef.value?.el;
    if (vp) vp.setAttribute('visible', 'false');
    if (ip) ip.setAttribute('visible', 'false');
    isContentLoading.value = false;
    return;
  }
  // This check was already similar, just adding console log from requirement.
  // if (!sceneElement || !isMarkerVisible.value || !isARReady.value) { // This is largely covered by earlier checks
  // Redundant check: isARReady and isMarkerVisible are checked above. sceneElement should exist if AR is ready.
  if (!sceneElement) {
    console.error('displayCurrentContent aborted: sceneElement is null, though AR is supposedly ready.');
    const vp = sceneElement?.querySelector('#videoPlane') || videoPlaneRef.value?.el; // sceneElement is null here, so this is problematic
    const ip = sceneElement?.querySelector('#imagePlane') || imagePlaneRef.value?.el; // same here
    // Fallback to refs if sceneElement is unexpectedly null
    const vpRef = videoPlaneRef.value?.el;
    const ipRef = imagePlaneRef.value?.el;
    if (vpRef) vpRef.setAttribute('visible', 'false');
    if (ipRef) ipRef.setAttribute('visible', 'false');
    isContentLoading.value = false
    return
  }
  isContentLoading.value = true
  await nextTick()
  const videoPlaneCurrent = videoPlaneRef.value?.el || sceneElement?.querySelector('#videoPlane')
  const imagePlaneCurrent = imagePlaneRef.value?.el || sceneElement?.querySelector('#imagePlane')
  const imageAsset = document.querySelector('#imageAsset');
  const videoAsset = document.querySelector('#videoAsset');

  if (!videoPlaneCurrent || !imagePlaneCurrent || !imageAsset || !videoAsset) {
    console.error('Critical error: Media planes or assets not found in displayCurrentContent.');
    isContentLoading.value = false;
    // errorLoadingContent.value = "Error: AR media elements missing. Try reloading."; // Optional
    return;
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
    adjustMediaPlaneAspect(type, targetPlaneElement, mediaAsset)
    if (targetPlaneElement) targetPlaneElement.addEventListener('click', handleContentClick)
    if (
      isMarkerVisible.value &&
      isARReady.value &&
      !isCleaningUp.value && // Add this check
      !((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value) &&
      !showCameraPermissionPrompt.value // Add this check
    ) {
      if (targetPlaneElement) targetPlaneElement.setAttribute('visible', 'true');
      if (type === 'video') playVideo(); // playVideo already has similar checks
    } else {
      if (targetPlaneElement) targetPlaneElement.setAttribute('visible', 'false');
      if (type === 'video') pauseVideo()
    }
  } catch (error) {
    errorLoadingContent.value = `Error al mostrar ${type}: ${error.message}`
    toast.error(errorLoadingContent.value)
    if (videoPlaneCurrent) videoPlaneCurrent.setAttribute('visible', 'false')
    if (imagePlaneCurrent) imagePlaneCurrent.setAttribute('visible', 'false')
  } finally {
    isContentLoading.value = false
  }
}
function loadMedia(url, mediaElement, type) {
  let urlWithCacheBust = url;
  if (url && url.includes(YOUR_R2_DOMAIN_IDENTIFIER)) {
    const cacheBuster = `v=${Date.now()}`;
    urlWithCacheBust = `${url}${url.includes('?') ? '&' : '?'}${cacheBuster}`;
  }
  console.log(`Attempting to load ${type} from: ${urlWithCacheBust}`); // Added logging
  return new Promise((resolve, reject) => {
    const eventToWaitFor = type === 'image' ? 'load' : 'canplaythrough';
    const timeoutDuration = 20000
    mediaElement.removeEventListener('load', loadHandlerInternal)
    mediaElement.removeEventListener('canplaythrough', loadHandlerInternal)
    mediaElement.removeEventListener('error', errorHandlerInternal)
    let loadTimeout = null
    function loadHandlerInternal() {
      clearTimeout(loadTimeout)
      cleanupInternal()
      resolve()
    }
    function errorHandlerInternal(errEvent) {
      clearTimeout(loadTimeout);
      const errorType = errEvent?.type || 'desconocido';
      let detailMessage = `Error (${errorType}) al cargar ${type} desde ${urlWithCacheBust}.`;
      let specificError = errEvent?.target?.error || errEvent;

      if (specificError instanceof Event && !(specificError instanceof Error)) {
         // Generic event, not a detailed error object
         console.error(`Media load event error for ${type} at ${urlWithCacheBust}. Event type: ${errorType}`, errEvent);
      } else if (specificError instanceof Error) {
         // Standard Error object
         detailMessage += ` Mensaje: ${specificError.message}`;
         console.error(`Media load error for ${type} at ${urlWithCacheBust}: ${specificError.message}`, specificError);
      } else if (specificError && typeof specificError.code !== 'undefined') { // Likely MediaError
         detailMessage += ` Código: ${specificError.code}.`;
         switch (specificError.code) {
            case 1: detailMessage += ' (Carga abortada)'; break;
            case 2: detailMessage += ' (Error de red)'; break;
            case 3: detailMessage += ' (Error de decodificación)'; break;
            case 4: detailMessage += ' (Fuente no soportada)'; break;
            default: detailMessage += ' (Código de error desconocido)';
         }
         console.error(`MediaError for ${type} at ${urlWithCacheBust}. Code: ${specificError.code}, Message: ${specificError.message || 'N/A'}`, specificError);
      } else {
         console.error(`Unknown media load error for ${type} at ${urlWithCacheBust}. Details:`, specificError, errEvent);
      }
      
      cleanupInternal();
      reject(new Error(detailMessage));
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
    mediaElement.setAttribute('src', urlWithCacheBust)
    loadTimeout = setTimeout(() => {
      errorHandlerInternal({ type: 'timeout' })
    }, timeoutDuration)
    if (type === 'video') {
      mediaElement.load()
    } else if (type === 'image' && mediaElement.complete) {
      loadHandlerInternal()
    }
  })
}
const playVideo = async () => {
  const videoEl = document.querySelector('#videoAsset');
  if (
    videoEl &&
    isMarkerVisible.value &&
    isARReady.value &&
    !isCleaningUp.value && // Added check
    !showCameraPermissionPrompt.value && // Added check
    !((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value)
  ) {
    await nextTick();
    if (videoEl.readyState >= 3) {
      try {
        await videoEl.play()
      } catch (e) {}
    } else {
    }
  }
}
const pauseVideo = () => {
  const videoEl = document.querySelector('#videoAsset')
  if (videoEl && !videoEl.paused) {
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
    const fallbackHeight = fallbackWidth * (9 / 16)
    targetPlaneElement.setAttribute('width', fallbackWidth.toString())
    targetPlaneElement.setAttribute('height', fallbackHeight.toString())
    targetPlaneElement.setAttribute('position', `0 0 0`)
  }
}
const handleSceneLoaded = (event) => {
  sceneElement = event.target
  if (!sceneElement) return
  addEntityListeners(sceneElement)
  nextTick(hideVRButton)
}
const handleArReady = async () => {
  if (arReadyTimeout) clearTimeout(arReadyTimeout)
  arReadyTimeout = null
  if (isCleaningUp.value) return
  isARReady.value = true
  arSystem = sceneElement?.systems['mindar-image']
  cameraElement = sceneElement?.querySelector('a-camera')
  if (cameraElement) cameraElement.setAttribute('camera', { active: true })
  await nextTick()
  hideVRButton()
  if (isMarkerVisible.value) {
    checkAndShowPrompts()
  }
}
const handleArError = (event) => {
  const errorDetailSource = event.detail?.error || event.detail?.message || event.detail;
  let errorDetail = typeof errorDetailSource === 'object' ? JSON.stringify(errorDetailSource) : String(errorDetailSource);

  if (arReadyTimeout) clearTimeout(arReadyTimeout);
  arReadyTimeout = null;

  // If a camera permission error is already active, prioritize showing that.
  if (cameraPermissionError.value) {
    isLoading.value = false;
    isARReady.value = false;
    // The toast for cameraPermissionError should have already been shown.
    return; // Don't overwrite a specific camera error with a general AR error.
  }

  // Check if this AR error is related to camera access.
  if (
    errorDetail.includes('Camera not found') ||
    errorDetail.includes('Requested device not found') ||
    errorDetail.includes('Permission denied') || // General permission denied by user
    errorDetail.includes('getUserMedia') // Specific to camera access API
  ) {
    cameraPermissionError.value = "AR Error: Could not access camera. Please check permissions and ensure a camera is available.";
    showCameraPermissionPrompt.value = true; // Show the prompt with retry
    errorLoadingContent.value = ''; // Clear any other AR error message
    toast.error(cameraPermissionError.value, { timeout: 10000 });
  } else {
    // Handle other non-camera AR errors
    errorLoadingContent.value = `Error AR: ${errorDetail || 'Desconocido'}.`;
    toast.error(errorLoadingContent.value, { timeout: 10000 });
  }

  isLoading.value = false;
  isARReady.value = false;
};
const addEntityListeners = (sceneEl) => {
  const targetMindAREntity = sceneEl.querySelector('#targetEntity')
  if (targetMindAREntity) {
    targetEntityRef.value = targetMindAREntity
    targetMindAREntity.removeEventListener('targetFound', handleTargetFound)
    targetMindAREntity.removeEventListener('targetLost', handleTargetLost)
    targetMindAREntity.addEventListener('targetFound', handleTargetFound)
    targetMindAREntity.addEventListener('targetLost', handleTargetLost)
  } else {
    errorLoadingContent.value = 'Error crítico: AR target no encontrado.'
    toast.error(errorLoadingContent.value, { timeout: false })
  }
}
const handleTargetFound = () => {
  clearTimeout(targetLostTimeout)
  targetLostTimeout = null
  isMarkerVisible.value = true
  errorLoadingContent.value = ''
  userDismissedPrompt.value = false
  if (isARReady.value && associatedContents.value.length > 0) {
    checkAndShowPrompts()
  }
}
const handleTargetLost = () => {
  clearTimeout(targetLostTimeout)
  targetLostTimeout = setTimeout(() => {
    if (isCleaningUp.value) return
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
    }
    targetLostTimeout = null
  }, 300)
}
const handleContentClick = (event) => {
  if (
    associatedContents.value.length > 1 &&
    !((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value)
  ) {
    nextContent()
  }
}
async function cleanupARInternal(calledFromWatcher = false) {
  console.log('cleanupARInternal started. Called from watcher:', calledFromWatcher);
  if (isCleaningUp.value && !calledFromWatcher) {
    console.log('cleanupARInternal skipped: already in progress and not a watcher call.');
    return;
  }
  isCleaningUp.value = true;
  // Clear any pending AR ready timeout
  clearTimeout(targetLostTimeout);
  targetLostTimeout = null;
  clearTimeout(resizeTimeout);
  resizeTimeout = null;

  pauseVideo(); // Pause any playing video
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
    if (entity?.removeEventListener) {
      entity.removeEventListener('targetFound', handleTargetFound)
      entity.removeEventListener('targetLost', handleTargetLost)
    }
    targetEntityRef.value = null
  }
  contentScalerRef.value = null
  const imgPlaneEl = imagePlaneRef.value?.el || sceneElement?.querySelector('#imagePlane')
  const vidPlaneEl = videoPlaneRef.value?.el || sceneElement?.querySelector('#videoPlane')
  if (imgPlaneEl?.removeEventListener) imgPlaneEl.removeEventListener('click', handleContentClick)
  if (vidPlaneEl?.removeEventListener) vidPlaneEl.removeEventListener('click', handleContentClick)
  imagePlaneRef.value = null
  videoPlaneRef.value = null
  const arSys = arSystem
  if (arSys?.stop && typeof arSys.stop === 'function') {
    try {
      arSys.stop()
    } catch (e) {}
  }
  arSystem = null
  cameraElement = null
  const sceneEl = sceneElement
  if (sceneEl) {
    sceneEl.removeEventListener('loaded', handleSceneLoaded)
    sceneEl.removeEventListener('arReady', handleArReady)
    sceneEl.removeEventListener('arError', handleArError)
    if (sceneEl.hasLoaded && typeof sceneEl.flushToDOM === 'function') {
      try {
        sceneEl.flushToDOM(true)
      } catch (e) {}
    }
    if (sceneEl.isPlaying && typeof sceneEl.pause === 'function') {
      try {
        sceneEl.pause()
      } catch (e) {}
    }
    if (sceneEl.parentNode && typeof sceneEl.parentNode.removeChild === 'function') {
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
  showRotatePrompt.value = false
  showFullscreenPrompt.value = false
  userDismissedPrompt.value = false
  isMobileForPrompt.value = false;

  if (!calledFromWatcher) {
    isLoading.value = true; // Reset loading state for next marker
    errorLoadingContent.value = ''; // Clear errors for next marker
  }

  // Short delay to allow A-Frame and other async operations to settle before fully marking cleanup as done.
  await new Promise((resolve) => setTimeout(resolve, 150));
  isCleaningUp.value = false;
  console.log('cleanupARInternal finished.');
}
const handleOrientationAndResize = () => {
  requestAnimationFrame(() => {
    updateOrientationState()
    handleWindowResize()
  })
}
const handleWindowResize = (isInitialOrPostPromptAdjust = false) => {
  let needsContentDisplayAfterScale = false
  if (isARReady.value && isMarkerVisible.value && !isCleaningUp.value) {
    const oldShowRotate = showRotatePrompt.value
    const oldShowFullscreen = showFullscreenPrompt.value
    checkAndShowPrompts()
    if (
      (oldShowRotate && !showRotatePrompt.value) ||
      (oldShowFullscreen && !showFullscreenPrompt.value)
    ) {
      needsContentDisplayAfterScale = true
    }
  }
  if (!isARReady.value || isCleaningUp.value || isLoading.value) {
    return
  }
  if (!sceneElement || !sceneElement.canvas) {
    return
  }
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    if (isCleaningUp.value) {
      return
    }
    if (
      !((showRotatePrompt.value || showFullscreenPrompt.value) && !userDismissedPrompt.value) ||
      isInitialOrPostPromptAdjust
    ) {
      const currentScalerEl = contentScalerRef.value?.el
      if (sceneElement.renderer && sceneElement.camera && currentScalerEl) {
        const viewportWidth = sceneElement.canvas.clientWidth
        const viewportHeight = sceneElement.canvas.clientHeight
        let newScale = 1.0
        if (isMobileForPrompt.value) {
          newScale = 1.2
        } // ESCALA AUMENTADA PARA MÓVIL
        else {
          const isFullscreenNow = !!(
            document.fullscreenElement ||
            document.mozFullScreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement
          )
          const isEffectivelyFullscreen =
            viewportWidth >= window.screen.width * 0.95 &&
            viewportHeight >= window.screen.height * 0.95
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
        }
        newScale = Math.max(0.5, Math.min(newScale, 2.0))
        currentScalerEl.setAttribute('scale', `${newScale} ${newScale} ${newScale}`)
        if (sceneElement?.camera?.el?.components?.camera) {
          sceneElement.camera.el.components.camera.updateAspect()
        }
        if (sceneElement && typeof sceneElement.resize === 'function') {
          sceneElement.resize()
        }
        if (
          needsContentDisplayAfterScale &&
          !showRotatePrompt.value &&
          !showFullscreenPrompt.value
        ) {
          nextTick(() => displayCurrentContent())
        } else if (
          isInitialOrPostPromptAdjust &&
          !showRotatePrompt.value &&
          !showFullscreenPrompt.value &&
          isMarkerVisible.value
        ) {
          nextTick(() => displayCurrentContent())
        }
      }
    }
  }, 100)
}
async function initializeARExperience(newMarkerId, oldMarkerId) {
  // This condition is from the original watch logic.
  // It means if cleanup is happening due to markerId becoming null, don't proceed.
  if (isCleaningUp.value && oldMarkerId && !newMarkerId) {
    console.log("initializeARExperience: Cleanup in progress or newMarkerId is null, returning.");
    isLoading.value = false; // Ensure loading state is false if we bail early.
    return;
  }

  isLoading.value = true;
  isARReady.value = false;
  errorLoadingContent.value = ''; // Clear previous generic errors
  cameraPermissionError.value = ''; // Clear previous camera errors
  showCameraPermissionPrompt.value = false; // Hide prompt initially

  if (sceneElement || arSystem) { // From existing watch
    await cleanupARInternal(true); // Pass true as it's from a watcher-like context
    await nextTick();
  }

  if (newMarkerId) {
    const permissionGranted = await checkAndRequestCameraPermission();
    if (permissionGranted) {
      // Only proceed to load marker contents if permission was granted
      await loadMarkerAndContents(); // This function now assumes permission is granted
    } else {
      // If permission is not granted, checkAndRequestCameraPermission has already set error messages
      // and set isLoading.value = false.
      mindFileUrl.value = ''; // Ensure A-Scene doesn't try to load with an old/invalid target
      // Error message is already set by checkAndRequestCameraPermission, and isLoading is false.
    }
  } else {
    // This part is from the original watch's "else" block (no newMarkerId)
    errorLoadingContent.value = 'No se especificó un marcador.';
    mindFileUrl.value = '';
    associatedContents.value = [];
    isLoading.value = false;
    isARReady.value = false;
  }
}

watch(
  () => props.markerId,
  (newMarkerId, oldMarkerId) => {
    // Call the new wrapper function
    initializeARExperience(newMarkerId, oldMarkerId);
  },
  { immediate: true }, // immediate:true ensures it runs on component mount if markerId is present
)
let orientationMediaQuery = null
onMounted(() => {
  // initializeARExperience is called by the immediate watch.
  // No need to call loadMarkerAndContents or initializeARExperience directly here.
  window.addEventListener('resize', handleOrientationAndResize)
  if (screen.orientation) {
    screen.orientation.addEventListener('change', handleOrientationAndResize)
  } else {
    orientationMediaQuery = window.matchMedia('(orientation: landscape)')
    if (orientationMediaQuery.addEventListener) {
      orientationMediaQuery.addEventListener('change', handleOrientationAndResize)
    } else {
      orientationMediaQuery.addListener(handleOrientationAndResize)
    }
  }
  document.addEventListener('fullscreenchange', handleOrientationAndResize)
  document.addEventListener('webkitfullscreenchange', handleOrientationAndResize)
  document.addEventListener('mozfullscreenchange', handleOrientationAndResize)
  document.addEventListener('MSFullscreenChange', handleOrientationAndResize)
  handleOrientationAndResize()
  hideVRButton()
})
onUnmounted(async () => {
  clearTimeout(resizeTimeout)
  window.removeEventListener('resize', handleOrientationAndResize)
  if (screen.orientation) {
    screen.orientation.removeEventListener('change', handleOrientationAndResize)
  } else if (orientationMediaQuery) {
    if (orientationMediaQuery.removeEventListener) {
      orientationMediaQuery.removeEventListener('change', handleOrientationAndResize)
    } else {
      orientationMediaQuery.removeListener(handleOrientationAndResize)
    }
    orientationMediaQuery = null
  }
  document.removeEventListener('fullscreenchange', handleOrientationAndResize)
  document.removeEventListener('webkitfullscreenchange', handleOrientationAndResize)
  document.removeEventListener('mozfullscreenchange', handleOrientationAndResize)
  document.removeEventListener('MSFullscreenChange', handleOrientationAndResize)
  await cleanupARInternal(false)
})
watch(isARReady, (ready) => {
  if (ready) {
    nextTick(hideVRButton)
  }
})
</script>

<template>
  <div class="ar-view-container">
    <!-- Camera Permission Prompt -->
    <div v-if="showCameraPermissionPrompt" class="loading-overlay camera-permission-prompt">
      <p>⚠️ {{ cameraPermissionError }}</p>
      <p v-if="cameraPermissionError.includes('denied') || cameraPermissionError.includes('PermissionDeniedError')">
        You may need to go to your browser's site settings for this page to grant camera permission.
      </p>
      <button @click="retryCameraCheck" class="retry-button">Retry Permission Check</button>
    </div>

    <!-- Initial Loading / Checking Permission (only if not showing camera prompt) -->
    <div v-if="isCheckingPermission && !showCameraPermissionPrompt" class="loading-overlay initial-loading">
      <div class="spinner"></div>
      <p>Checking camera permission...</p>
    </div>
    <div v-else-if="isLoading && !errorLoadingContent && !showCameraPermissionPrompt && !cameraPermissionError" class="loading-overlay initial-loading">
      <div class="spinner"></div>
      <p>Cargando datos AR...</p>
    </div>

    <!-- AR Starting Message (only if not loading, no errors, and mindFileUrl is set) -->
    <div
      v-else-if="!isLoading && !isARReady && !errorLoadingContent && mindFileUrl && !showCameraPermissionPrompt && !cameraPermissionError"
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

    <!-- Content Loading (show only if AR is ready and no higher-priority prompts are active) -->
    <div v-else-if="isContentLoading && isARReady && !showCameraPermissionPrompt && !cameraPermissionError" class="loading-overlay content-loading">
      <div class="spinner"></div>
      <p>Cargando contenido...</p>
    </div>

    <!-- Error Display (generic errors, not camera related if camera prompt is shown) -->
    <div v-else-if="errorLoadingContent && !showCameraPermissionPrompt && !cameraPermissionError" class="loading-overlay error-display">
      <p>⚠️ {{ errorLoadingContent }}</p>
      <button
        v-if="
          !errorLoadingContent.includes('tardó demasiado') &&
          !errorLoadingContent.includes('AR target no encontrado') &&
          !errorLoadingContent.includes('ID de marcador no válido') &&
          !errorLoadingContent.includes('Error de MindAR') && // General MindAR errors
          !errorLoadingContent.includes('Timeout AR.') &&
          !errorLoadingContent.includes('Could not access camera') // Camera errors handled by camera prompt
        "
        @click="initializeARExperience(props.markerId, null)"
        class="retry-button"
      >
        Reintentar
      </button>
      <p
        v-if="
          errorLoadingContent.includes('Timeout AR.') ||
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

    <!-- AR Container and Scene - Conditionally rendered based on permissions and errors -->
    <div v-if="!isLoading && mindFileUrl && !errorLoadingContent && !showCameraPermissionPrompt && !isCheckingPermission && !cameraPermissionError" class="ar-container">
      <div ref="sceneContainerRef" style="width: 100%; height: 100%">
        <a-scene
          v-if="mindFileUrl && !showCameraPermissionPrompt && !isCheckingPermission && !cameraPermissionError"
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
                rotation="-90 0 0"
                ><a-ring
                  radius-inner="0.1"
                  radius-outer="0.15"
                  color="teal"
                  opacity="0.8"
                  animation="property: rotation; to: 0 0 360; loop: true; dur: 1000; easing: linear;"
                ></a-ring
              ></a-entity>
            </a-entity>
          </a-entity>
        </a-scene>
        <div v-else-if="!cameraPermissionError && !showCameraPermissionPrompt && !isCheckingPermission && !isLoading" class="loading-overlay"><p>Preparando datos del marcador (.mind)...</p></div>
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
.camera-permission-prompt { /* Added camera-permission-prompt to shared styles */
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
  pointer-events: none; /* Default for overlays */
}

.error-display,
.camera-permission-prompt { /* Allow clicks on error and permission prompts */
  pointer-events: auto;
}

.camera-permission-prompt {
  background-color: rgba(0, 0, 0, 0.85); /* Same as loading overlay */
  z-index: 250; /* Ensure it's above other general overlays, but potentially below toasts */
}
.camera-permission-prompt p {
  color: #fff; /* Ensure text is visible on dark background */
  margin-bottom: 15px; /* Space between messages and button */
}

.error-display {
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
.error-display p,
.camera-permission-prompt p { /* Shared paragraph styling */
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
