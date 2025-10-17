import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabaseClient'

export const useProductsStore = defineStore('products', () => {
  // State
  const products = ref([])
  const totalProducts = ref(0) // Para la paginación
  const categories = ref([])
  const loading = ref(false)
  const error = ref(null)

  // --- OBTENER PRODUCTOS PARA LA TIENDA PÚBLICA (CON PAGINACIÓN) ---
  const fetchProducts = async (
    page = 1,
    limit = 9,
    categoryId = null,
    sortOption = 'created_at_desc',
  ) => {
    try {
      loading.value = true
      error.value = null

      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('products')
        .select(
          `
          id, name, price, offer_price, discount_percentage,
          discount_start_date, discount_end_date, image_urls,
          category:product_categories ( name )
        `,
          { count: 'exact' },
        ) // Pedimos el conteo total
        .eq('is_active', true)

      // Aplicar filtro de categoría si existe
      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      // Aplicar ordenamiento
      switch (sortOption) {
        case 'price_asc':
          query = query.order('price', { ascending: true })
          break
        case 'price_desc':
          query = query.order('price', { ascending: false })
          break
        case 'created_at_asc':
          query = query.order('created_at', { ascending: true })
          break
        case 'offer_desc':
          query = query.order('discount_percentage', { ascending: false, nullsLast: true })
          break
        default:
          query = query.order('created_at', { ascending: false })
          break
      }

      // Aplicar rango para la paginación
      query = query.range(from, to)

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      products.value = data || []
      totalProducts.value = count || 0
    } catch (err) {
      console.error('Error obteniendo productos:', err)
      error.value = err.message
      products.value = []
      totalProducts.value = 0
    } finally {
      loading.value = false
    }
  }

  // --- OTRAS FUNCIONES DE LECTURA ---

  // Obtener todos los productos (para el panel de admin)
  const fetchAllProducts = async () => {
    try {
      loading.value = true
      error.value = null
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*, category:product_categories(*)')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      products.value = data || []
      return products.value
    } catch (err) {
      console.error('Error obteniendo todos los productos:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Obtener un producto por su ID (para la página de detalle)
  const fetchProductById = async (productId) => {
    try {
      loading.value = true
      error.value = null
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*, category:product_categories(*)')
        .eq('id', productId)
        .single()
      if (fetchError) throw fetchError
      return data
    } catch (err) {
      console.error('Error obteniendo producto:', err)
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Obtener todas las categorías
  const fetchCategories = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('product_categories')
        .select('*')
        .order('name', { ascending: true })
      if (fetchError) throw fetchError
      categories.value = data || []
      return categories.value
    } catch (err) {
      console.error('Error obteniendo categorías:', err)
      return []
    }
  }

  // --- FUNCIONES DE ESCRITURA (CRUD PARA ADMIN) ---

  // Crear producto
  const createProduct = async (productData) => {
    try {
      loading.value = true
      error.value = null
      const { data, error: insertError } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single()
      if (insertError) throw insertError
      products.value.unshift(data)
      return { success: true, data }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Actualizar producto
  const updateProduct = async (productId, productData) => {
    try {
      loading.value = true
      error.value = null
      const { data, error: updateError } = await supabase
        .from('products')
        .update(productData)
        .eq('id', productId)
        .select()
        .single()
      if (updateError) throw updateError
      const index = products.value.findIndex((p) => p.id === productId)
      if (index !== -1) products.value[index] = data
      return { success: true, data }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Eliminar producto (marcar como inactivo)
  const deleteProduct = async (productId) => {
    try {
      loading.value = true
      error.value = null
      const { error: deleteError } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId)
      if (deleteError) throw deleteError
      products.value = products.value.filter((p) => p.id !== productId)
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    products,
    totalProducts,
    categories,
    loading,
    error,
    // Actions
    fetchProducts,
    fetchAllProducts,
    fetchProductById,
    fetchCategories,
    createProduct,
    updateProduct,
    deleteProduct,
  }
})
