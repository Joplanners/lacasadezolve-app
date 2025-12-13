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
import { v4 as uuidv4 } from 'uuid'

const router = useRouter()
const cartStore = useCartStore()
const productsStore = useProductsStore()
const authStore = useAuthStore()
const toast = useToast()

// --- Función para formatear precios ---
const formatPrice = (value) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '$ 0'
  }
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
  }).format(value)
}

// --- LÓGICA DE PRECIOS ---
/**
 * Calcula el precio final de un producto considerando ofertas, porcentajes y fechas
 * @param {object} product - El objeto de producto de Supabase
 * @returns {object} - { finalPrice, originalPrice, onOffer }
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

/**
 * Propiedad computada que procesa el carrito y añade los precios calculados
 */
const processedCartItems = computed(() => {
  return cartProductDetails.value.map((item) => {
    const priceInfo = getPriceInfo(item.product)
    return {
      ...item,
      ...priceInfo,
    }
  })
})

// Obtenemos 'items' y 'appliedCoupons' reactivamente del store
const { appliedCoupons, items: cartItems } = storeToRefs(cartStore)

// --- Estado ---
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
const paymentHasFailed = ref(false)

// --- Computadas ---
const hasSavedAddress = computed(() => {
  return (
    !!userProfileData.value?.shipping_address &&
    typeof userProfileData.value.shipping_address === 'object' &&
    Object.values(userProfileData.value.shipping_address).some((v) => v)
  )
})

const subtotal = computed(() => {
  return processedCartItems.value.reduce((total, item) => {
    return total + item.finalPrice * item.quantity
  }, 0)
})

// 🔥 MODIFICADO: Método aditivo (suma directa de porcentajes)
const discountAmount = computed(() => {
  if (!appliedCoupons.value || appliedCoupons.value.length === 0) {
    return 0
  }

  // Suma todos los porcentajes directamente
  const totalPercent = appliedCoupons.value.reduce((sum, coupon) => {
    return sum + (coupon.discount_percent || 0)
  }, 0)

  // Aplica el porcentaje total sobre el subtotal original
  return (subtotal.value * totalPercent) / 100
})

const finalTotal = computed(() => {
  return Math.max(0, subtotal.value - discountAmount.value)
})

// --- Watchers ---
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
        if (!authStore.isLoggedIn) {
          Object.keys(customerData.value).forEach((key) => {
            if (key !== 'email') customerData.value[key] = ''
          })
        }
      }
    } else if (!authStore.isLoggedIn) {
      Object.keys(customerData.value).forEach((key) => (customerData.value[key] = ''))
    }
  },
  { immediate: true },
)

// --- Funciones ---
const formatRut = () => {
  let rut = customerData.value.rut.replace(/[^0-9kK]/g, '')
  if (rut.length > 1) {
    const body = rut.slice(0, -1)
    const dv = rut.slice(-1).toUpperCase()
    rut = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
  }
  customerData.value.rut = rut
}

const handlePaymentMessage = async (event) => {
  if (event.origin !== window.location.origin) {
    return
  }
  if (event.data.type === 'PAYMENT_SUCCESS') {
    paymentCompleted = true
    isProcessingPayment.value = false
    isSubmitting.value = false
    if (pagoPopup.value && !pagoPopup.value.closed) pagoPopup.value.close()
    const { orderId } = event.data
    cartStore.clearCart()
    toast.success('¡Pago exitoso! Redirigiendo...')
    setTimeout(() => router.push({ name: 'order-confirmation', params: { orderId } }), 1000)
  } else if (event.data.type === 'payment-error') {
    const errorMessage = event.data.message || 'Error desconocido.'
    console.error('❌ Error en el pago:', errorMessage)
    isProcessingPayment.value = false
    isSubmitting.value = false
    paymentHasFailed.value = true
    if (pagoPopup.value && !pagoPopup.value.closed) pagoPopup.value.close()
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

async function loadCartDetailsForSummary() {
  loadingCartDetails.value = true
  const productIds = cartItems.value.map((item) => item.product_id)
  if (productIds.length > 0) {
    const productsData = await productsStore.fetchProductsByIds(productIds)
    cartProductDetails.value = cartItems.value
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
  paymentHasFailed.value = false

  // Validaciones
  if (!selectedShippingMethod.value) {
    toast.error('Selecciona método de envío.')
    return
  }
  if (!selectedPaymentMethod.value) {
    toast.error('Selecciona método de pago.')
    return
  }
  if (!isValidRut(customerData.value.rut)) {
    toast.error('RUT inválido.')
    return
  }

  const requiredFields = {
    fullName: 'Nombre',
    email: 'Correo',
    phone: 'Teléfono',
    region: 'Región',
    commune: 'Comuna',
    addressStreet: 'Calle',
    addressNumber: 'Número',
  }

  for (const key in requiredFields) {
    if (!customerData.value[key]?.trim()) {
      toast.error(`Ingresa tu ${requiredFields[key]}.`)
      return
    }
  }

  isSubmitting.value = true
  paymentCompleted = false
  toast.info('Procesando tu pedido...')
  let newOrderId = null
  let uploadedFileUrls = []

  try {
    // 1. Preparar Dirección
    let finalShippingAddress =
      !authStore.isLoggedIn || !useSavedAddress.value || !hasSavedAddress.value
        ? {
            region: customerData.value.region,
            commune: customerData.value.commune,
            street: customerData.value.addressStreet,
            number: customerData.value.addressNumber,
            details: customerData.value.addressDetail || null,
          }
        : userProfileData.value.shipping_address

    // 2. Validar Carrito y Stock
    if (cartItems.value.length === 0) throw new Error('Tu carrito está vacío.')
    await loadCartDetailsForSummary()

    for (const item of processedCartItems.value) {
      if (!item.product) throw new Error(`Detalles no encontrados para un producto en tu carrito.`)
      if (item.product.stock !== null && item.quantity > item.product.stock) {
        throw new Error(
          `Stock insuficiente para "${item.product.name}". Solo quedan ${item.product.stock}.`,
        )
      }
    }

    // 3. Subir Archivos
    const itemsWithFiles = cartItems.value.filter(
      (item) => item.customizationFiles && item.customizationFiles.length > 0,
    )

    if (itemsWithFiles.length > 0) {
      if (!authStore.isLoggedIn) {
        throw new Error('Debes iniciar sesión para pedir productos con archivos personalizados.')
      }

      toast.info('Subiendo archivos de personalización...')
      const allFilesToUpload = itemsWithFiles.flatMap((item) =>
        item.customizationFiles.map((file) => ({ file, itemId: item.id })),
      )
      const uploadSessionId = uuidv4()
      const fileMap = new Map()

      const uploadPromises = allFilesToUpload.map(async ({ file, itemId }, index) => {
        const fileExtension = file.name.split('.').pop()
        const uniqueFileName = `${uploadSessionId}-${index + 1}.${fileExtension}`
        const filePath = `${uploadSessionId}/${uniqueFileName}`

        console.log(`⏳ Subiendo: ${file.name} como ${filePath}`)

        const { error: uploadError } = await supabase.storage
          .from('customer-customizations')
          .upload(filePath, file, { cacheControl: '3600', upsert: false })

        if (uploadError) {
          console.error(`❌ Error al subir ${file.name}:`, uploadError)
          throw new Error(`No se pudo subir el archivo ${file.name}. Intenta de nuevo.`)
        }

        const { data: urlData } = supabase.storage
          .from('customer-customizations')
          .getPublicUrl(filePath)

        if (!fileMap.has(itemId)) fileMap.set(itemId, [])
        fileMap.get(itemId).push(urlData.publicUrl)

        console.log(`✅ Subido: ${file.name} -> ${urlData.publicUrl}`)
        return urlData.publicUrl
      })

      await Promise.all(uploadPromises)
      uploadedFileUrls = Array.from(fileMap.values()).flat()
      toast.success('Archivos de personalización subidos.')
    }

    // 4. Preparar Datos de la Orden
    const orderItemsData = processedCartItems.value.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: item.finalPrice,
    }))

    const allNotes = cartItems.value
      .map((item) => item.customizationNotes)
      .filter(Boolean)
      .join('\n---\n')
    const notesFromCart = allNotes

    const orderData = {
      user_id: authStore.user?.id || null,
      total_amount: finalTotal.value,
      status: 'pending',
      shipping_address: finalShippingAddress,
      customer_email: customerData.value.email,
      customer_name: customerData.value.fullName,
      customer_phone: customerData.value.phone || null,
      shipping_method: selectedShippingMethod.value,
      payment_method: selectedPaymentMethod.value,
      applied_coupon_code: appliedCoupons.value.map((c) => c.code).join(', ') || null,
      discount_amount: discountAmount.value > 0 ? discountAmount.value : null,
      customization_files: uploadedFileUrls.length > 0 ? uploadedFileUrls : null,
      customization_notes: notesFromCart.trim() || null,
    }

    // 5. Insertar Orden y Items
    const { data: orderResult, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select('id')
      .single()

    if (orderError) throw orderError
    newOrderId = orderResult.id

    const orderItemsWithOrderId = orderItemsData.map((item) => ({ ...item, order_id: newOrderId }))
    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsWithOrderId)

    if (itemsError) {
      throw itemsError
    }

    // 6. Actualizar Perfil por Cupón
    const firstPurchaseCoupon = appliedCoupons.value.find((c) => c.coupon_type === 'FIRST_PURCHASE')
    if (firstPurchaseCoupon && authStore.isLoggedIn) {
      // Lógica adicional si es necesario
    }

    // 7. Procesar Pago o Redirigir
    if (selectedPaymentMethod.value === 'transferencia') {
      try {
        await supabase.functions.invoke('send-order-confirmation', {
          body: { orderData: { orderId: newOrderId } },
        })
      } catch (e) {
        console.error('Error al invocar la función de Supabase:', e)
      }
      await cartStore.clearCart()
      toast.success('¡Pedido creado!')
      router.push({ name: 'transfer-pending', params: { orderId: newOrderId } })
    } else if (selectedPaymentMethod.value === 'transbank') {
      try {
        isProcessingPayment.value = true
        toast.info('Abriendo pasarela de pago...')

        const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
          'create-transbank-payment',
          { body: { orderId: newOrderId } },
        )

        if (paymentError || !paymentData.success) {
          throw new Error(paymentError?.message || 'Error al iniciar pago Transbank')
        }

        const transbankUrl = `${paymentData.url}?token_ws=${paymentData.token}`
        const width = 800,
          height = 600,
          left = (screen.width - width) / 2,
          top = (screen.height - height) / 2

        pagoPopup.value = window.open(
          transbankUrl,
          'TransbankPayment',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
        )

        if (!pagoPopup.value || pagoPopup.value.closed) {
          throw new Error('Popup bloqueado.')
        }

        const checkPopupClosed = setInterval(async () => {
          if (pagoPopup.value && pagoPopup.value.closed) {
            clearInterval(checkPopupClosed)
            if (paymentCompleted) {
              console.log('Intervalo: Popup cerrado, pero el pago ya fue confirmado.')
              return
            }
            console.warn('Intervalo: Popup cerrado. Verificando estado de la orden en la DB...')
            try {
              const { data: order, error: checkError } = await supabase
                .from('orders')
                .select('status')
                .eq('id', newOrderId)
                .single()

              if (checkError) throw checkError

              if (order.status === 'paid' || order.status === 'processing') {
                console.log('Intervalo: ¡Pago confirmado desde la DB! Redirigiendo...')
                paymentCompleted = true
                isProcessingPayment.value = false
                isSubmitting.value = false
                cartStore.clearCart()
                toast.success('¡Pago exitoso! Redirigiendo...')
                router.push({ name: 'order-confirmation', params: { orderId: newOrderId } })
              } else {
                console.log('Intervalo: El pago fue cancelado o falló.')
                isProcessingPayment.value = false
                isSubmitting.value = false
                paymentHasFailed.value = true
                toast.error('El pago fue cancelado o falló. Intenta nuevamente.')
              }
            } catch (dbError) {
              console.error('Intervalo: Error al verificar estado de la orden:', dbError)
              isProcessingPayment.value = false
              isSubmitting.value = false
              paymentHasFailed.value = true
              toast.error('Error al verificar el estado del pago.')
            }
          }
        }, 1000)
      } catch (transbankError) {
        toast.error(transbankError.message || 'No se pudo iniciar el pago.')
        isProcessingPayment.value = false
        isSubmitting.value = false
        paymentHasFailed.value = true
        if (newOrderId) {
          await supabase.from('orders').delete().eq('id', newOrderId)
          if (uploadedFileUrls.length > 0) {
            const filePaths = uploadedFileUrls.map((url) =>
              url.substring(
                url.indexOf('customer-customizations/') + 'customer-customizations/'.length,
              ),
            )
            await supabase.storage.from('customer-customizations').remove(filePaths)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error en handleCheckoutSubmit:', error)
    toast.error(error.message || 'Error inesperado al procesar el pedido.')
    isProcessingPayment.value = false
    isSubmitting.value = false
    paymentHasFailed.value = true
  }
}

// --- Lifecycle Hooks ---
onMounted(() => {
  setTimeout(() => {
    if (cartItems.value.length === 0 && !isSubmitting.value) router.replace({ name: 'store' })
  }, 500)
  loadCartDetailsForSummary()
  if (authStore.isLoggedIn) loadUserProfile()
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
                    {{ userProfileData.shipping_address.street }}
                    {{ userProfileData.shipping_address.number }}
                    {{
                      userProfileData.shipping_address.details
                        ? `, ${userProfileData.shipping_address.details}`
                        : ''
                    }}
                  </p>
                  <p>
                    {{ userProfileData.shipping_address.commune }},
                    {{ userProfileData.shipping_address.region }}
                  </p>
                </div>
              </div>
            </label>
            <label class="address-option" :class="{ selected: !useSavedAddress }">
              <input type="radio" name="addressChoice" :value="false" v-model="useSavedAddress" />
              <div class="option-content">
                <span class="option-title">Enviar a dirección diferente</span>
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
                <option disabled value="">Selecciona región</option>
                <option v-for="r in regions" :key="r.region" :value="r.region">
                  {{ r.region }}
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
                <option disabled value="">Selecciona comuna</option>
                <option v-for="c in communes" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="form-group span-2">
              <label for="addressStreet">Calle</label>
              <input
                type="text"
                id="addressStreet"
                v-model.trim="customerData.addressStreet"
                required
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
                :disabled="useSavedAddress && authStore.isLoggedIn"
              />
            </div>
            <div class="form-group">
              <label for="addressDetail">Depto/Casa (Opcional)</label>
              <input
                type="text"
                id="addressDetail"
                v-model.trim="customerData.addressDetail"
                :disabled="useSavedAddress && authStore.isLoggedIn"
              />
            </div>
          </div>
          <div v-else class="address-using-saved">
            <p>
              Se usará tu dirección guardada. Edítala en
              <router-link :to="{ name: 'profile' }">tu perfil</router-link>.
            </p>
          </div>
        </fieldset>

        <fieldset class="form-section">
          <legend>3. Método de Envío</legend>
          <p>Elige cómo recibir tu pedido:</p>
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
              <span>Envío por Starken (Por Pagar)</span>
              <small>Pagas el envío al recibir.</small>
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
              <span>Entrega Presencial (Gratis)</span>
              <small>Metro Einstein o La Cisterna.</small>
            </label>
          </div>
        </fieldset>

        <fieldset class="form-section">
          <legend>4. Método de Pago</legend>
          <p>Selecciona cómo pagar:</p>
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
              <img src="/TransbankWebpay.png" alt="Webpay" class="payment-logo" />
              <span>Webpay Plus</span>
              <small>Débito o crédito.</small>
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
              <span>Transferencia Bancaria</span>
              <small>Te daremos los datos al confirmar.</small>
            </label>
          </div>
        </fieldset>

        <button
          v-if="!paymentHasFailed"
          type="submit"
          class="btn btn-primary btn-confirm-order"
          :disabled="isSubmitting || isProcessingPayment"
        >
          {{ isSubmitting ? 'Procesando...' : 'Confirmar y Pagar' }}
        </button>
        <div v-else class="payment-failed-options">
          <p class="failed-text">Pago no procesado. ¿Qué deseas hacer?</p>
          <button @click="handleCheckoutSubmit" type="button" class="btn btn-primary">
            Intentar de nuevo
          </button>
          <router-link :to="{ name: 'store' }" class="btn btn-secondary">
            Volver a la tienda
          </router-link>
        </div>
      </form>

      <aside class="order-summary-checkout">
        <h4>Resumen de tu Compra</h4>
        <div v-if="loadingCartDetails" class="loading-indicator">
          <div class="spinner"></div>
        </div>
        <div v-else>
          <div class="summary-items">
            <div v-for="item in processedCartItems" :key="item.product_id" class="summary-item">
              <img
                :src="item.product.image_urls?.[0] || '/Zolve_Logo.png'"
                class="item-thumb"
                alt=""
              />
              <span class="item-name-summary">{{ item.quantity }} x {{ item.product.name }}</span>
              <span class="item-price-summary">
                {{ formatPrice(item.finalPrice * item.quantity) }}
              </span>
            </div>
          </div>
          <div class="summary-totals">
            <p>
              <span>Subtotal</span>
              <span>{{ formatPrice(subtotal) }}</span>
            </p>

            <!-- 🔥 MODIFICADO: Muestra cupones de forma clara y aditiva -->
            <template v-if="appliedCoupons && appliedCoupons.length > 0">
              <div class="coupons-breakdown">
                <p v-for="coupon in appliedCoupons" :key="coupon.code" class="discount-row-item">
                  <span>{{ coupon.code }}</span>
                  <span>{{ coupon.discount_percent }}%</span>
                </p>
              </div>
              <p class="discount-row total-discount">
                <span>
                  Descuento Total ({{ appliedCoupons.map((c) => c.discount_percent).join(' + ') }}%)
                </span>
                <span>- {{ formatPrice(discountAmount) }}</span>
              </p>
            </template>

            <div class="final-total">
              <p>
                <span>Total a Pagar</span>
                <span>{{ formatPrice(finalTotal) }}</span>
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* Estilos completos (SIN el textarea de notas) */
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
  background: #fff;
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
  padding: 0 15px 40px;
}
.checkout-view-container h1 {
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
  margin: 0 0 30px;
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
.form-group select,
.form-group textarea {
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
.form-group input::placeholder,
.form-group textarea::placeholder {
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
  color: #fff;
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

/* 🔥 NUEVOS ESTILOS PARA CUPONES MÚLTIPLES */
.coupons-breakdown {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
  border: 1px solid var(--color-border);
}

.discount-row-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #666;
  margin: 5px 0;
  padding: 3px 0;
}

.discount-row-item span:first-child {
  font-weight: 500;
  color: var(--color-heading);
}

.discount-row-item span:last-child {
  color: var(--brand-turquoise);
  font-weight: 600;
}

.summary-totals .discount-row {
  color: #2e7d32;
  font-weight: 500;
}

.summary-totals .total-discount {
  font-weight: 600;
  color: #2e7d32;
  border-top: 1px solid var(--color-border);
  padding-top: 8px;
  margin-top: 8px;
  font-size: 0.95rem;
}

.summary-totals .total-discount span:last-child {
  color: #2e7d32;
  font-weight: 700;
}
/* 🔥 FIN NUEVOS ESTILOS */

.final-total {
  border-top: 1px solid var(--color-border-hover);
  padding-top: 10px;
  margin-top: 10px;
}
.final-total p {
  font-weight: 700;
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
.payment-failed-options {
  margin-top: 20px;
  border-top: 1px solid var(--color-border);
  padding-top: 20px;
  text-align: center;
}
.payment-failed-options .failed-text {
  margin-bottom: 20px;
  font-weight: 500;
  color: var(--color-text-soft);
}
.payment-failed-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.btn.btn-primary,
.btn.btn-secondary {
  padding: 15px;
  font-size: 1.1rem;
  text-align: center;
  text-decoration: none;
  border-radius: 5px;
  cursor: pointer;
}
.btn.btn-primary {
  background-color: var(--brand-pink);
  color: #fff;
  border: none;
}
.btn.btn-primary:hover {
  background-color: #e65c7a;
}
.btn.btn-secondary {
  background-color: var(--color-background);
  color: var(--brand-pink);
  border: 2px solid var(--brand-pink);
}
.btn.btn-secondary:hover {
  background-color: #fdeaf0;
}
/* Estilos Notas Adicionales (reutilizados de antes) */
.form-section .instructions {
  font-size: 0.85em;
  color: var(--color-text-soft);
  margin-top: -15px;
  margin-bottom: 10px;
  line-height: 1.4;
  background-color: var(--color-background-mute);
  padding: 8px 12px;
  border-radius: 4px;
}
.form-group textarea {
  min-height: 80px;
  resize: vertical;
}
.char-counter {
  text-align: right;
  font-size: 0.8em;
  color: var(--color-text-mute);
  margin-top: 4px;
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
  .checkout-view-container h1 {
    font-size: 1.8rem;
  }
  .form-section legend {
    font-size: 1.1rem;
  }
}
</style>
