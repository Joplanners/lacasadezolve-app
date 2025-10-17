import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabaseClient'

export const useBannersStore = defineStore('banners', () => {
  const banners = ref([])
  const loading = ref(false)
  const error = ref(null)

  // --- PARA EL HOME (PÚBLICO) ---
  const fetchActiveBanners = async () => {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (fetchError) throw fetchError
      banners.value = data || []
    } catch (err) {
      error.value = `Error al cargar banners: ${err.message}`
      console.error(error.value)
    } finally {
      loading.value = false
    }
  }

  // --- FUNCIONES PARA EL PANEL DE ADMIN ---

  // Obtener TODOS los banners (activos e inactivos)
  const fetchAllBanners = async () => {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      banners.value = data || []
    } catch (err) {
      error.value = `Error al cargar banners: ${err.message}`
      console.error(error.value)
    } finally {
      loading.value = false
    }
  }

  // Subir y crear un nuevo banner
  const createBanner = async (bannerData, file) => {
    loading.value = true
    error.value = null
    try {
      const workerUrl = 'https://r2-presigner-worker.jodiabunos.workers.dev'
      const formData = new FormData()
      formData.append('file', file, file.name)

      const response = await fetch(workerUrl, { method: 'POST', body: formData })
      if (!response.ok) {
        const errJson = await response
          .json()
          .catch(() => ({ error: 'Error desconocido en el worker' }))
        throw new Error(errJson.error)
      }
      const result = await response.json()
      if (!result || !result.publicUrl) {
        throw new Error('El worker no devolvió una URL pública.')
      }

      const dataToInsert = { ...bannerData, image_url: result.publicUrl }
      const { data: newBanner, error: insertError } = await supabase
        .from('banners')
        .insert(dataToInsert)
        .select()
        .single()

      if (insertError) throw insertError
      banners.value.push(newBanner)
      banners.value.sort((a, b) => a.sort_order - b.sort_order)
      return { success: true, data: newBanner }
    } catch (err) {
      error.value = `Error creando banner: ${err.message}`
      console.error(error.value)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Actualizar un banner
  const updateBanner = async (bannerId, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from('banners')
        .update(updates)
        .eq('id', bannerId)
        .select()
        .single()

      if (updateError) throw updateError
      const index = banners.value.findIndex((b) => b.id === bannerId)
      if (index !== -1) banners.value[index] = { ...banners.value[index], ...data }
      return { success: true }
    } catch (err) {
      console.error(`Error actualizando banner ${bannerId}:`, err.message)
      return { success: false, error: err.message }
    }
  }

  // Eliminar un banner
  const deleteBanner = async (bannerId) => {
    try {
      const { error: deleteError } = await supabase.from('banners').delete().eq('id', bannerId)

      if (deleteError) throw deleteError
      banners.value = banners.value.filter((b) => b.id !== bannerId)
      return { success: true }
    } catch (err) {
      console.error(`Error eliminando banner ${bannerId}:`, err.message)
      return { success: false, error: err.message }
    }
  }

  return {
    banners,
    loading,
    error,
    fetchActiveBanners,
    fetchAllBanners,
    createBanner,
    updateBanner,
    deleteBanner,
  }
})
