import { ref } from 'vue'
import { useToast } from 'vue-toastification'

export function useARPermissions() {
  const toast = useToast()
  const showCameraPermissionPrompt = ref(false)
  const cameraPermissionError = ref('')
  const isCheckingPermission = ref(false)

  async function checkAndRequestCameraPermission() {
    isCheckingPermission.value = true
    cameraPermissionError.value = ''
    showCameraPermissionPrompt.value = false
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      // Stop tracks immediately after checking
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
      isCheckingPermission.value = false
      return false
    }
  }

  function resetPermissionState() {
    showCameraPermissionPrompt.value = false
    cameraPermissionError.value = ''
    isCheckingPermission.value = false
  }

  return {
    showCameraPermissionPrompt,
    cameraPermissionError,
    isCheckingPermission,
    checkAndRequestCameraPermission,
    resetPermissionState
  }
}
