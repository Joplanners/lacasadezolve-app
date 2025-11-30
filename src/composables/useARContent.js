import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from 'vue-toastification'

const YOUR_R2_DOMAIN_IDENTIFIER = 'pub-48e6b80b718c43a99a9b98163de9920c.r2.dev'

export function useARContent() {
  const toast = useToast()
  
  const mindFileUrl = ref('')
  const associatedContents = ref([])
  const currentContentIndex = ref(0)
  const isLoading = ref(true)
  const errorLoadingContent = ref('')
  
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

  async function loadMarkerAndContents(markerId) {
    if (!markerId) {
      errorLoadingContent.value = 'ID de marcador no válido.'
      isLoading.value = false
      return
    }

    isLoading.value = true
    errorLoadingContent.value = ''
    associatedContents.value = []
    mindFileUrl.value = ''
    currentContentIndex.value = 0

    try {
      // 1. Fetch Marker Data
      const { data: markerData, error: markerError } = await supabase
        .from('markers')
        .select('mind_file_name')
        .eq('id', markerId)
        .single()

      if (markerError) throw new Error(markerError.message)
      if (!markerData?.mind_file_name) throw new Error('Marcador sin archivo .mind asociado.')

      // Handle R2 Cache Busting
      let rawMindFileUrl = markerData.mind_file_name
      if (rawMindFileUrl && rawMindFileUrl.includes(YOUR_R2_DOMAIN_IDENTIFIER)) {
        const mindCacheBuster = `v=${Date.now()}`
        mindFileUrl.value = `${rawMindFileUrl}${rawMindFileUrl.includes('?') ? '&' : '?'}${mindCacheBuster}`
      } else {
        mindFileUrl.value = rawMindFileUrl
      }

      // 2. Fetch Contents
      const { data: contentsData, error: contentsError } = await supabase
        .from('marker_contents')
        .select(`display_order, contents (id,content_url,type,name)`)
        .eq('marker_id', markerId)
        .order('display_order')

      if (contentsError) throw new Error(`Error al buscar contenidos: ${contentsError.message}`)

      associatedContents.value = (contentsData || [])
        .filter((i) => i.contents?.content_url && i.contents?.type)
        .map((i) => ({ ...i.contents, display_order: i.display_order }))
        .sort((a, b) => a.display_order - b.display_order)

      console.log(`[ARXP Load] Contenidos cargados: ${associatedContents.value.length}`)

      if (associatedContents.value.length === 0) {
        toast.info('Este marcador no tiene contenidos para mostrar.', { timeout: 5000 })
      }

      isLoading.value = false
    } catch (error) {
      console.error('Error loading AR content:', error)
      errorLoadingContent.value = `Error cargando experiencia: ${error.message}`
      toast.error(errorLoadingContent.value)
      isLoading.value = false
    }
  }

  function nextContent() {
    if (associatedContents.value.length <= 1) return
    currentContentIndex.value = (currentContentIndex.value + 1) % associatedContents.value.length
  }

  function prevContent() {
    if (associatedContents.value.length <= 1) return
    currentContentIndex.value = (currentContentIndex.value - 1 + associatedContents.value.length) % associatedContents.value.length
  }

  function resetContentState() {
    mindFileUrl.value = ''
    associatedContents.value = []
    currentContentIndex.value = 0
    isLoading.value = false
    errorLoadingContent.value = ''
  }

  return {
    mindFileUrl,
    associatedContents,
    currentContentIndex,
    currentContent,
    currentContentType,
    isLoading,
    errorLoadingContent,
    loadMarkerAndContents,
    nextContent,
    prevContent,
    resetContentState
  }
}
