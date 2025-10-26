<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter() // <-- Usaremos el router para navegar

const loading = ref(true)
const error = ref(null)
const success = ref(false)
const orderId = ref(null)

// 🔥 NUEVA FUNCIÓN: El botón de error ahora nos lleva a la tienda
function goToStore() {
  console.log('Navegando a la tienda...')
  router.push({ name: 'store' })
}

onMounted(async () => {
  console.log('🎬 PaymentReturnView montado (Modo Redirección)')

  const token_ws = route.query.token_ws

  if (!token_ws) {
    const msg = 'No se recibió información de pago válida (sin token_ws)'
    console.error('❌', msg)
    loading.value = false
    error.value = msg // <-- Solo muestra el error
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

    // El error 400 entra aquí
    if (!response.ok) {
      console.error('❌ Error en la respuesta:', data)
      throw new Error(data.error || 'Error al confirmar el pago')
    }

    if (data && data.success) {
      success.value = true
      orderId.value = data.orderId
      console.log('✅ Pago confirmado, orden:', orderId.value)

      // 🔥 FIX: En vez de cerrar, REDIRIGIMOS a la confirmación
      setTimeout(() => {
        router.push({
          name: 'order-confirmation',
          params: { orderId: orderId.value },
        })
      }, 2000) // Damos 2 segundos para que el usuario lea "Pago exitoso"
    } else {
      throw new Error(data?.error || 'No se pudo confirmar el pago')
    }
  } catch (err) {
    // Aquí es donde estás cayendo por el error 400
    const msg = err.message || 'Error al procesar el pago'
    console.error('💥 Error en el proceso:', msg)
    error.value = msg // <-- Solo muestra el error
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="payment-return-container">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <h2>Procesando tu pago...</h2>
      <p>Por favor espera mientras confirmamos tu transacción con Transbank</p>
    </div>

    <div v-else-if="success" class="success-state">
      <div class="success-icon">✅</div>
      <h2>¡Pago exitoso!</h2>
      <p>Tu orden ha sido confirmada correctamente</p>
      <p v-if="orderId" class="order-id">Número de orden: {{ orderId }}</p>
      <p class="redirect-message">Serás redirigido en un momento...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">❌</div>
      <h2>Hubo un problema</h2>
      <p>{{ error }}</p>

      <button @click="goToStore" class="btn-home">Volver a la tienda</button>
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
