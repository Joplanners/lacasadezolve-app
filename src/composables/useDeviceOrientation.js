import { ref, onMounted, onUnmounted } from 'vue'
import { useToast } from 'vue-toastification'

export function useDeviceOrientation() {
  const toast = useToast()
  
  const isSmallMobile = ref(false)
  const isMobileDevice = ref(false)
  const isTablet = ref(false)
  const isConsideredMobileForPrompt = ref(false)
  const isDeviceLandscape = ref(false)
  const isInBrowserFullscreen = ref(false)
  
  let resizeDebounceTimer = null
  const RESIZE_DEBOUNCE_DELAY = 400
  let orientationMediaQuery = null

  function updateOrientationAndMobileState() {
    if (typeof window === 'undefined') return

    const width = window.innerWidth
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
  }

  function handleResize() {
    clearTimeout(resizeDebounceTimer)
    resizeDebounceTimer = setTimeout(() => {
      updateOrientationAndMobileState()
    }, RESIZE_DEBOUNCE_DELAY)
  }

  function requestFullscreen(element) {
    if (!element) return

    if (typeof document !== 'undefined' && !document.fullscreenElement) {
      const promise =
        element.requestFullscreen?.() ||
        element.webkitRequestFullscreen?.() ||
        element.mozRequestFullScreen?.() ||
        element.msRequestFullscreen?.()
      
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {
          toast.info('No se pudo entrar en pantalla completa.', { timeout: 5000 })
        })
      } else if (!promise) {
        toast.info('La pantalla completa no es compatible con este navegador.', { timeout: 5000 })
      }
    }
  }

  function exitFullscreen() {
    if (typeof document !== 'undefined') {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen()
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
      }
    }
  }

  onMounted(() => {
    updateOrientationAndMobileState()
    window.addEventListener('resize', handleResize)
    
    // Listen for orientation changes
    if (screen.orientation && typeof screen.orientation.addEventListener === 'function') {
      screen.orientation.addEventListener('change', handleResize)
    } else {
      orientationMediaQuery = window.matchMedia('(orientation: landscape)')
      if (typeof orientationMediaQuery.addEventListener === 'function') {
        orientationMediaQuery.addEventListener('change', handleResize)
      } else if (typeof orientationMediaQuery.addListener === 'function') {
        orientationMediaQuery.addListener(handleResize)
      }
    }

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', updateOrientationAndMobileState)
    document.addEventListener('webkitfullscreenchange', updateOrientationAndMobileState)
    document.addEventListener('mozfullscreenchange', updateOrientationAndMobileState)
    document.addEventListener('MSFullscreenChange', updateOrientationAndMobileState)
  })

  onUnmounted(() => {
    clearTimeout(resizeDebounceTimer)
    window.removeEventListener('resize', handleResize)
    
    if (screen.orientation && typeof screen.orientation.removeEventListener === 'function') {
      screen.orientation.removeEventListener('change', handleResize)
    } else if (orientationMediaQuery) {
      if (typeof orientationMediaQuery.removeEventListener === 'function') {
        orientationMediaQuery.removeEventListener('change', handleResize)
      } else if (typeof orientationMediaQuery.removeListener === 'function') {
        orientationMediaQuery.removeListener(handleResize)
      }
    }

    document.removeEventListener('fullscreenchange', updateOrientationAndMobileState)
    document.removeEventListener('webkitfullscreenchange', updateOrientationAndMobileState)
    document.removeEventListener('mozfullscreenchange', updateOrientationAndMobileState)
    document.removeEventListener('MSFullscreenChange', updateOrientationAndMobileState)
  })

  return {
    isSmallMobile,
    isMobileDevice,
    isTablet,
    isConsideredMobileForPrompt,
    isDeviceLandscape,
    isInBrowserFullscreen,
    requestFullscreen,
    exitFullscreen,
    updateOrientationAndMobileState
  }
}
