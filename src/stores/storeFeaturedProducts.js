// stores/storeFeaturedProducts.js

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabaseClient'

export const useFeaturedProductsStore = defineStore('featuredProducts', () => {
  // State
  const featuredProducts = ref([])
  const settings = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // ========================================
  // GETTERS
  // ========================================

  // Obtener configuración actual
  const getSettings = async () => {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('featured_products_settings')
        .select('*')
        .single()

      if (fetchError) {
        console.warn('No hay configuración, usando defaults:', fetchError)
        // Si no existe config, usar defaults
        settings.value = {
          mode: 'auto',
          criteria_new_products: true,
          criteria_top_selling: true,
          criteria_on_sale: true,
          criteria_min_stock: 5,
          fixed_products_count: 0,
        }
        return settings.value
      }

      settings.value = data
      return data
    } catch (err) {
      console.error('Error obteniendo configuración:', err)
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Obtener productos destacados según modo
  const getFeaturedProducts = async () => {
    try {
      loading.value = true
      error.value = null

      const config = await getSettings()

      if (!config) {
        throw new Error('No se pudo obtener configuración')
      }

      if (config.mode === 'manual') {
        return await getManualProducts()
      } else {
        return await getAutoProducts(config)
      }
    } catch (err) {
      console.error('Error obteniendo productos destacados:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Modo manual
  const getManualProducts = async () => {
    const { data, error: fetchError } = await supabase
      .from('featured_products')
      .select(
        `
        *,
        product:products(*)
      `,
      )
      .eq('mode', 'manual')
      .order('position', { ascending: true })
      .limit(3)

    if (fetchError) {
      console.error('Error obteniendo productos manuales:', fetchError)
      return []
    }

    featuredProducts.value = data.map((fp) => fp.product).filter(Boolean) // Filtrar null (productos eliminados)

    return featuredProducts.value
  }

  // Modo automático (inteligente)
  const getAutoProducts = async (config) => {
    let selectedProducts = []

    // PASO 1: Obtener productos fijos (si hay)
    if (config.fixed_products_count > 0) {
      const { data: fixedData } = await supabase
        .from('featured_products')
        .select(
          `
          *,
          product:products(*)
        `,
        )
        .eq('mode', 'auto')
        .eq('is_fixed', true)
        .order('position', { ascending: true })
        .limit(config.fixed_products_count)

      if (fixedData) {
        selectedProducts = fixedData
          .map((fp) => fp.product)
          .filter((p) => p && p.is_active && p.stock >= config.criteria_min_stock)
      }
    }

    // PASO 2: Calcular cuántos slots quedan
    const remainingSlots = 3 - selectedProducts.length

    if (remainingSlots > 0) {
      // PASO 3: Obtener productos candidatos
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .gte('stock', config.criteria_min_stock)

      // Excluir productos ya fijos
      const fixedIds = selectedProducts.map((p) => p.id)
      if (fixedIds.length > 0) {
        query = query.not('id', 'in', `(${fixedIds.join(',')})`)
      }

      const { data: candidates } = await query

      if (!candidates || candidates.length === 0) {
        featuredProducts.value = selectedProducts
        return selectedProducts
      }

      // PASO 4: Calcular scores según criterios
      const now = new Date()

      let scoredCandidates = candidates.map((product) => {
        let score = 0

        // Criterio 1: Producto nuevo (últimos 30 días)
        if (config.criteria_new_products) {
          const createdAt = new Date(product.created_at)
          const daysSinceCreation = (now - createdAt) / (1000 * 60 * 60 * 24)
          if (daysSinceCreation <= 30) {
            score += 10
            score += Math.max(0, 10 - Math.floor(daysSinceCreation / 3))
          }
        }

        // Criterio 2: Producto en descuento activo
        if (config.criteria_on_sale && product.offer_price) {
          const discountActive =
            (!product.discount_start_date || new Date(product.discount_start_date) <= now) &&
            (!product.discount_end_date || new Date(product.discount_end_date) >= now)

          if (discountActive) {
            score += 12
            if (product.discount_percentage) {
              score += Math.floor(product.discount_percentage / 10)
            }
          }
        }

        // Criterio 3: Stock alto (preferir productos disponibles)
        if (product.stock > 20) {
          score += 5
        } else if (product.stock > 10) {
          score += 3
        }

        return { ...product, score }
      })

      // PASO 5: Ordenar por score
      scoredCandidates.sort((a, b) => b.score - a.score)

      // PASO 6: Tomar top 10 y agregar aleatoriedad
      const topCandidates = scoredCandidates.slice(0, Math.min(10, scoredCandidates.length))

      const randomSelected = topCandidates.sort(() => Math.random() - 0.5).slice(0, remainingSlots)

      selectedProducts = [...selectedProducts, ...randomSelected]
    }

    // Limpiar campos extra
    featuredProducts.value = selectedProducts.map(({ score, ...product }) => product)

    return featuredProducts.value
  }

  // ========================================
  // SETTERS (Admin)
  // ========================================

  // Guardar configuración
  const saveSettings = async (newSettings, userId) => {
    try {
      loading.value = true
      error.value = null

      // Obtener ID de settings actual
      if (!settings.value?.id) {
        await getSettings()
      }

      const { data, error: updateError } = await supabase
        .from('featured_products_settings')
        .update({
          ...newSettings,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', settings.value.id)
        .select()
        .single()

      if (updateError) throw updateError

      settings.value = data
      return { success: true, data }
    } catch (err) {
      console.error('Error guardando configuración:', err)
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Guardar productos manuales
  const saveManualProducts = async (productIds) => {
    try {
      loading.value = true
      error.value = null

      // Eliminar anteriores
      await supabase.from('featured_products').delete().eq('mode', 'manual')

      // Insertar nuevos (solo válidos)
      const validProducts = productIds.filter(Boolean)

      if (validProducts.length > 0) {
        const inserts = validProducts.map((productId, index) => ({
          product_id: productId,
          position: index + 1,
          is_fixed: false,
          mode: 'manual',
        }))

        const { error: insertError } = await supabase.from('featured_products').insert(inserts)

        if (insertError) throw insertError
      }

      return { success: true }
    } catch (err) {
      console.error('Error guardando productos manuales:', err)
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Guardar productos fijos (modo auto)
  const saveFixedProducts = async (productIds) => {
    try {
      loading.value = true
      error.value = null

      // Eliminar anteriores
      await supabase.from('featured_products').delete().eq('mode', 'auto').eq('is_fixed', true)

      // Insertar nuevos (solo válidos)
      const validProducts = productIds.filter(Boolean)

      if (validProducts.length > 0) {
        const inserts = validProducts.map((productId, index) => ({
          product_id: productId,
          position: index + 1,
          is_fixed: true,
          mode: 'auto',
        }))

        const { error: insertError } = await supabase.from('featured_products').insert(inserts)

        if (insertError) throw insertError
      }

      return { success: true }
    } catch (err) {
      console.error('Error guardando productos fijos:', err)
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    featuredProducts,
    settings,
    loading,
    error,

    // Actions
    getFeaturedProducts,
    getSettings,
    saveSettings,
    saveManualProducts,
    saveFixedProducts,
  }
})
