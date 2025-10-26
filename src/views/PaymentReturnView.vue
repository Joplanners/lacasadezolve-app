<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref(null)
const success = ref(false)
const orderId = ref(null)

// 🔥 Función para enviar mensaje al padre y cerrar
const notifyAndClose = (type, data = {}) => {
  if (window.opener) {
    console.log(`📨 Enviando mensaje al padre: ${type}`, data)
    window.opener.postMessage({ type, ...data }, window.location.origin)

    // Damos un pequeño delay para que el mensaje se envíe antes de cerrar
    setTimeout(() => {
      window.close()
    }, 500) // 0.5 segundos
  } else {
    // Si no es un popup, redirigimos (Plan B de emergencia)
    console.warn('❌ window.opener no detectado. Redirigiendo...')
    if (type === 'PAYMENT_SUCCESS') {
      router.push({ name: 'order-confirmation', params: { orderId: data.orderId } })
    } else {
      router.push({ name: 'store' })
    }
  }
}

onMounted(async () => {
  console.log('🎬 PaymentReturnView montado (Modo Mensajero)')
  const token_ws = route.query.token_ws

  if (!token_ws) {
    const msg = 'No se recibió información de pago válida (sin token_ws)'
    console.error('❌', msg)
    loading.value = false
    error.value = msg
    notifyAndClose('payment-error', { message: msg }) // <-- AVISA Y CIERRA
    return
  }

  console.log('🔑 Token WS encontrado:', token_ws.slice(-6))

  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

    console.log('📞 Invocando confirm-transbank-payment...')
    const response = await fetch(`${SUPABASE_URL}/functions/v1/confirm-transbank-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ token: token_ws }),
    })

    const data = await response.json()
    console.log('📦 Respuesta recibida:', data)

    if (!response.ok) {
      throw new Error(data.error || 'Error al confirmar el pago')
    }

    if (data && data.success) {
      success.value = true
      orderId.value = data.orderId
      console.log('✅ Pago confirmado, orden:', orderId.value)
      notifyAndClose('PAYMENT_SUCCESS', { orderId: orderId.value }) // <-- AVISA Y CIERRA
    } else {
      throw new Error(data?.error || 'No se pudo confirmar el pago')
    }
  } catch (err) {
    const msg = err.message || 'Error al procesar el pago'
    console.error('💥 Error en el proceso:', msg)
    error.value = msg
    notifyAndClose('payment-error', { message: msg }) // <-- AVISA Y CIERRA
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="payment-return-container">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <h2>Procesando...</h2>
    </div>
    <div v-else-if="success" class="success-state">
      <div class="success-icon">✅</div>
      <h2>¡Pago exitoso!</h2>
      <p>Cerrando...</p>
    </div>
    <div v-else-if="error" class="error-state">
      <div class="error-icon">❌</div>
      <h2>Hubo un problema</h2>
      <p>{{ error }}</p>
      <p>Cerrando...</p>
    </div>
  </div>
</template>

<style scoped>
/* (Tu CSS está perfecto, lo pego igual para que sea completo) */
.payment-return-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 40px 20px;
}

.loading-state,
.success-state,
.error-state {
  text-align: center;
  max-width: 500px;
  padding: 40px;
  border-radius: 12px;
  background-color: var(--color-background-soft);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.spinner {
  width: 60px;
  height: 60px;
  border: 6px solid var(--color-border);
  border-top-color: var(--brand-turquoise);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.success-icon,
.error-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

h2 {
  color: var(--color-heading);
  margin-bottom: 15px;
}

p {
  color: var(--color-text);
  margin-bottom: 10px;
}

.order-id {
  font-weight: bold;
  color: var(--brand-turquoise);
  font-size: 1.1rem;
}

.redirect-message {
  font-style: italic;
  color: var(--color-text);
  opacity: 0.7;
  margin-top: 20px;
}

.btn-home {
  margin-top: 20px;
  padding: 12px 30px;
  background-color: var(--brand-turquoise);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-home:hover {
  background-color: var(--brand-pink);
}
</style>
