import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabaseClient'

export const useCouponsStore = defineStore('coupons', () => {
  const activeCoupons = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchActiveCoupons = async () => {
    try {
      loading.value = true
      error.value = null
      
      // Consultar cupones activos y que no hayan expirado (o no tengan fecha exp)
      const now = new Date().toISOString()
      
      const { data, error: fetchError } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        // Lógica adicional para filtrar por fecha podría hacerse aquí o en JS si supabase filter es complejo
        // Por simplicidad traemos activos y filtramos en JS si es necesario, 
        // pero la query básica es is_active = true
      
      if (fetchError) throw fetchError

      // Filtrar expirados en cliente para asegurar zona horaria correcta/flexibilidad
      activeCoupons.value = (data || []).filter(coupon => {
        if (!coupon.expires_at) return true
        return new Date(coupon.expires_at) > new Date()
      })

    } catch (err) {
      console.error('Error fetching active coupons:', err)
      error.value = err.message
      activeCoupons.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    activeCoupons,
    loading,
    error,
    fetchActiveCoupons
  }
})
