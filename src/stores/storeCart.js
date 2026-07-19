import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from './authStore'
import { v4 as uuidv4 } from 'uuid'

export const useCartStore = defineStore('cart', () => {
  // Estado
  const items = ref([]) // { id, product_id, quantity, metadata, customizationFiles?, customizationNotes? }
  const loading = ref(false)
  const appliedCoupons = ref([]) // Array para múltiples cupones

  // --- GETTERS ---
  const cartItemCount = computed(() => {
    return items.value.reduce((count, item) => count + item.quantity, 0)
  })

  const hasDigitalItems = computed(() => {
    return items.value.some(item => item.metadata?.is_downloadable)
  })

  const hasPhysicalItems = computed(() => {
    return items.value.some(item => !item.metadata?.is_downloadable)
  })

  const hasOnlyDigitalItems = computed(() => {
    return items.value.length > 0 && hasDigitalItems.value && !hasPhysicalItems.value
  })

  // --- LÓGICA DE PERSISTENCIA ---
  async function persistCart() {
    const authStore = useAuthStore()

    if (authStore.user) {
      // Prepara datos para Supabase (id, product_id, quantity y metadata)
      const itemsToUpsert = items.value
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          id: item.id,
          user_id: authStore.user.id,
          product_id: item.product_id,
          quantity: item.quantity,
          metadata: item.metadata || {},
        }))

      const itemsToRemove = items.value
        .filter((item) => item.quantity <= 0)
        .map((item) => item.id)

      // Upsert en Supabase
      if (itemsToUpsert.length > 0) {
        const { error: upsertError } = await supabase.from('cart_items').upsert(itemsToUpsert)
        if (upsertError) console.error('Error upserting Supabase cart:', upsertError)
      }

      // Delete en Supabase
      if (itemsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', authStore.user.id)
          .in('id', itemsToRemove)
        if (deleteError) console.error('Error deleting from Supabase cart:', deleteError)
      }

      // Limpia estado local (mantiene archivos/notas en memoria)
      items.value = items.value.filter((item) => item.quantity > 0)
    } else {
      // Guarda en localStorage
      const validItemsForStorage = items.value
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          metadata: item.metadata || {},
        }))

      localStorage.setItem('guestCart', JSON.stringify(validItemsForStorage))

      // Mantiene estado local completo (con archivos/notas)
      items.value = items.value.filter((item) => item.quantity > 0)
    }
  }

  // --- LÓGICA DE SINCRONIZACIÓN ---
  async function fetchUserCart() {
    const authStore = useAuthStore()
    if (!authStore.user) return

    loading.value = true

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('id, product_id, quantity, metadata')
        .eq('user_id', authStore.user.id)
        .gt('quantity', 0)

      if (error) throw error

      // Inicializa items con campos vacíos para archivos/notas
      items.value = (data || []).map((item) => ({
        ...item,
        metadata: item.metadata || {},
        customizationFiles: [],
        customizationNotes: '',
      }))
    } catch (err) {
      console.error('Error fetching user cart:', err)
    } finally {
      loading.value = false
    }
  }

  function loadGuestCart() {
    const guestCart = localStorage.getItem('guestCart')

    if (guestCart) {
      try {
        const parsedItems = JSON.parse(guestCart)
        items.value = Array.isArray(parsedItems)
          ? parsedItems
              .filter((item) => item.quantity > 0)
              .map((item) => ({
                ...item,
                id: item.id || uuidv4(),
                metadata: item.metadata || {},
                customizationFiles: [],
                customizationNotes: '',
              }))
          : []
      } catch (e) {
        console.error('Error parsing guest cart from localStorage', e)
        items.value = []
        localStorage.removeItem('guestCart')
      }
    } else {
      items.value = []
    }
  }

  async function syncCartOnLogin() {
    const guestCart = localStorage.getItem('guestCart')
    if (!guestCart) return

    const guestItems = JSON.parse(guestCart).filter((item) => item.quantity > 0)

    if (guestItems.length === 0) {
      localStorage.removeItem('guestCart')
      return
    }

    await fetchUserCart()

    guestItems.forEach((guestItem) => {
      // Busca si existe en DB mismo producto y misma metadata
      const dbItemIndex = items.value.findIndex(
        (item) => item.product_id === guestItem.product_id && JSON.stringify(item.metadata || {}) === JSON.stringify(guestItem.metadata || {})
      )

      if (dbItemIndex > -1) {
        items.value[dbItemIndex].quantity += guestItem.quantity
      } else {
        items.value.push({
          ...guestItem,
          id: uuidv4(), // Regenerar ID al subir al carrito de logged in para evitar conflictos
          customizationFiles: [],
          customizationNotes: '',
        })
      }
    })

    await persistCart()
    localStorage.removeItem('guestCart')
  }

  // --- ACCIONES PRINCIPALES ---
  async function addToCart(
    productId,
    quantity = 1,
    customizationFiles = [],
    customizationNotes = '',
    metadata = {}
  ) {
    const existingItemIndex = items.value.findIndex(
      (item) => item.product_id === productId && JSON.stringify(item.metadata || {}) === JSON.stringify(metadata || {})
    )

    if (existingItemIndex > -1) {
      items.value[existingItemIndex].quantity += quantity
      items.value[existingItemIndex].customizationFiles = customizationFiles || []
      items.value[existingItemIndex].customizationNotes = customizationNotes || ''
    } else {
      items.value.push({
        id: uuidv4(),
        product_id: productId,
        quantity,
        metadata: metadata || {},
        customizationFiles: customizationFiles || [],
        customizationNotes: customizationNotes || '',
      })
    }

    await persistCart()
  }

  async function updateItemQuantity(itemId, newQuantity) {
    const quantity = Number(newQuantity)
    if (isNaN(quantity) || quantity < 0) return

    const itemIndex = items.value.findIndex((item) => item.id === itemId)

    if (itemIndex > -1) {
      if (quantity === 0) {
        items.value[itemIndex].quantity = 0
        await persistCart()
        items.value.splice(itemIndex, 1)
      } else {
        items.value[itemIndex].quantity = quantity
        await persistCart()
      }
    }
  }

  async function removeItem(itemId) {
    const itemIndex = items.value.findIndex((item) => item.id === itemId)

    if (itemIndex > -1) {
      items.value[itemIndex].quantity = 0
      await persistCart()
      items.value.splice(itemIndex, 1)
    }
  }

  async function clearCart() {
    items.value.forEach((item) => (item.quantity = 0))
    await persistCart()
    items.value = []
    clearAppliedCoupons()
  }

  // --- LÓGICA DE MÚLTIPLES CUPONES ---
  /**
   * Añade un cupón al array, si no existe ya
   * @param {object} coupon - El objeto de cupón validado (de Supabase)
   */
  function addAppliedCoupon(coupon) {
    if (!coupon || !coupon.code) return

    const couponExists = appliedCoupons.value.find((c) => c.code === coupon.code)

    if (!couponExists) {
      appliedCoupons.value.push(coupon)
      // Opcional: Persistir en localStorage para invitados
      // localStorage.setItem('guestCoupons', JSON.stringify(appliedCoupons.value))
    }
  }

  /**
   * Quita un cupón del array usando su código
   * @param {string} couponCode - El código del cupón a quitar
   */
  function removeAppliedCoupon(couponCode) {
    appliedCoupons.value = appliedCoupons.value.filter((c) => c.code !== couponCode)
    // Opcional: Actualizar localStorage para invitados
    // localStorage.setItem('guestCoupons', JSON.stringify(appliedCoupons.value))
  }

  /**
   * Limpia todos los cupones aplicados
   */
  function clearAppliedCoupons() {
    appliedCoupons.value = []
    // Opcional: Limpiar localStorage para invitados
    // localStorage.removeItem('guestCoupons')
  }

  // --- RETORNO DEL STORE ---
  return {
    // Estado
    items,
    loading,
    appliedCoupons,

    // Getters
    cartItemCount,
    hasDigitalItems,
    hasPhysicalItems,
    hasOnlyDigitalItems,

    // Acciones de sincronización
    fetchUserCart,
    loadGuestCart,
    syncCartOnLogin,

    // Acciones de carrito
    addToCart,
    updateItemQuantity,
    removeItem,
    clearCart,

    // Acciones de cupones
    addAppliedCoupon,
    removeAppliedCoupon,
    clearAppliedCoupons,
  }
})
