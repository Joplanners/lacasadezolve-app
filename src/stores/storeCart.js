import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from './authStore'

export const useCartStore = defineStore('cart', () => {
  const items = ref([]) // El contenido del carrito
  const loading = ref(false)

  // --- GETTERS (Propiedades Computadas) ---
  const cartItemCount = computed(() => {
    return items.value.reduce((count, item) => count + item.quantity, 0)
  })

  // --- LÓGICA DE SINCRONIZACIÓN ---

  // Carga el carrito desde Supabase si el usuario está logueado
  async function fetchUserCart() {
    const authStore = useAuthStore()
    if (!authStore.user) return

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('product_id, quantity')
        .eq('user_id', authStore.user.id)

      if (error) throw error
      items.value = data || []
    } catch (err) {
      console.error('Error fetching user cart:', err)
    } finally {
      loading.value = false
    }
  }

  // Carga el carrito desde localStorage si es un invitado
  function loadGuestCart() {
    const guestCart = localStorage.getItem('guestCart')
    if (guestCart) {
      items.value = JSON.parse(guestCart)
    } else {
      items.value = []
    }
  }

  // --- ACCIONES PRINCIPALES ---

  // Añadir un producto al carrito
  async function addToCart(productId, quantity = 1) {
    const authStore = useAuthStore()
    const existingItem = items.value.find((item) => item.product_id === productId)

    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      items.value.push({ product_id: productId, quantity })
    }

    if (authStore.user) {
      // Usuario logueado: Guardar en Supabase
      const { error } = await supabase.from('cart_items').upsert({
        user_id: authStore.user.id,
        product_id: productId,
        quantity: existingItem ? existingItem.quantity : quantity,
      })
      if (error) console.error('Error saving to Supabase cart:', error)
    } else {
      // Invitado: Guardar en localStorage
      localStorage.setItem('guestCart', JSON.stringify(items.value))
    }
  }

  // Sincroniza el carrito de invitado con el de la DB al iniciar sesión
  async function syncCartOnLogin() {
    const guestCart = localStorage.getItem('guestCart')
    if (!guestCart) return // No hay nada que sincronizar

    const guestItems = JSON.parse(guestCart)
    await fetchUserCart() // Carga primero el carrito de la DB

    for (const guestItem of guestItems) {
      const dbItem = items.value.find((item) => item.product_id === guestItem.product_id)
      if (dbItem) {
        // Si el producto ya existía en la DB, suma las cantidades
        dbItem.quantity += guestItem.quantity
      } else {
        // Si es un producto nuevo, lo añade
        items.value.push(guestItem)
      }
    }

    // Guarda todo el carrito fusionado en Supabase
    const authStore = useAuthStore()
    const upserts = items.value.map((item) => ({
      user_id: authStore.user.id,
      product_id: item.product_id,
      quantity: item.quantity,
    }))

    const { error } = await supabase.from('cart_items').upsert(upserts)
    if (error) {
      console.error('Error syncing cart:', error)
    } else {
      // Si la sincronización fue exitosa, borramos el carrito de invitado
      localStorage.removeItem('guestCart')
    }
  }

  // Limpiar el carrito (al cerrar sesión o vaciarlo)
  function clearCart() {
    items.value = []
    localStorage.removeItem('guestCart')
  }

  return {
    items,
    loading,
    cartItemCount,
    fetchUserCart,
    loadGuestCart,
    addToCart,
    syncCartOnLogin,
    clearCart,
  }
})
