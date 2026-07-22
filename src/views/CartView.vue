<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/stores/storeCart'
import { useProductsStore } from '@/stores/storeProducts'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabaseClient'
import { storeToRefs } from 'pinia'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { calcPrintPrice } from '@/utils/printPricing'

useSeoMeta({
  title: 'Tu Carrito de Compras',
  description: 'Revisa los productos en tu carrito de compras en La Casa de Zolve.',
  url: '/carrito',
  robots: 'noindex, nofollow',
})

const cartStore = useCartStore()
const productsStore = useProductsStore()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

// 🔥 MODIFICADO: Ahora usamos appliedCoupons (plural) del store
const { appliedCoupons } = storeToRefs(cartStore)

const cartProductsDetails = ref([])
const isLoadingDetails = ref(true)
const errorLoadingDetails = ref(null)

// --- ESTADO PARA CUPONES ---
const couponCodeInput = ref('')
const isLoadingCoupon = ref(false)
const couponError = ref('')

// --- LÓGICA DE PRECIOS ---
/**
 * Calcula el precio final de un producto considerando ofertas
 */
function getPriceInfo(product) {
  if (!product) return { finalPrice: 0, originalPrice: 0, onOffer: false }

  const now = new Date()
  let onOffer = false
  let finalPrice = product.price
  let originalPrice = null

  const hasOfferPrice =
    product.offer_price && product.offer_price > 0 && product.offer_price < product.price
  const hasPercentage = product.discount_percentage && product.discount_percentage > 0

  if (hasOfferPrice || hasPercentage) {
    const hasStartDate = !!product.discount_start_date
    const hasEndDate = !!product.discount_end_date
    const startDate = hasStartDate ? new Date(product.discount_start_date) : null
    const endDate = hasEndDate ? new Date(product.discount_end_date) : null

    let isDateValid = true
    if (startDate && now < startDate) isDateValid = false
    if (endDate && now > endDate) isDateValid = false

    if (isDateValid) {
      onOffer = true
      originalPrice = product.price

      if (product.discount_percentage) {
        finalPrice = product.price * (1 - product.discount_percentage / 100)
      } else if (hasOfferPrice) {
        finalPrice = product.offer_price
      }
    }
  }

  return {
    finalPrice: finalPrice,
    originalPrice: originalPrice,
    onOffer: onOffer,
  }
}

const processedCartItems = computed(() => {
  return cartProductsDetails.value.map((item) => {
    const priceInfo = getPriceInfo(item.product)
    
    // 🖨️ Override for print products
    if (item.metadata?.is_print_order) {
      const printQty = item.metadata.print_quantity || 0
      const printResult = calcPrintPrice(item.product.print_quantity_packages, printQty)
      return {
        ...item,
        finalPrice: printResult.total,
        originalPrice: null,
        onOffer: false,
        isPrintOrder: true,
        printQuantity: printQty,
        printUnitPrice: printResult.unitPrice,
        printTotal: printResult.total,
        printBasedOnPackage: printResult.basedOnPackage
      }
    }
    
    // 🔥 Override finalPrice if it's a ticket
    if (item.metadata?.isTicket) {
      const qty = item.quantity
      const basePrice = item.product.price || 2500
      const promoPrice = item.product.ticket_promo_price || (basePrice * 2)
      const ticketTotal = Math.floor(qty / 2) * promoPrice + (qty % 2) * basePrice
      return {
        ...item,
        finalPrice: ticketTotal / qty, // Para que el subtotal matemáticamente funcione
        originalPrice: 2500,
        onOffer: true,
        isTicket: true,
        ticketTotal: ticketTotal
      }
    }

    return {
      ...item,
      ...priceInfo,
    }
  })
})

async function loadCartProductDetails() {
  isLoadingDetails.value = true
  errorLoadingDetails.value = null
  cartProductsDetails.value = []

  const productIds = cartStore.items.map((item) => item.product_id)

  if (productIds.length === 0) {
    isLoadingDetails.value = false
    return
  }

  try {
    const productsData = await productsStore.fetchProductsByIds(productIds)

    cartProductsDetails.value = cartStore.items
      .map((cartItem) => {
        const product = productsData.find((p) => p.id === cartItem.product_id)
        return {
          ...cartItem,
          product: product || null,
        }
      })
      .filter((item) => item.product !== null)

    cartProductsDetails.value.forEach((item) => {
      if (!item.product.is_downloadable && item.product.stock !== null && item.product.stock < item.quantity) {
        toast.warning(
          `Stock insuficiente para "${item.product.name}". Ajustado a ${item.product.stock} unidades.`,
        )
        cartStore.updateItemQuantity(item.id, item.product.stock)
        item.quantity = item.product.stock
      }
    })
    cartProductsDetails.value = cartProductsDetails.value.filter((item) => item.quantity > 0)
  } catch (error) {
    console.error('Error loading cart product details:', error)
    errorLoadingDetails.value = 'Error al cargar los detalles de los productos.'
    toast.error('Hubo un problema al cargar los detalles del carrito.')
  } finally {
    isLoadingDetails.value = false
  }
}

onMounted(loadCartProductDetails)

// --- COMPUTADAS ---
const subtotal = computed(() => {
  return processedCartItems.value.reduce((total, item) => {
    if (item.isPrintOrder) {
      return total + item.printTotal
    }
    return total + item.finalPrice * item.quantity
  }, 0)
})

// 🔥 MODIFICADO: Ahora usa múltiples cupones con método aditivo
const couponDiscount = computed(() => {
  if (!appliedCoupons.value || appliedCoupons.value.length === 0) {
    return 0
  }

  // Suma todos los porcentajes directamente (método aditivo)
  const totalPercent = appliedCoupons.value.reduce((sum, coupon) => {
    return sum + (coupon.discount_percent || 0)
  }, 0)

  return (subtotal.value * totalPercent) / 100
})

const total = computed(() => {
  const finalTotal = subtotal.value - couponDiscount.value
  return Math.max(0, finalTotal)
})

const isCartEmpty = computed(
  () =>
    !isLoadingDetails.value &&
    cartProductsDetails.value.length === 0 &&
    cartStore.items.length === 0,
)
const hasItemsButLoading = computed(() => isLoadingDetails.value && cartStore.items.length > 0)
const hasFailedToLoad = computed(
  () => !isLoadingDetails.value && errorLoadingDetails.value && cartStore.items.length > 0,
)

// 🔥 MODIFICADO: Ahora agrega cupones al array
async function handleApplyCoupon() {
  if (!couponCodeInput.value) return
  isLoadingCoupon.value = true
  couponError.value = ''

  try {
    const code = couponCodeInput.value.toUpperCase().trim()

    // Verifica si ya está aplicado
    const alreadyApplied = appliedCoupons.value.find((c) => c.code === code)
    if (alreadyApplied) {
      throw new Error('Este cupón ya está aplicado.')
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .single()

    if (error || !coupon) {
      throw new Error('El código del cupón no es válido.')
    }
    if (!coupon.is_active) {
      throw new Error('Este cupón ya no está activo.')
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      throw new Error('Este cupón ha expirado.')
    }

    if (coupon.coupon_type === 'FIRST_PURCHASE') {
      if (!authStore.isLoggedIn) {
        throw new Error('Debes iniciar sesión para usar este cupón.')
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('used_first_purchase_coupon')
        .eq('id', authStore.user.id)
        .single()

      if (profileError) throw new Error('No se pudo verificar tu perfil.')
      if (profile && profile.used_first_purchase_coupon) {
        throw new Error('Este cupón solo es válido para tu primera compra.')
      }
    }

    // Añade al store
    cartStore.addAppliedCoupon(coupon)
    couponCodeInput.value = ''
    toast.success(`¡Cupón "${coupon.code}" aplicado!`)
  } catch (err) {
    couponError.value = err.message
    toast.error(err.message)
  } finally {
    isLoadingCoupon.value = false
  }
}

// 🔥 MODIFICADO: Ahora quita cupones individuales
function removeCoupon(couponCode) {
  cartStore.removeAppliedCoupon(couponCode)
  toast.info('Cupón eliminado.')
}

async function handleUpdateQuantity(itemId, newQuantity) {
  const item = cartProductsDetails.value.find((item) => item.id === itemId)
  if (!item) return

  // 🖨️ For print products, update the print_quantity in metadata
  if (item.metadata?.is_print_order) {
    const newPrintQty = Math.max(1, newQuantity)
    const newResult = calcPrintPrice(item.product.print_quantity_packages, newPrintQty)
    
    // Update metadata
    item.metadata = {
      ...item.metadata,
      print_quantity: newPrintQty,
      print_unit_price: newResult.unitPrice,
      print_total: newResult.total,
      based_on_package: newResult.basedOnPackage
    }
    
    // Persist the metadata update
    try {
      await cartStore.updateItemQuantity(item.id, 1) // quantity stays 1
      // Re-persist with updated metadata
      const cartItem = cartStore.items.find(ci => ci.id === item.id)
      if (cartItem) {
        cartItem.metadata = { ...item.metadata }
        await cartStore.persistCart ? cartStore.persistCart() : null
      }
      // Reload to reflect changes
      await loadCartProductDetails()
    } catch (error) {
      console.error('Error updating print item:', error)
      toast.error('No se pudo actualizar la cantidad.')
    }
    return
  }

  const stock = item.product.stock
  let finalQuantity = Math.max(0, newQuantity)

  if (!item.product.is_downloadable && stock !== null && finalQuantity > stock) {
    toast.error(`Solo quedan ${stock} unidades de "${item.product.name}".`)
    finalQuantity = stock
  }

  const originalQuantity = item.quantity
  item.quantity = finalQuantity

  try {
    if (finalQuantity === 0) {
      await cartStore.removeItem(itemId)
      cartProductsDetails.value = cartProductsDetails.value.filter(
        (i) => i.id !== itemId,
      )
      toast.info(`"${item.product.name}" eliminado del carrito.`)
    } else {
      await cartStore.updateItemQuantity(itemId, finalQuantity)
    }
  } catch (error) {
    console.error('Error updating cart item:', error)
    toast.error('No se pudo actualizar el carrito. Intenta de nuevo.')
    item.quantity = originalQuantity
  }
}

async function handleRemoveItem(itemId, productName) {
  const originalItems = [...cartProductsDetails.value]
  cartProductsDetails.value = cartProductsDetails.value.filter((i) => i.id !== itemId)

  try {
    await cartStore.removeItem(itemId)
    toast.info(`"${productName}" eliminado del carrito.`)
  } catch (error) {
    console.error('Error removing cart item:', error)
    toast.error('No se pudo eliminar el producto. Intenta de nuevo.')
    cartProductsDetails.value = originalItems
  }
}

function goToCheckout() {
  router.push({ name: 'checkout' })
}

function formatPrice(value) {
  if (typeof value !== 'number') return ''
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value)
}
</script>

<template>
  <div class="cart-view-container">
    <div class="cart-header">
      <h1>Tu Carrito de Compras 🛒</h1>
    </div>

    <div v-if="isCartEmpty && !isLoadingDetails" class="empty-cart">
      <p class="empty-cart-emoji">🦊</p>
      <h2>¡Tu carrito está vacío!</h2>
      <p>Parece que aún no has añadido ningún producto. ¿Por qué no exploras nuestra tienda?</p>
      <router-link :to="{ name: 'store' }" class="btn btn-primary">Ir a la Tienda</router-link>
    </div>

    <div v-else-if="hasItemsButLoading" class="loading-cart">
      <div class="spinner"></div>
      <p>Cargando productos del carrito...</p>
    </div>

    <div v-else-if="hasFailedToLoad" class="error-cart">
      <p>❌ Hubo un error al cargar los detalles de tu carrito.</p>
      <p>{{ errorLoadingDetails }}</p>
      <button @click="loadCartProductDetails" class="btn btn-secondary">Intentar de Nuevo</button>
    </div>

    <div v-else class="cart-layout">
      <div class="product-list">
        <div v-for="item in processedCartItems" :key="item.id" class="cart-item">
          <img
            :src="
              item.product.image_urls && item.product.image_urls.length > 0
                ? item.product.image_urls[0]
                : '/Zolve_Logo.webp'
            "
            :alt="item.product.name"
            class="item-image"
          />
          <div class="item-details">
            <h3 class="item-name">{{ item.product.name }}</h3>

            <div v-if="item.metadata && (item.metadata.size || item.metadata.isTicket || item.product.is_downloadable || item.metadata.is_print_order)" class="item-metadata-labels">
              <span v-if="item.metadata.is_print_order" class="meta-label" style="background-color: #fff8e1; color: #e65100; border-color: #ffe0b2;">🖨️ Impresión</span>
              <span v-if="item.metadata.is_print_order && item.metadata.print_design" class="meta-label" style="background-color: #fce4ec; color: #c2185b; border-color: #f8bbd0;">🎨 {{ item.metadata.print_design }}</span>
              <span v-if="item.product.is_downloadable" class="meta-label" style="background-color: #f3e5f5; color: #9c27b0; border-color: #e1bee7;">📥 Descarga Digital</span>
              <span v-if="item.metadata.size" class="meta-label">Talla: <strong>{{ item.metadata.size }}</strong></span>
              <span v-if="item.metadata.isTicket" class="meta-label">Detalles de {{ item.metadata.tickets?.length }} Entrada(s) incluidos</span>
            </div>

            <p class="item-price">
              <span v-if="item.isPrintOrder" class="final-item-price" style="color: #e65100;">🖨️ {{ item.printQuantity }} uds × {{ formatPrice(item.printUnitPrice) }} c/u</span>
              <span v-else-if="item.isTicket" class="final-item-price promo-text">¡Promo Entradas! ✨</span>
              <span v-else class="final-item-price">{{ formatPrice(item.finalPrice) }} c/u</span>
              <span v-if="item.onOffer && !item.isTicket" class="original-item-price">
                {{ formatPrice(item.originalPrice) }}
              </span>
            </p>
            <p
              v-if="
                !item.product.is_downloadable && item.product.stock !== null && item.product.stock <= 10 && item.product.stock > 0
              "
              class="item-stock-warning"
            >
              ¡Solo quedan {{ item.product.stock }}!
            </p>
            <p v-else-if="!item.product.is_downloadable && item.product.stock === 0" class="item-stock-warning out-of-stock">
              ¡Agotado! (Elimínalo)
            </p>
          </div>

          <div class="item-quantity-selector">
            <template v-if="item.isPrintOrder">
              <button
                @click="handleUpdateQuantity(item.id, item.printQuantity - 1)"
                :disabled="item.printQuantity <= 1"
                class="quantity-btn"
                aria-label="Disminuir cantidad"
              >
                -
              </button>
              <span class="quantity-display">{{ item.printQuantity }}</span>
              <button
                @click="handleUpdateQuantity(item.id, item.printQuantity + 1)"
                class="quantity-btn"
                aria-label="Aumentar cantidad"
              >
                +
              </button>
            </template>
            <template v-else>
              <button
                @click="handleUpdateQuantity(item.id, item.quantity - 1)"
                :disabled="item.quantity <= 1"
                class="quantity-btn"
                aria-label="Disminuir cantidad"
              >
                -
              </button>
              <span class="quantity-display">{{ item.quantity }}</span>
              <button
                @click="handleUpdateQuantity(item.id, item.quantity + 1)"
                :disabled="!item.product.is_downloadable && item.product.stock !== null && item.quantity >= item.product.stock"
                class="quantity-btn"
                aria-label="Aumentar cantidad"
              >
                +
              </button>
            </template>
          </div>

          <div class="item-total">
            <template v-if="item.isPrintOrder">
              {{ formatPrice(item.printTotal) }}
            </template>
            <template v-else>
              {{ formatPrice(item.finalPrice * item.quantity) }}
            </template>
          </div>

          <button
            @click="handleRemoveItem(item.id, item.product.name)"
            class="remove-item-btn"
            title="Eliminar producto"
          >
            &times;
          </button>
        </div>
      </div>

      <aside class="order-summary">
        <h3>Resumen del Pedido</h3>
        <div class="summary-row">
          <span>Subtotal</span>
          <span>{{ formatPrice(subtotal) }}</span>
        </div>

        <!-- 🔥 SECCIÓN DE CUPONES MODIFICADA -->
        <div class="coupon-section">
          <!-- Input para agregar cupón -->
          <div class="coupon-input-container">
            <label for="coupon-input">¿Tienes un cupón?</label>
            <div class="coupon-input-group">
              <input
                type="text"
                id="coupon-input"
                v-model="couponCodeInput"
                placeholder="Ingresa tu código"
                :disabled="isLoadingCoupon"
                @keyup.enter="handleApplyCoupon"
              />
              <button @click="handleApplyCoupon" :disabled="isLoadingCoupon">
                {{ isLoadingCoupon ? '...' : 'Aplicar' }}
              </button>
            </div>
            <p v-if="couponError" class="coupon-error">{{ couponError }}</p>
          </div>

          <!-- Lista de cupones aplicados -->
          <div v-if="appliedCoupons && appliedCoupons.length > 0" class="applied-coupons-list">
            <p class="coupons-label">Cupones aplicados:</p>
            <div v-for="coupon in appliedCoupons" :key="coupon.code" class="applied-coupon-item">
              <span class="coupon-info">
                <strong>{{ coupon.code }}</strong> (-{{ coupon.discount_percent }}%)
              </span>
              <button
                @click="removeCoupon(coupon.code)"
                class="remove-coupon-btn"
                title="Quitar cupón"
              >
                &times;
              </button>
            </div>

            <!-- Descuento total -->
            <div class="summary-row total-discount-row">
              <span>Descuento Total</span>
              <span>- {{ formatPrice(couponDiscount) }}</span>
            </div>
          </div>
        </div>
        <!-- 🔥 FIN SECCIÓN DE CUPONES -->

        <div class="summary-row">
          <span>Envío</span>
          <small>Se calculará en el siguiente paso</small>
        </div>
        <div class="summary-total">
          <span>Total</span>
          <span>{{ formatPrice(total) }}</span>
        </div>
        <button @click="goToCheckout" class="btn btn-primary btn-checkout">
          Continuar con la Compra
        </button>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* Estilos generales y de header */
.cart-view-container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px 40px;
}
.cart-header {
  text-align: center;
  margin-bottom: 40px;
}
.cart-header h1 {
  font-size: 2.5rem;
  color: var(--color-heading);
}

/* Estilos Empty Cart */
.empty-cart {
  text-align: center;
  padding: 60px 20px;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
.empty-cart-emoji {
  font-size: 4rem;
  margin: 0;
}
.empty-cart h2 {
  font-size: 1.8rem;
  margin-top: 10px;
}
.empty-cart p {
  color: var(--color-text-soft);
  margin-bottom: 30px;
}

/* Estilos Loading y Error Cart */
.loading-cart,
.error-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  text-align: center;
}
.loading-cart p,
.error-cart p {
  font-style: italic;
  color: #555;
  margin-top: 15px;
}
.error-cart p:first-of-type {
  font-style: normal;
  font-weight: bold;
  color: var(--brand-pink);
}
.error-cart button {
  margin-top: 20px;
}
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid var(--brand-turquoise);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Layout principal del carrito */
.cart-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 40px;
  align-items: flex-start;
}
.product-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Estilos del Item */
.cart-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-background-soft);
}
.item-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}
.item-details {
  flex-grow: 1;
}
.item-name {
  font-size: 1.1rem;
  margin: 0 0 5px 0;
  color: var(--color-heading);
}

/* Estilos para precio de item */
.item-price {
  margin: 0;
}
.final-item-price {
  font-size: 0.9rem;
  color: #555;
  font-weight: bold;
  margin-right: 8px;
}
.original-item-price {
  font-size: 0.8rem;
  color: #999;
  text-decoration: line-through;
  font-weight: normal;
}

.item-stock-warning {
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--brand-pink);
  margin-top: 5px;
}
.item-stock-warning.out-of-stock {
  color: #d93025;
}

.item-metadata-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 5px;
}
.meta-label {
  background-color: #f1f3f4;
  color: #5f6368;
  font-size: 0.75rem;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #dadce0;
}
.promo-text {
  color: var(--brand-pink) !important;
}

/* Selector de cantidad +/- */
.item-quantity-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.quantity-btn {
  background-color: var(--color-background-mute);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
  transition: background-color 0.2s;
}
.quantity-btn:hover:not(:disabled) {
  background-color: var(--color-border-hover);
}
.quantity-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.quantity-display {
  font-weight: 500;
  min-width: 25px;
  text-align: center;
}

/* Total del item y botón eliminar */
.item-total {
  font-weight: bold;
  min-width: 90px;
  text-align: right;
  flex-shrink: 0;
}
.remove-item-btn {
  background: none;
  border: none;
  font-size: 1.6rem;
  color: #aaa;
  cursor: pointer;
  padding: 0 5px;
  line-height: 1;
  transition: color 0.2s ease;
  flex-shrink: 0;
}
.remove-item-btn:hover:not(:disabled) {
  color: var(--brand-pink);
}

/* Resumen del pedido */
.order-summary {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 25px;
  background-color: var(--color-background-soft);
  position: sticky;
  top: 20px;
}
.order-summary h3 {
  margin-top: 0;
  text-align: center;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 15px;
  margin-bottom: 20px;
}
.summary-row,
.summary-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.summary-row small {
  font-style: italic;
  color: var(--color-text-soft);
}
.summary-total {
  font-size: 1.2rem;
  font-weight: bold;
  border-top: 1px solid var(--color-border);
  padding-top: 15px;
  margin-top: 20px;
}

/* 🔥 ESTILOS DE CUPONES ACTUALIZADOS PARA MÚLTIPLES */
.coupon-section {
  border-top: 1px dashed var(--color-border);
  border-bottom: 1px dashed var(--color-border);
  padding: 15px 0;
  margin: 15px 0;
}

/* Contenedor del input de cupón */
.coupon-input-container {
  margin-bottom: 15px;
}

.coupon-section label {
  font-weight: 500;
  font-size: 0.9rem;
  display: block;
  margin-bottom: 8px;
}
.coupon-input-group {
  display: flex;
}
.coupon-input-group input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px 0 0 4px;
}
.coupon-input-group button {
  padding: 8px 12px;
  border: 1px solid var(--brand-turquoise);
  background-color: var(--brand-turquoise);
  color: white;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}
.coupon-input-group button:hover:not(:disabled) {
  background-color: #45a89e;
}
.coupon-input-group button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.coupon-error {
  color: #d32f2f;
  font-size: 0.8rem;
  margin-top: 5px;
}

/* Lista de cupones aplicados */
.applied-coupons-list {
  margin-top: 15px;
}

.coupons-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-soft);
  margin-bottom: 10px;
}

/* Cada cupón individual */
.applied-coupon-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #e8f5e9;
  border: 1px solid #4caf50;
  border-radius: 6px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.applied-coupon-item:hover {
  background-color: #c8e6c9;
  border-color: #388e3c;
}

.coupon-info {
  font-size: 0.9rem;
  color: #2e7d32;
  display: flex;
  align-items: center;
  gap: 8px;
}

.coupon-info strong {
  font-weight: 700;
  color: #1b5e20;
}

/* Botón para quitar cupón individual */
.applied-coupon-item .remove-coupon-btn {
  background: none;
  border: none;
  font-size: 1.4rem;
  color: #666;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.2s ease;
}

.applied-coupon-item .remove-coupon-btn:hover {
  color: #d32f2f;
  transform: scale(1.1);
}

/* Fila del descuento total */
.total-discount-row {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--color-border);
  font-weight: 600;
  color: #2e7d32;
}

.total-discount-row span:last-child {
  color: #1b5e20;
  font-size: 1.05rem;
}
/* 🔥 FIN ESTILOS DE CUPONES */

/* Botones */
.btn {
  display: inline-block;
  text-align: center;
  text-decoration: none;
  border: none;
  border-radius: 5px;
  padding: 12px 25px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-primary {
  background-color: var(--brand-pink);
  color: white;
}
.btn-primary:hover {
  background-color: #e65c7a;
  transform: translateY(-2px);
}
.btn-secondary {
  background-color: var(--brand-turquoise);
  color: white;
}
.btn-checkout {
  width: 100%;
  margin-top: 20px;
  padding: 15px;
  font-size: 1.1rem;
}

/* Media Queries */
@media (max-width: 900px) {
  .cart-layout {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  .order-summary {
    position: static;
  }
}

@media (max-width: 600px) {
  .cart-view-container {
    padding: 20px 15px;
  }
  .cart-header h1 {
    font-size: 1.8rem;
  }
  .cart-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-rows: auto auto;
    gap: 10px 15px;
    align-items: center;
  }
  .item-image {
    grid-row: 1 / 3;
    width: 65px;
    height: 65px;
  }
  .item-details {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
  }
  .item-quantity-selector {
    grid-column: 2 / 3;
    grid-row: 2 / 3;
    justify-self: start;
  }
  .item-total {
    grid-column: 3 / 4;
    grid-row: 2 / 3;
    justify-self: end;
    align-self: center;
    min-width: unset;
  }
  .remove-item-btn {
    grid-column: 3 / 4;
    grid-row: 1 / 2;
    justify-self: end;
    align-self: start;
  }
}
</style>
