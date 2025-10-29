import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from './authStore'

export const useCartStore = defineStore('cart', () => {
  const items = ref([]) // Guardará objetos: { product_id, quantity, customizationFiles?, customizationNotes? }
  const loading = ref(false)
  const appliedCoupon = ref(null)

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
          // NO incluimos customizationFiles ni customizationNotes aquí
        }))
      const itemsToRemove = items.value
        .filter((item) => item.quantity <= 0)
        .map((item) => item.product_id)

      // Upsert y Delete en Supabase (sin cambios)
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

      // Limpia estado local (mantiene archivos/notas en memoria)
      items.value = items.value.filter((item) => item.quantity > 0)
    } else {
      // Guarda en localStorage (SOLO product_id y quantity)
      const validItemsForStorage = items.value
        .filter((item) => item.quantity > 0)
        .map((item) => ({ product_id: item.product_id, quantity: item.quantity }))
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
      // Trae solo lo básico
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
      })) // 🔥 Añadido notes vacío
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
        // Carga lo básico e inicializa campos vacíos
        items.value = Array.isArray(parsedItems)
          ? parsedItems
              .filter((item) => item.quantity > 0)
              .map((item) => ({ ...item, customizationFiles: [], customizationNotes: '' })) // 🔥 Añadido notes vacío
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
    await fetchUserCart() // Llena items.value (sin archivos/notas)
    guestItems.forEach((guestItem) => {
      const dbItemIndex = items.value.findIndex((item) => item.product_id === guestItem.product_id)
      if (dbItemIndex > -1) {
        items.value[dbItemIndex].quantity += guestItem.quantity
      } else {
        // Añade item invitado (con campos vacíos)
        items.value.push({ ...guestItem, customizationFiles: [], customizationNotes: '' }) // 🔥 Añadido notes vacío
      }
    })
    await persistCart()
    localStorage.removeItem('guestCart')
  }

  // --- ACCIONES PRINCIPALES ---

  // 🔥 MODIFICADA para aceptar y guardar temporalmente customizationNotes
  async function addToCart(
    productId,
    quantity = 1,
    customizationFiles = [],
    customizationNotes = '',
  ) {
    // 🔥 Nuevo parámetro notes
    const existingItemIndex = items.value.findIndex((item) => item.product_id === productId)
    if (existingItemIndex > -1) {
      items.value[existingItemIndex].quantity += quantity
      // Actualiza/reemplaza archivos Y notas temporalmente
      items.value[existingItemIndex].customizationFiles = customizationFiles || []
      items.value[existingItemIndex].customizationNotes = customizationNotes || '' // 🔥 Guarda/Actualiza notas
    } else {
      items.value.push({
        product_id: productId,
        quantity,
        customizationFiles: customizationFiles || [], // Guarda archivos temporalmente
        customizationNotes: customizationNotes || '', // 🔥 Guarda notas temporalmente
      })
    }
    // persistCart SÓLO guardará product_id y quantity
    await persistCart()
  }

  // --- updateItemQuantity, removeItem, clearCart (sin cambios necesarios en su lógica principal) ---
  async function updateItemQuantity(productId, newQuantity) {
    const quantity = Number(newQuantity)
    if (isNaN(quantity) || quantity < 0) return
    const itemIndex = items.value.findIndex((item) => item.product_id === productId)
    if (itemIndex > -1) {
      if (quantity === 0) {
        items.value[itemIndex].quantity = 0 // Marca para borrar
        await persistCart()
        items.value.splice(itemIndex, 1) // Quita del estado local
      } else {
        items.value[itemIndex].quantity = quantity
        // Notas y archivos se mantienen en el estado local
        await persistCart()
      }
    }
  }

  async function removeItem(productId) {
    const itemIndex = items.value.findIndex((item) => item.product_id === productId)
    if (itemIndex > -1) {
      items.value[itemIndex].quantity = 0 // Marca para borrar
      await persistCart()
      items.value.splice(itemIndex, 1) // Quita del estado local
    }
  }

  async function clearCart() {
    items.value.forEach((item) => (item.quantity = 0)) // Marca todos para borrar
    await persistCart()
    items.value = [] // Limpia estado local
    clearAppliedCoupon()
  }

  // --- ACCIONES PARA CUPONES (sin cambios) ---
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
    appliedCoupon,
    fetchUserCart,
    loadGuestCart,
    addToCart, // <-- Modificada
    syncCartOnLogin,
    clearCart,
    updateItemQuantity,
    removeItem,
    setAppliedCoupon,
    clearAppliedCoupon,
  }
})
