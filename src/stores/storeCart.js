import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from './authStore'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const loading = ref(false)

  // --- NUEVO ESTADO PARA EL CUPÓN ---
  const appliedCoupon = ref(null)

  // --- GETTERS (Propiedades Computadas) ---
  const cartItemCount = computed(() => {
    return items.value.reduce((count, item) => count + item.quantity, 0)
  })

  // --- LÓGICA DE PERSISTENCIA ---
  async function persistCart() {
    const authStore = useAuthStore()
    if (authStore.user) {
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

      if (itemsToUpsert.length > 0) {
        const { error: upsertError } = await supabase.from('cart_items').upsert(itemsToUpsert)
        if (upsertError) console.error('Error upserting Supabase cart:', upsertError)
      }

      if (itemsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', authStore.user.id)
          .in('product_id', itemsToRemove)
        if (deleteError) console.error('Error deleting from Supabase cart:', deleteError)
      }

      items.value = items.value.filter((item) => item.quantity > 0)
    } else {
      const validItems = items.value.filter((item) => item.quantity > 0)
      localStorage.setItem('guestCart', JSON.stringify(validItems))
      items.value = validItems
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
      items.value = data || []
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
          ? parsedItems.filter((item) => item.quantity > 0)
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
        items.value.push(guestItem)
      }
    })

    await persistCart()
    localStorage.removeItem('guestCart')
  }

  // --- ACCIONES PRINCIPALES ---
  async function addToCart(productId, quantity = 1) {
    const existingItemIndex = items.value.findIndex((item) => item.product_id === productId)
    if (existingItemIndex > -1) {
      items.value[existingItemIndex].quantity += quantity
    } else {
      items.value.push({ product_id: productId, quantity })
    }
    await persistCart()
  }

  async function updateItemQuantity(productId, newQuantity) {
    const quantity = Number(newQuantity)
    if (isNaN(quantity) || quantity < 0) return
    const itemIndex = items.value.findIndex((item) => item.product_id === productId)
    if (itemIndex > -1) {
      if (quantity === 0) {
        await removeItem(productId)
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
    }
  }

  async function clearCart() {
    items.value.forEach((item) => (item.quantity = 0))
    await persistCart()
    items.value = []
    // Limpiamos también el cupón
    clearAppliedCoupon()
  }

  // --- NUEVAS ACCIONES PARA CUPONES ---
  function setAppliedCoupon(coupon) {
    appliedCoupon.value = coupon
  }

  function clearAppliedCoupon() {
    appliedCoupon.value = null
  }

  return {
    items,
    loading,
    cartItemCount,
    appliedCoupon, // Exportamos el estado
    fetchUserCart,
    loadGuestCart,
    addToCart,
    syncCartOnLogin,
    clearCart,
    updateItemQuantity,
    removeItem,
    setAppliedCoupon, // Exportamos la acción
    clearAppliedCoupon, // Exportamos la acción
  }
})
