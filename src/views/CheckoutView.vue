<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/storeCart'
import { useProductsStore } from '@/stores/storeProducts'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabaseClient'
import regionesComunasData from '@/data/regiones_comunas.json'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faUniversity, faTruck, faHandshake } from '@fortawesome/free-solid-svg-icons'
import { useToast } from 'vue-toastification'
import { isValidRut } from '@/utils/validation.js'
import { storeToRefs } from 'pinia'

const router = useRouter()
const cartStore = useCartStore()
const productsStore = useProductsStore()
const authStore = useAuthStore()
const toast = useToast()

const { appliedCoupon } = storeToRefs(cartStore)

const customerData = ref({
  fullName: '',
  rut: '',
  email: '',
  phone: '',
  region: '',
  commune: '',
  addressStreet: '',
  addressNumber: '',
  addressDetail: '',
})

const regions = ref(regionesComunasData)
const communes = ref([])
const selectedRegionObject = ref(null)
const selectedPaymentMethod = ref('')
const selectedShippingMethod = ref('')
const isSubmitting = ref(false)
const userProfileData = ref(null)
const loadingProfile = ref(false)
const useSavedAddress = ref(true)
const cartProductDetails = ref([])
const loadingCartDetails = ref(true)

const pagoPopup = ref(null)
const isProcessingPayment = ref(false)
let paymentCompleted = false

const hasSavedAddress = computed(() => {
  return (
    !!userProfileData.value?.shipping_address &&
    typeof userProfileData.value.shipping_address === 'object' &&
    Object.values(userProfileData.value.shipping_address).some((v) => v)
  )
})

const subtotal = computed(() => {
  return cartProductDetails.value.reduce((total, item) => {
    const price = item.product?.price || 0
    return total + price * item.quantity
  }, 0)
})

const discountAmount = computed(() => {
  if (!appliedCoupon.value || !appliedCoupon.value.discount_percent) return 0
  return (subtotal.value * appliedCoupon.value.discount_percent) / 100
})

const finalTotal = computed(() => {
  return Math.max(0, subtotal.value - discountAmount.value)
})

watch(
  () => customerData.value.region,
  (newRegionName) => {
    const region = regions.value.find((r) => r.region === newRegionName)
    if (region) {
      selectedRegionObject.value = region
      communes.value = region.comunas
      if (
        newRegionName !== userProfileData.value?.shipping_address?.region &&
        !communes.value.includes(customerData.value.commune)
      ) {
        customerData.value.commune = ''
      }
    } else {
      selectedRegionObject.value = null
      communes.value = []
      customerData.value.commune = ''
    }
  },
  { immediate: true },
)

const formatRut = () => {
  let rut = customerData.value.rut.replace(/[^0-9kK]/g, '')
  if (rut.length > 1) {
    const body = rut.slice(0, -1)
    const dv = rut.slice(-1).toUpperCase()
    rut = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
  }
  customerData.value.rut = rut
}

// 🔥 FUNCIÓN MEJORADA PARA MANEJAR MENSAJES DEL POPUP (SIN REFRESH MANUAL)
const handlePaymentMessage = async (event) => {
  if (event.origin !== window.location.origin) {
    console.warn('❌ Mensaje de origen no confiable:', event.origin)
    return
  }
  console.log('📨 Mensaje recibido del popup:', event.data)

  // ✅ Re-verificar sesión YA NO ES NECESARIO, el listener del authStore lo hace solo.

  if (event.data.type === 'PAYMENT_SUCCESS') {
    console.log('✅ Pago completado exitosamente')
    paymentCompleted = true
    isProcessingPayment.value = false
    isSubmitting.value = false

    if (pagoPopup.value && !pagoPopup.value.closed) {
      pagoPopup.value.close()
    }

    const { orderId } = event.data
    cartStore.clearCart()
    toast.success('¡Pago exitoso! Redirigiendo...')

    setTimeout(() => {
      router.push({ name: 'order-confirmation', params: { orderId } })
    }, 1000)
  } else if (event.data.type === 'payment-error') {
    const errorMessage = event.data.message || 'Error desconocido durante el pago.'
    console.error('❌ Error en el pago:', errorMessage)

    isProcessingPayment.value = false
    isSubmitting.value = false

    if (pagoPopup.value && !pagoPopup.value.closed) {
      pagoPopup.value.close()
    }

    // Aquí puedes poner el mensaje que querías
    toast.error('Pago rechazado: ' + errorMessage + '. Intenta nuevamente.')
  }
}

async function loadUserProfile() {
  if (!authStore.isLoggedIn || !authStore.user?.id) return
  loadingProfile.value = true
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authStore.user.id)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    userProfileData.value = profile || {}
    useSavedAddress.value = hasSavedAddress.value
  } catch (err) {
    console.error('Error loading user profile for checkout:', err)
    toast.error('No se pudieron cargar tus datos guardados.')
    userProfileData.value = {}
    useSavedAddress.value = false
  } finally {
    loadingProfile.value = false
  }
}

watch(
  userProfileData,
  (profile) => {
    if (profile && !loadingProfile.value) {
      customerData.value.fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      customerData.value.rut = profile.rut || ''
      customerData.value.email = authStore.user?.email || ''
      customerData.value.phone = profile.phone || ''
      if (useSavedAddress.value && hasSavedAddress.value) {
        const addr = profile.shipping_address
        customerData.value.region = addr.region || ''
        customerData.value.commune = addr.commune || ''
        customerData.value.addressStreet = addr.street || ''
        customerData.value.addressNumber = addr.number || ''
        customerData.value.addressDetail = addr.details || ''
      } else {
        customerData.value.region = ''
        customerData.value.commune = ''
        customerData.value.addressStreet = ''
        customerData.value.addressNumber = ''
        customerData.value.addressDetail = ''
      }
    } else if (!authStore.isLoggedIn) {
      Object.keys(customerData.value).forEach((key) => (customerData.value[key] = ''))
    }
  },
  { immediate: true },
)

watch(useSavedAddress, (useSaved) => {
  if (!userProfileData.value) return
  if (useSaved && hasSavedAddress.value) {
    const addr = userProfileData.value.shipping_address
    customerData.value.region = addr.region || ''
    customerData.value.commune = addr.commune || ''
    customerData.value.addressStreet = addr.street || ''
    customerData.value.addressNumber = addr.number || ''
    customerData.value.addressDetail = addr.details || ''
  } else {
    if (hasSavedAddress.value) {
      customerData.value.region = ''
      customerData.value.commune = ''
      customerData.value.addressStreet = ''
      customerData.value.addressNumber = ''
      customerData.value.addressDetail = ''
    }
  }
})

async function loadCartDetailsForSummary() {
  loadingCartDetails.value = true
  const productIds = cartStore.items.map((item) => item.product_id)
  if (productIds.length > 0) {
    const productsData = await productsStore.fetchProductsByIds(productIds)
    cartProductDetails.value = cartStore.items
      .map((cartItem) => {
        const product = productsData.find((p) => p.id === cartItem.product_id)
        return { ...cartItem, product }
      })
      .filter((item) => item.product)
  } else {
    cartProductDetails.value = []
  }
  loadingCartDetails.value = false
}

async function handleCheckoutSubmit() {
  if (!selectedShippingMethod.value) {
    toast.error('Por favor, selecciona un método de envío.')
    return
  }
  if (!selectedPaymentMethod.value) {
    toast.error('Por favor, selecciona un método de pago.')
    return
  }
  if (!isValidRut(customerData.value.rut)) {
    toast.error('El RUT ingresado no es válido. Por favor, corrígelo.')
    return
  }
  const requiredFields = {
    fullName: 'Nombre Completo',
    email: 'Correo Electrónico',
    phone: 'Teléfono',
    region: 'Región',
    commune: 'Comuna',
    addressStreet: 'Calle',
    addressNumber: 'Número',
  }
  for (const key in requiredFields) {
    if (!customerData.value[key] || customerData.value[key].trim() === '') {
      toast.error(`Por favor, ingresa tu ${requiredFields[key]}.`)
      return
    }
  }

  isSubmitting.value = true
  paymentCompleted = false
  toast.info('Procesando tu pedido...')

  try {
    let finalShippingAddress = {}
    if (authStore.isLoggedIn && useSavedAddress.value && hasSavedAddress.value) {
      finalShippingAddress = userProfileData.value.shipping_address
    } else {
      finalShippingAddress = {
        region: customerData.value.region,
        commune: customerData.value.commune,
        street: customerData.value.addressStreet,
        number: customerData.value.addressNumber,
        details: customerData.value.addressDetail || null,
      }
    }

    if (cartStore.items.length === 0) throw new Error('Tu carrito está vacío.')

    for (const item of cartProductDetails.value) {
      if (item.product.stock !== null && item.quantity > item.product.stock) {
        throw new Error(
          `Stock insuficiente para "${item.product.name}". Solo quedan ${item.product.stock}.`,
        )
      }
    }

    const orderItemsData = cartProductDetails.value.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: item.product.price,
    }))

    const orderData = {
      user_id: authStore.user?.id || null,
      total_amount: finalTotal.value,
      status: 'pending',
      shipping_address: finalShippingAddress,
      customer_email: customerData.value.email,
      customer_name: customerData.value.fullName,
      shipping_method: selectedShippingMethod.value,
      payment_method: selectedPaymentMethod.value,
      applied_coupon_code: appliedCoupon.value ? appliedCoupon.value.code : null,
      discount_amount: discountAmount.value > 0 ? discountAmount.value : null,
    }

    const { data: orderResult, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select('id')
      .single()

    if (orderError) throw orderError
    const newOrderId = orderResult.id

    const orderItemsWithOrderId = orderItemsData.map((item) => ({ ...item, order_id: newOrderId }))
    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsWithOrderId)

    if (itemsError) {
      await supabase.from('orders').delete().eq('id', newOrderId)
      throw itemsError
    }

    if (
      appliedCoupon.value &&
      appliedCoupon.value.coupon_type === 'FIRST_PURCHASE' &&
      authStore.isLoggedIn
    ) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ used_first_purchase_coupon: true })
        .eq('id', authStore.user.id)
      if (profileUpdateError) {
        console.error(
          'ALERTA: No se pudo actualizar el perfil para el cupón de primera compra.',
          profileUpdateError,
        )
        toast.warning('Tu orden fue creada, pero hubo un problema al registrar el uso de tu cupón.')
      }
    }

    if (selectedPaymentMethod.value === 'transferencia') {
      try {
        const { error: emailError } = await supabase.functions.invoke('send-order-confirmation', {
          body: { orderData: { orderId: newOrderId } },
        })
        if (emailError) {
          toast.warning('Tu pedido fue creado, pero no se pudo enviar el email de confirmación.')
        }
      } catch (e) {
        console.error('Error invocando función de email:', e)
      }

      await cartStore.clearCart()
      toast.success('¡Pedido creado con éxito!')
      router.push({ name: 'transfer-pending', params: { orderId: newOrderId } })
    } else if (selectedPaymentMethod.value === 'transbank') {
      try {
        isProcessingPayment.value = true
        toast.info('Abriendo pasarela de pago...')

        const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
          'create-transbank-payment',
          {
            body: { orderId: newOrderId },
          },
        )

        if (paymentError || !paymentData.success) {
          throw new Error(paymentError?.message || 'Error al iniciar el pago con Transbank')
        }

        const transbankUrl = `${paymentData.url}?token_ws=${paymentData.token}`
        const width = 800,
          height = 600
        const left = (window.screen.width - width) / 2
        const top = (window.screen.height - height) / 2

        pagoPopup.value = window.open(
          transbankUrl,
          'TransbankPayment',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
        )

        if (!pagoPopup.value || pagoPopup.value.closed) {
          throw new Error('El popup fue bloqueado. Por favor habilita los popups para este sitio.')
        }

        // ✅ MEJORADO: Verificar sesión cuando el popup se cierra (SIN REFRESH MANUAL)
        const checkPopupClosed = setInterval(async () => {
          if (pagoPopup.value && pagoPopup.value.closed) {
            clearInterval(checkPopupClosed)

            // ✅ Re-verificar sesión YA NO ES NECESARIO.

            if (!paymentCompleted) {
              isProcessingPayment.value = false
              isSubmitting.value = false
              toast.warning('Pago cancelado. Puedes intentar nuevamente desde tus órdenes.')
            }
          }
        }, 1000)
      } catch (transbankError) {
        toast.error(transbankError.message || 'No se pudo iniciar el pago. Intenta nuevamente.')
        isProcessingPayment.value = false
        isSubmitting.value = false
        await supabase.from('orders').delete().eq('id', newOrderId)
      }
    }
  } catch (error) {
    console.error('Error en handleCheckoutSubmit:', error)
    toast.error(error.message || 'Ocurrió un error inesperado al procesar el pedido.')
    isSubmitting.value = false
  }
}

onMounted(() => {
  setTimeout(() => {
    if (cartStore.cartItemCount === 0 && !isSubmitting.value) {
      router.replace({ name: 'store' })
    }
  }, 500)
  loadCartDetailsForSummary()
  if (authStore.isLoggedIn) {
    loadUserProfile()
  }
  window.addEventListener('message', handlePaymentMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handlePaymentMessage)
})
</script>

<template>
  <div class="checkout-view-container">
    <h1>Finalizar Compra</h1>

    <div v-if="isProcessingPayment" class="processing-overlay">
      <div class="processing-content">
        <div class="spinner-large"></div>
        <h2>Procesando tu pago...</h2>
        <p>Por favor completa el pago en la ventana emergente.</p>
        <p><strong>No cierres esta ventana.</strong></p>
      </div>
    </div>

    <div v-if="loadingProfile" class="loading-indicator profile-loader">
      <div class="spinner"></div>
      <p>Cargando tus datos...</p>
    </div>

    <div v-else class="checkout-layout">
      <form @submit.prevent="handleCheckoutSubmit" class="checkout-form">
        <fieldset class="form-section">
          <legend>1. Datos del Comprador</legend>
          <div class="form-grid">
            <div class="form-group">
              <label for="fullName">Nombre Completo</label>
              <input
                type="text"
                id="fullName"
                v-model.trim="customerData.fullName"
                required
                autocomplete="name"
              />
            </div>
            <div class="form-group">
              <label for="rut">RUT</label>
              <input
                v-if="authStore.isLoggedIn && userProfileData?.rut"
                type="text"
                id="rut-display"
                :value="customerData.rut"
                disabled
                class="disabled-input"
              />
              <input
                v-else
                type="text"
                id="rut"
                v-model="customerData.rut"
                @input="formatRut"
                required
                placeholder="Ej: 12.345.678-9"
                pattern="\d{1,2}\.\d{3}\.\d{3}-[\dkK]"
                title="Formato: XX.XXX.XXX-X"
              />
            </div>
            <div class="form-group">
              <label for="email">Correo Electrónico</label>
              <input
                type="email"
                id="email"
                v-model.trim="customerData.email"
                required
                autocomplete="email"
                placeholder="tu.correo@ejemplo.com"
                :disabled="authStore.isLoggedIn"
              />
            </div>
            <div class="form-group">
              <label for="phone">Teléfono</label>
              <input
                type="tel"
                id="phone"
                v-model.trim="customerData.phone"
                required
                autocomplete="tel"
                placeholder="+56 9 1234 5678"
              />
            </div>
          </div>
        </fieldset>

        <fieldset
          v-if="authStore.isLoggedIn && hasSavedAddress"
          class="form-section address-selection"
        >
          <legend>2. Dirección de Envío</legend>
          <p>¿Dónde quieres recibir tu pedido?</p>
          <div class="address-options">
            <label class="address-option" :class="{ selected: useSavedAddress }">
              <input type="radio" name="addressChoice" :value="true" v-model="useSavedAddress" />
              <div class="option-content">
                <span class="option-title">Usar mi dirección guardada:</span>
                <div v-if="userProfileData?.shipping_address" class="saved-address-preview">
                  <p>
                    {{ userProfileData.shipping_address.street || '' }}
                    {{ userProfileData.shipping_address.number || '' }}
                    {{
                      userProfileData.shipping_address.details
                        ? `, ${userProfileData.shipping_address.details}`
                        : ''
                    }}
                  </p>
                  <p>
                    {{ userProfileData.shipping_address.commune || '' }},
                    {{ userProfileData.shipping_address.region || '' }}
                  </p>
                </div>
              </div>
            </label>
            <label class="address-option" :class="{ selected: !useSavedAddress }">
              <input type="radio" name="addressChoice" :value="false" v-model="useSavedAddress" />
              <div class="option-content">
                <span class="option-title">Enviar a una dirección diferente</span>
                <small>Ingresa los datos a continuación.</small>
              </div>
            </label>
          </div>
        </fieldset>

        <fieldset class="form-section">
          <legend>
            {{
              authStore.isLoggedIn && hasSavedAddress ? '2.1 Detalle de Envío' : '2. Datos de Envío'
            }}
          </legend>
          <div
            v-if="!useSavedAddress || !authStore.isLoggedIn || !hasSavedAddress"
            class="form-grid"
          >
            <div class="form-group">
              <label for="region">Región</label>
              <select
                id="region"
                v-model="customerData.region"
                required
                :disabled="useSavedAddress && authStore.isLoggedIn"
              >
                <option disabled value="">Selecciona una región</option>
                <option
                  v-for="regionData in regions"
                  :key="regionData.region"
                  :value="regionData.region"
                >
                  {{ regionData.region }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="commune">Comuna</label>
              <select
                id="commune"
                v-model="customerData.commune"
                required
                :disabled="!customerData.region || (useSavedAddress && authStore.isLoggedIn)"
              >
                <option disabled value="">Selecciona una comuna</option>
                <option v-for="communeName in communes" :key="communeName" :value="communeName">
                  {{ communeName }}
                </option>
              </select>
            </div>
            <div class="form-group span-2">
              <label for="addressStreet">Calle</label>
              <input
                type="text"
                id="addressStreet"
                v-model.trim="customerData.addressStreet"
                required
                autocomplete="address-line1"
                placeholder="Ej: Av. Principal"
                :disabled="useSavedAddress && authStore.isLoggedIn"
              />
            </div>
            <div class="form-group">
              <label for="addressNumber">Número</label>
              <input
                type="text"
                id="addressNumber"
                v-model.trim="customerData.addressNumber"
                required
                autocomplete="address-line2"
                placeholder="Ej: 123"
                :disabled="useSavedAddress && authStore.isLoggedIn"
              />
            </div>
            <div class="form-group">
              <label for="addressDetail">Depto / Casa / Oficina (Opcional)</label>
              <input
                type="text"
                id="addressDetail"
                v-model.trim="customerData.addressDetail"
                autocomplete="address-line3"
                placeholder="Ej: Depto 4B"
                :disabled="useSavedAddress && authStore.isLoggedIn"
              />
            </div>
          </div>
          <div v-else class="address-using-saved">
            <p>
              Se utilizará tu dirección guardada. Puedes editarla en
              <router-link :to="{ name: 'profile' }">tu perfil</router-link>.
            </p>
          </div>
        </fieldset>

        <fieldset class="form-section">
          <legend>
            {{
              authStore.isLoggedIn && hasSavedAddress ? '3. Método de Envío' : '3. Método de Envío'
            }}
          </legend>
          <p>Elige cómo quieres recibir tu pedido:</p>
          <div class="shipping-options">
            <label
              class="shipping-option"
              :class="{ selected: selectedShippingMethod === 'starken' }"
            >
              <input
                type="radio"
                name="shippingMethod"
                value="starken"
                v-model="selectedShippingMethod"
              />
              <font-awesome-icon :icon="faTruck" class="shipping-icon" />
              <span class="shipping-name">Envío por Starken (Por Pagar)</span>
              <small
                >Enviamos a tu domicilio o sucursal más cercana. Pagas el envío al recibir.</small
              >
            </label>
            <label
              class="shipping-option"
              :class="{ selected: selectedShippingMethod === 'presencial' }"
            >
              <input
                type="radio"
                name="shippingMethod"
                value="presencial"
                v-model="selectedShippingMethod"
              />
              <font-awesome-icon :icon="faHandshake" class="shipping-icon" />
              <span class="shipping-name">Entrega Presencial (Gratis)</span>
              <small>Coordinaremos la entrega en Metro Einstein o Metro La Cisterna.</small>
            </label>
          </div>
        </fieldset>

        <fieldset class="form-section">
          <legend>
            {{
              authStore.isLoggedIn && hasSavedAddress ? '4. Método de Pago' : '4. Método de Pago'
            }}
          </legend>
          <p>Selecciona cómo prefieres pagar:</p>
          <div class="payment-options">
            <label
              class="payment-option"
              :class="{ selected: selectedPaymentMethod === 'transbank' }"
            >
              <input
                type="radio"
                name="paymentMethod"
                value="transbank"
                v-model="selectedPaymentMethod"
              />
              <img src="/TransbankWebpay.png" alt="Transbank Webpay" class="payment-logo" />
              <span class="payment-name">Webpay Plus</span>
              <small>Paga con tarjetas de débito o crédito a través de Transbank.</small>
            </label>
            <label
              class="payment-option"
              :class="{ selected: selectedPaymentMethod === 'transferencia' }"
            >
              <input
                type="radio"
                name="paymentMethod"
                value="transferencia"
                v-model="selectedPaymentMethod"
              />
              <font-awesome-icon :icon="faUniversity" class="payment-icon" />
              <span class="payment-name">Transferencia Bancaria</span>
              <small
                >Realiza una transferencia directa. Te mostraremos los datos después de
                confirmar.</small
              >
            </label>
          </div>
        </fieldset>

        <button
          type="submit"
          class="btn btn-primary btn-confirm-order"
          :disabled="isSubmitting || isProcessingPayment"
        >
          {{ isSubmitting ? 'Procesando...' : 'Confirmar Datos y Pagar' }}
        </button>
      </form>

      <aside class="order-summary-checkout">
        <h4>Resumen de tu Compra</h4>
        <div v-if="loadingCartDetails" class="loading-indicator">
          <div class="spinner"></div>
        </div>
        <div v-else>
          <div class="summary-items">
            <div v-for="item in cartProductDetails" :key="item.product_id" class="summary-item">
              <img
                :src="item.product.image_urls?.[0] || '/Zolve_Logo.png'"
                class="item-thumb"
                alt=""
              />
              <span class="item-name-summary">{{ item.quantity }} x {{ item.product.name }}</span>
              <span class="item-price-summary">{{
                new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                  item.product.price * item.quantity,
                )
              }}</span>
            </div>
          </div>
          <div class="summary-totals">
            <p>
              <span>Subtotal</span
              ><span>{{
                new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                  subtotal,
                )
              }}</span>
            </p>
            <p v-if="discountAmount > 0" class="discount-row">
              <span>Descuento ({{ appliedCoupon.code }})</span>
              <span
                >-
                {{
                  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                    discountAmount,
                  )
                }}</span
              >
            </p>
            <div class="final-total">
              <p>
                <span>Total a Pagar</span
                ><span>{{
                  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                    finalTotal,
                  )
                }}</span>
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* Estilos completos */
.processing-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
}
.processing-content {
  background: white;
  padding: 40px;
  border-radius: 12px;
  text-align: center;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}
.processing-content h2 {
  margin: 20px 0 10px;
  color: var(--color-heading);
}
.processing-content p {
  margin: 10px 0;
  color: var(--color-text-soft);
  line-height: 1.5;
}
.processing-content p strong {
  color: var(--brand-pink);
}
.spinner-large {
  border: 6px solid rgba(0, 0, 0, 0.1);
  border-top: 6px solid var(--brand-turquoise);
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}
.checkout-view-container {
  max-width: 1000px;
  margin: 20px auto;
  padding: 0 15px 40px 15px;
}
h1 {
  text-align: center;
  margin-bottom: 30px;
  font-size: 2rem;
}
.loading-indicator.profile-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 20px;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  margin-bottom: 20px;
}
.loading-indicator.profile-loader p {
  margin-top: 15px;
  font-style: italic;
  color: var(--color-text-soft);
}
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid var(--brand-turquoise);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.checkout-form {
  background-color: var(--color-background-soft);
  padding: 30px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}
.form-section {
  border: none;
  padding: 0;
  margin: 0 0 30px 0;
}
.form-section legend {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--color-heading);
  width: 100%;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 10px;
}
.form-section > p {
  font-size: 0.9rem;
  color: var(--color-text-soft);
  margin-top: -10px;
  margin-bottom: 20px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group.span-2 {
  grid-column: 1 / -1;
}
.form-group label {
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--color-text-soft);
}
.form-group input[type='text'],
.form-group input[type='email'],
.form-group input[type='tel'],
.form-group select {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  font-size: 1rem;
  font-family: var(--font-family-base);
  background-color: var(--color-background);
  color: var(--color-text);
  box-sizing: border-box;
}
.form-group input::placeholder {
  color: var(--color-text-mute);
  opacity: 0.7;
}
.form-group select:disabled,
.form-group input:disabled {
  background-color: var(--color-background-mute);
  cursor: not-allowed;
  opacity: 0.6;
}
.address-options {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  margin-bottom: 20px;
}
.address-option {
  display: flex;
  align-items: flex-start;
  padding: 15px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: var(--color-background);
}
.address-option:hover {
  border-color: var(--brand-turquoise);
}
.address-option.selected {
  border-color: var(--brand-pink);
  background-color: #fdeaf0;
}
.address-option input[type='radio'] {
  margin-top: 3px;
  margin-right: 10px;
  flex-shrink: 0;
}
.option-content {
  display: flex;
  flex-direction: column;
}
.option-title {
  font-weight: 600;
  margin-bottom: 5px;
  color: var(--color-heading);
}
.option-content small {
  font-size: 0.85rem;
  color: var(--color-text-soft);
}
.saved-address-preview {
  font-size: 0.9rem;
  color: var(--color-text);
  line-height: 1.4;
}
.saved-address-preview p {
  margin: 2px 0;
}
.address-using-saved {
  padding: 15px;
  background-color: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 5px;
  font-size: 0.9rem;
  color: var(--color-text-soft);
  text-align: center;
}
.address-using-saved a {
  color: var(--brand-turquoise);
  font-weight: 500;
  text-decoration: underline;
}
.address-using-saved a:hover {
  color: var(--brand-pink);
}
.payment-options {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  margin-top: 10px;
}
.payment-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: var(--color-background);
  text-align: center;
}
.payment-option:hover {
  border-color: var(--brand-turquoise);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}
.payment-option.selected {
  border-color: var(--brand-pink);
  background-color: #fdeaf0;
  box-shadow: 0 4px 12px rgba(230, 92, 122, 0.1);
}
.payment-option input[type='radio'] {
  display: none;
}
.payment-logo {
  height: 35px;
  margin-bottom: 10px;
  max-width: 150px;
}
.payment-icon {
  font-size: 2rem;
  color: var(--brand-turquoise);
  margin-bottom: 10px;
}
.payment-name {
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 5px;
  font-size: 1.1rem;
}
.payment-option small {
  font-size: 0.85rem;
  color: var(--color-text-soft);
  line-height: 1.4;
}
.btn-confirm-order {
  width: 100%;
  padding: 15px;
  font-size: 1.1rem;
  margin-top: 10px;
}
.btn {
  display: inline-block;
  text-align: center;
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
.btn-primary:hover:not(:disabled) {
  background-color: #e65c7a;
  transform: translateY(-2px);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.checkout-layout {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 30px;
  align-items: flex-start;
}
.order-summary-checkout {
  position: sticky;
  top: 20px;
  background-color: var(--color-background-soft);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}
.order-summary-checkout h4 {
  margin-top: 0;
  text-align: center;
  border-bottom: 1px solid var(--color-border-hover);
  padding-bottom: 10px;
  margin-bottom: 15px;
}
.summary-items {
  max-height: 200px;
  overflow-y: auto;
  padding-right: 10px;
  margin-bottom: 15px;
}
.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  margin-bottom: 10px;
  gap: 10px;
}
.item-thumb {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  margin-right: 10px;
  flex-shrink: 0;
}
.item-name-summary {
  flex-grow: 1;
  text-align: left;
}
.item-price-summary {
  flex-shrink: 0;
}
.summary-totals p {
  display: flex;
  justify-content: space-between;
  margin: 8px 0;
}
.summary-totals .discount-row {
  color: green;
}
.final-total {
  border-top: 1px solid var(--color-border-hover);
  padding-top: 10px;
  margin-top: 10px;
}
.final-total p {
  font-weight: bold;
  font-size: 1.2em;
}
.shipping-options {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  margin-top: 10px;
}
.shipping-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: var(--color-background);
  text-align: center;
}
.shipping-option:hover {
  border-color: var(--brand-turquoise);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}
.shipping-option.selected {
  border-color: var(--brand-pink);
  background-color: #fdeaf0;
  box-shadow: 0 4px 12px rgba(230, 92, 122, 0.1);
}
.shipping-option input[type='radio'] {
  display: none;
}
.shipping-icon {
  font-size: 2rem;
  color: var(--brand-turquoise);
  margin-bottom: 10px;
}
.shipping-name {
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 5px;
  font-size: 1.1rem;
}
.shipping-option small {
  font-size: 0.85rem;
  color: var(--color-text-soft);
  line-height: 1.4;
}
@media (min-width: 601px) {
  .address-options,
  .payment-options,
  .shipping-options {
    grid-template-columns: 1fr 1fr;
  }
  .payment-option,
  .shipping-option {
    align-items: flex-start;
    text-align: left;
  }
  .payment-logo,
  .payment-icon,
  .shipping-icon {
    align-self: center;
  }
}
@media (max-width: 900px) {
  .checkout-layout {
    grid-template-columns: 1fr;
  }
  .order-summary-checkout {
    position: static;
    grid-row-start: 1;
    margin-bottom: 30px;
  }
}
@media (max-width: 600px) {
  .checkout-form {
    padding: 20px;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .form-group.span-2 {
    grid-column: auto;
  }
  h1 {
    font-size: 1.8rem;
  }
  .form-section legend {
    font-size: 1.1rem;
  }
}
</style>
