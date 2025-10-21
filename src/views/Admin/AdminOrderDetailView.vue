<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from 'vue-toastification'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const order = ref(null)
const loading = ref(true)
const error = ref('')

const orderId = computed(() => route.params.orderId)

// --- NUEVO: Propiedad computada para el subtotal ---
const subtotal = computed(() => {
  if (!order.value) return 0
  // El subtotal es el total final MÁS el descuento que se aplicó.
  return (order.value.total_amount || 0) + (order.value.discount_amount || 0)
})

async function fetchOrderDetail() {
  loading.value = true
  error.value = ''
  order.value = null

  if (!orderId.value) {
    error.value = 'ID de pedido no especificado.'
    loading.value = false
    return
  }

  try {
    // --- QUERY ACTUALIZADA: Pedimos los campos del cupón ---
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select(
        `
        *,
        applied_coupon_code,
        discount_amount,
        order_items (
            quantity,
            price_at_purchase,
            product:products (id, name, image_urls, sku)
        )
      `,
      )
      .eq('id', orderId.value)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error(`Pedido con ID #${orderId.value.substring(0, 8)}... no encontrado.`)
      } else {
        throw fetchError
      }
    }
    order.value = data
  } catch (err) {
    console.error('Error fetching order detail:', err)
    error.value = err.message || 'No se pudo cargar el detalle del pedido.'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

onMounted(fetchOrderDetail)

function formatDate(dateTimeString) {
  if (!dateTimeString) return '-'
  try {
    const date = new Date(dateTimeString)
    return date.toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' })
  } catch {
    return 'Fecha inválida'
  }
}
function formatPrice(value) {
  const numValue = Number(value)
  if (isNaN(numValue)) return '$ -'
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(numValue)
}
function statusClass(status) {
  const safeStatus = String(status || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
  return `status-${safeStatus}`
}

function goBack() {
  router.push({ name: 'admin-orders' })
}
</script>

<template>
  <div class="admin-order-detail">
    <button @click="goBack" class="btn btn-tertiary btn-back">← Volver a Pedidos</button>
    <h2>Detalle del Pedido</h2>
    <div v-if="loading" class="loading-indicator"><p>Cargando detalle...</p></div>
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>
    <div v-else-if="order" class="order-details-grid">
      <div class="detail-section customer-info">
        <h3>Información General</h3>
        <p>
          <strong>ID Pedido:</strong> <span class="order-id">{{ order.id }}</span>
        </p>
        <p><strong>Fecha:</strong> {{ formatDate(order.created_at) }}</p>
        <p>
          <strong>Estado:</strong
          ><span :class="['status-badge', statusClass(order.status)]">{{ order.status }}</span>
        </p>

        <!-- --- BLOQUE DE TOTALES ACTUALIZADO --- -->
        <div class="financial-summary">
          <p>
            <strong>Subtotal:</strong> <span>{{ formatPrice(subtotal) }}</span>
          </p>
          <p v-if="order.discount_amount > 0" class="discount-row">
            <strong>Descuento ({{ order.applied_coupon_code }}):</strong>
            <span>- {{ formatPrice(order.discount_amount) }}</span>
          </p>
          <p>
            <strong>Total Pagado:</strong
            ><span class="total-amount">{{ formatPrice(order.total_amount) }}</span>
          </p>
        </div>
        <!-- --- FIN DEL BLOQUE --- -->

        <p><strong>Método Pago:</strong> {{ order.payment_method || '-' }}</p>
        <a
          v-if="order.comprobante_url"
          :href="
            supabase.storage.from('comprobantes').getPublicUrl(order.comprobante_url).data.publicUrl
          "
          target="_blank"
          class="btn btn-info btn-sm"
          >📄 Ver Comprobante</a
        >
        <h4>Cliente</h4>
        <p><strong>Nombre:</strong> {{ order.customer_name || 'N/A' }}</p>
        <p><strong>Email:</strong> {{ order.customer_email || 'N/A' }}</p>
        <p v-if="order.user_id">
          <strong>ID Usuario:</strong> <span class="user-id">{{ order.user_id }}</span>
        </p>
      </div>
      <div class="detail-section shipping-and-items">
        <div v-if="order.shipping_address" class="shipping-address">
          <h4>Dirección de Envío</h4>
          <p>
            {{ order.shipping_address.street || '' }} {{ order.shipping_address.number || '' }}
            {{ order.shipping_address.details ? `, ${order.shipping_address.details}` : '' }}
          </p>
          <p>{{ order.shipping_address.commune || '' }}</p>
          <p>{{ order.shipping_address.region || '' }}</p>
        </div>
        <div v-else class="shipping-address">
          <h4>Dirección de Envío</h4>
          <p><em>(No especificada)</em></p>
        </div>
        <div class="order-items-list">
          <h4>Productos en este Pedido</h4>
          <div v-if="!order.order_items || order.order_items.length === 0">
            <p><em>No se encontraron productos para este pedido.</em></p>
          </div>
          <div v-else>
            <div
              v-for="item in order.order_items"
              :key="item.product?.id || Math.random()"
              class="order-item-detail"
            >
              <img
                :src="item.product?.image_urls?.[0] || '/Zolve_Logo.png'"
                :alt="item.product?.name || 'Producto'"
                class="item-thumbnail"
              />
              <div class="item-info">
                <p class="item-name">{{ item.product?.name || 'Producto Desconocido' }}</p>
                <p class="item-sku">SKU: {{ item.product?.sku || 'N/A' }}</p>
                <p class="item-price-qty">
                  {{ item.quantity }} x {{ formatPrice(item.price_at_purchase) }}
                </p>
              </div>
              <div class="item-subtotal">
                {{ formatPrice(item.quantity * item.price_at_purchase) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="!loading && !error"><p>No se encontró el pedido.</p></div>
  </div>
</template>

<style scoped>
/* (Tus estilos existentes) */
.admin-order-detail {
  padding: 20px;
  max-width: 900px;
  margin: auto;
}
.btn-back {
  margin-bottom: 25px;
}
h2 {
  text-align: center;
  margin-bottom: 30px;
  font-size: 1.8rem;
}
.loading-indicator,
.error-message {
  text-align: center;
  margin: 30px 0;
  font-style: italic;
}
.error-message {
  color: #c62828;
  font-weight: bold;
}
.order-details-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
  background-color: var(--color-background-soft);
  padding: 25px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}
.detail-section h3,
.detail-section h4 {
  margin-top: 0;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-hover);
  color: var(--color-heading);
}
.detail-section h4 {
  font-size: 1.1rem;
}
.customer-info p,
.shipping-address p {
  margin: 6px 0;
  font-size: 0.95rem;
  color: var(--color-text);
  line-height: 1.5;
}
.customer-info strong,
.shipping-address strong {
  color: var(--color-text-soft);
  min-width: 80px;
  display: inline-block;
}
.order-id,
.user-id {
  font-family: monospace;
  font-size: 0.9em;
}
.total-amount {
  font-weight: bold;
  font-size: 1.1em;
  color: var(--brand-turquoise);
}
.order-items-list {
  margin-top: 30px;
}
.order-item-detail {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border-hover);
}
.order-item-detail:last-child {
  border-bottom: none;
}
.item-thumbnail {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}
.item-info {
  flex-grow: 1;
}
.item-name {
  font-weight: 600;
  margin: 0 0 4px 0;
}
.item-sku {
  font-size: 0.8em;
  color: var(--color-text-mute);
  margin: 0 0 4px 0;
}
.item-price-qty {
  font-size: 0.9em;
  color: var(--color-text-soft);
  margin: 0;
}
.item-subtotal {
  font-weight: 600;
  text-align: right;
  min-width: 80px;
}
.status-badge {
  font-weight: bold;
  text-transform: capitalize;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  border: 1px solid transparent;
}
.status-pending,
.status-pending_verification {
  color: #856404;
  background-color: #fff3cd;
  border-color: #ffeeba;
}
.status-paid,
.status-processing,
.status-preparing_shipment {
  color: #0c5460;
  background-color: #d1ecf1;
  border-color: #bee5eb;
}
.status-shipped {
  color: #155724;
  background-color: #d4edda;
  border-color: #c3e6cb;
}
.status-delivered {
  color: #383d41;
  background-color: #e2e3e5;
  border-color: #d6d8db;
}
.status-cancelled,
.status-failed,
.status-unknown {
  color: #721c24;
  background-color: #f8d7da;
  border-color: #f5c6cb;
}
.status-cancelled,
.status-failed {
  text-decoration: line-through;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.9em;
  transition: all 0.2s ease;
  margin-right: 10px;
}
.btn-tertiary {
  background-color: transparent;
  color: var(--color-link);
  border: 1px solid var(--color-border);
}
.btn-tertiary:hover {
  background-color: var(--color-background-mute);
}
.btn-info {
  background-color: #17a2b8;
  color: white;
}
.btn-info:hover {
  background-color: #138496;
}
.btn-sm {
  padding: 4px 8px;
  font-size: 0.8rem;
}
@media (min-width: 768px) {
  .order-details-grid {
    grid-template-columns: 1fr 1.5fr;
  }
}

/* --- NUEVOS ESTILOS --- */
.financial-summary {
  border-top: 1px solid var(--color-border-hover);
  border-bottom: 1px solid var(--color-border-hover);
  padding: 10px 0;
  margin: 10px 0;
}
.financial-summary p {
  display: flex;
  justify-content: space-between;
}
.discount-row {
  color: green;
  font-size: 0.9em !important;
}
</style>
