import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from './authStore'

export const useCartStore = defineStore('cart', () => {
  // Estado
  const items = ref([]) // { product_id, quantity, customizationFiles?, customizationNotes? }
  const loading = ref(false)
  const appliedCoupons = ref([]) // Array para múltiples cupones

  // --- GETTERS ---
  const cartItemCount = computed(() => {
    return items.value.reduce((count, item) => count + item.quantity, 0)
  })

  // --- LÓGICA DE PERSISTENCIA ---
  async function persistCart() {
    const authStore = useAuthStore()

    if (authStore.user) {
      // Prepara datos para Supabase (SOLO product_id y quantity)
      const itemsToUpsert = items.value
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          user_id: authStore.user.id,
          product_id: item.product_id,
          quantity: item.quantity,
        }))

      const itemsToRemove = items.value
        .filter((item) => item.quantity <= 0)
        .map((item) => item.product_id)

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
          .in('product_id', itemsToRemove)
        if (deleteError) console.error('Error deleting from Supabase cart:', deleteError)
      }

      // Limpia estado local (mantiene archivos/notas en memoria)
      items.value = items.value.filter((item) => item.quantity > 0)
    } else {
      // Guarda en localStorage (SOLO product_id y quantity)
      const validItemsForStorage = items.value
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
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
        .select('product_id, quantity')
        .eq('user_id', authStore.user.id)
        .gt('quantity', 0)

      if (error) throw error

      // Inicializa items con campos vacíos para archivos/notas
      items.value = (data || []).map((item) => ({
        ...item,
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
      const dbItemIndex = items.value.findIndex((item) => item.product_id === guestItem.product_id)

      if (dbItemIndex > -1) {
        items.value[dbItemIndex].quantity += guestItem.quantity
      } else {
        items.value.push({
          ...guestItem,
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
  ) {
    const existingItemIndex = items.value.findIndex((item) => item.product_id === productId)

    if (existingItemIndex > -1) {
      items.value[existingItemIndex].quantity += quantity
      items.value[existingItemIndex].customizationFiles = customizationFiles || []
      items.value[existingItemIndex].customizationNotes = customizationNotes || ''
    } else {
      items.value.push({
        product_id: productId,
        quantity,
        customizationFiles: customizationFiles || [],
        customizationNotes: customizationNotes || '',
      })
    }

    await persistCart()
  }

  async function updateItemQuantity(productId, newQuantity) {
    const quantity = Number(newQuantity)
    if (isNaN(quantity) || quantity < 0) return

    const itemIndex = items.value.findIndex((item) => item.product_id === productId)

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

  async function removeItem(productId) {
    const itemIndex = items.value.findIndex((item) => item.product_id === productId)

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
