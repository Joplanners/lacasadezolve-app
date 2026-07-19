<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from 'vue-toastification'

const route = useRoute()
const orderId = route.params.orderId

const authStore = useAuthStore()
const toast = useToast()
const isDownloading = ref(false)

const order = ref(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const { data, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*, product:products(*))')
      .eq('id', orderId)
      .single()

    if (orderError) throw orderError

    order.value = data
  } catch (err) {
    console.error('Error cargando orden:', err)
    error.value = 'No se pudo cargar la información del pedido'
  } finally {
    loading.value = false
  }
})
const digitalItems = computed(() => {
  if (!order.value || !order.value.order_items) return []
  return order.value.order_items.filter(item => item.product?.is_downloadable)
})

async function downloadFile(orderItemId) {
  isDownloading.value = true
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    const headers = { 'Content-Type': 'application/json' }
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    
    const response = await fetch('/.netlify/functions/generate-download-url', {
      method: 'POST',
      headers,
      body: JSON.stringify({ order_item_id: orderItemId })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Error al generar link')
    
    // Abrir URL en nueva pestaña
    window.open(data.url, '_blank')
    toast.success(`Descarga iniciada. Te quedan ${data.max_downloads - data.downloads_count} descargas.`)
  } catch (err) {
    console.error('Error:', err)
    toast.error(err.message || 'No se pudo descargar el archivo')
  } finally {
    isDownloading.value = false
  }
}
</script>

<template>
  <div class="order-confirmation">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Cargando información del pedido...</p>
    </div>

    <div v-else-if="error" class="error">
      <h2>❌ Error</h2>
      <p>{{ error }}</p>
      <router-link to="/tienda" class="btn">Volver a la tienda</router-link>
    </div>

    <div v-else-if="order" class="success">
      <div class="check-icon">✓</div>
      <h1>¡Pago Exitoso!</h1>
      <p class="subtitle">Tu pedido ha sido confirmado</p>

      <div class="order-details">
        <h2>Detalles del Pedido</h2>

        <div class="detail-row">
          <span class="label">Número de Pedido:</span>
          <span class="value">{{ order.id.slice(0, 8).toUpperCase() }}</span>
        </div>

        <div class="detail-row">
          <span class="label">Total Pagado:</span>
          <span class="value">${{ order.total_amount.toLocaleString('es-CL') }}</span>
        </div>

        <div class="detail-row">
          <span class="label">Estado:</span>
          <span class="value status-paid">PAGADO</span>
        </div>

        <div class="detail-row">
          <span class="label">Método de Pago:</span>
          <span class="value">Webpay Plus</span>
        </div>

        <div v-if="order.payment_info?.card_number" class="detail-row">
          <span class="label">Tarjeta:</span>
          <span class="value">**** {{ order.payment_info.card_number }}</span>
        </div>
      </div>

      <div class="email-notice">
        <p>
          📧 Se ha enviado un correo de confirmación a <strong>{{ order.customer_email }}</strong>
        </p>
      </div>

      <div v-if="digitalItems.length > 0 && (order.status === 'paid' || order.status === 'processing')" class="digital-downloads">
        <h2>📥 Tus Archivos Digitales</h2>
        <p>Tu compra incluye archivos digitales que ya puedes descargar.</p>
        <div class="downloads-list">
          <div v-for="item in digitalItems" :key="item.id" class="download-item">
            <span class="download-name">{{ item.product.name }}</span>
            <button @click="downloadFile(item.id)" class="btn btn-primary" :disabled="isDownloading">
              {{ isDownloading ? 'Cargando...' : 'Descargar Archivo' }}
            </button>
          </div>
        </div>
        <p class="download-warning"><small>Nota: Las descargas están limitadas a 5 por archivo y el link expira en 1 hora por seguridad.</small></p>
        
        <div v-if="!authStore.isLoggedIn" class="guest-register-invite">
          <p>💡 <strong>¿Quieres guardar tus descargas para siempre?</strong></p>
          <p>Crea una cuenta o <router-link to="/ingreso">inicia sesión</router-link> en nuestra tienda y tus compras quedarán seguras en tu Perfil.</p>
        </div>
      </div>

      <div class="actions">
        <router-link to="/mi-perfil" class="btn btn-primary">Ver mis pedidos</router-link>
        <router-link to="/tienda" class="btn btn-secondary">Seguir comprando</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-confirmation {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loading {
  text-align: center;
  color: white;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  background: white;
  padding: 40px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.success {
  background: white;
  padding: 50px;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.check-icon {
  width: 80px;
  height: 80px;
  background: #27ae60;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50px;
  margin: 0 auto 20px;
  animation: scaleIn 0.5s ease-out;
}

@keyframes scaleIn {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

h1 {
  color: #333;
  margin: 0 0 10px;
  font-size: 32px;
}

.subtitle {
  color: #666;
  font-size: 18px;
  margin-bottom: 40px;
}

.order-details {
  background: #f8f9fa;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 30px;
  text-align: left;
}

.order-details h2 {
  margin: 0 0 20px;
  font-size: 20px;
  color: #333;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #e0e0e0;
}

.detail-row:last-child {
  border-bottom: none;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  color: #333;
  font-weight: 600;
}

.status-paid {
  color: #27ae60;
  background: #d4edda;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
}

.email-notice {
  background: #e3f2fd;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.email-notice p {
  margin: 0;
  color: #1976d2;
}

.actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 15px 30px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
}

.btn-secondary {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-secondary:hover {
  background: #f8f9fa;
  transform: translateY(-2px);
}

.digital-downloads {
  background: #f3e5f5;
  padding: 25px;
  border-radius: 12px;
  margin-bottom: 30px;
  border: 1px dashed #ce93d8;
  text-align: left;
}
.digital-downloads h2 {
  color: #8e24aa;
  margin-top: 0;
  margin-bottom: 10px;
}
.digital-downloads > p {
  color: #6a1b9a;
  margin-bottom: 20px;
}
.downloads-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.download-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(156, 39, 176, 0.1);
}
.download-name {
  font-weight: 600;
  color: #4a148c;
}
.download-warning {
  margin-top: 15px;
  color: #7b1fa2;
  font-style: italic;
  text-align: center;
}
.guest-register-invite {
  background: #fff3e0;
  border: 1px solid #ffcc80;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
  text-align: center;
  color: #e65100;
}
.guest-register-invite p {
  margin: 5px 0;
}
.guest-register-invite a {
  color: #f57c00;
  font-weight: bold;
  text-decoration: underline;
}
</style>
