<script setup>
import { ref, onMounted, computed } from 'vue' // <-- Añadimos computed
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'

const route = useRoute()
const router = useRouter()

const order = ref(null)
const loading = ref(true)
const error = ref('')

const orderId = route.params.orderId

// --- NUEVO: Propiedad computada para el subtotal ---
const subtotal = computed(() => {
  if (!order.value) return 0
  return (order.value.total_amount || 0) + (order.value.discount_amount || 0)
})

async function fetchOrderDetails() {
  if (!orderId) {
    error.value = 'No se ha proporcionado un ID de pedido.'
    loading.value = false
    return
  }
  try {
    // --- QUERY ACTUALIZADA: Pedimos los campos del cupón ---
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select(
        `
        id, created_at, total_amount, status, shipping_address,
        applied_coupon_code, discount_amount,
        order_items (
          quantity,
          price_at_purchase,
          product:products (name, image_urls)
        )
      `,
      )
      .eq('id', orderId)
      .single()
    if (fetchError) throw fetchError
    if (!data) throw new Error('No se encontró el pedido.')
    order.value = data
  } catch (err) {
    error.value = `Error al cargar el pedido: ${err.message}`
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  fetchOrderDetails()
})
</script>

<template>
  <div class="order-detail-view">
    <button @click="router.back()" class="btn btn-tertiary btn-back">
      &larr; Volver a Mis Compras
    </button>
    <div v-if="loading" class="loading-indicator">Cargando detalle del pedido...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="order" class="order-content">
      <h1>Detalle del Pedido</h1>
      <section class="detail-section summary-section">
        <h2>Resumen del Pedido</h2>
        <div class="summary-grid">
          <p>
            <strong>Nº Pedido:</strong> <span class="order-id">#{{ order.id }}</span>
          </p>
          <p>
            <strong>Fecha:</strong
            ><span>{{ new Date(order.created_at).toLocaleString('es-CL') }}</span>
          </p>

          <!-- --- BLOQUE DE TOTALES ACTUALIZADO --- -->
          <div class="financial-summary span-2">
            <p>
              <strong>Subtotal:</strong>
              <span>{{
                new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                  subtotal,
                )
              }}</span>
            </p>
            <p v-if="order.discount_amount > 0" class="discount-row">
              <strong>Descuento ({{ order.applied_coupon_code }}):</strong>
              <span
                >-
                {{
                  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                    order.discount_amount,
                  )
                }}</span
              >
            </p>
            <p>
              <strong>Total Pagado:</strong>
              <span class="total-amount">{{
                new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                  order.total_amount,
                )
              }}</span>
            </p>
          </div>
          <!-- --- FIN DEL BLOQUE --- -->

          <p class="span-2">
            <strong>Estado:</strong
            ><span
              :class="`status-${order.status?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`"
              >{{ order.status || 'Desconocido' }}</span
            >
          </p>
        </div>
      </section>

      <section class="detail-section products-section">
        <h2>Productos en este Pedido</h2>
        <div class="product-list">
          <div v-for="item in order.order_items" :key="item.product.id" class="product-item">
            <img
              :src="item.product?.image_urls?.[0] || '/Zolve_Logo.png'"
              :alt="item.product.name"
              class="product-image"
            />
            <div class="product-info">
              <p class="product-name">{{ item.product.name }}</p>
              <p class="product-quantity-price">
                {{ item.quantity }} x
                {{
                  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                    item.price_at_purchase,
                  )
                }}
              </p>
            </div>
            <p class="product-subtotal">
              {{
                new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                  item.quantity * item.price_at_purchase,
                )
              }}
            </p>
          </div>
        </div>
      </section>

      <section class="detail-section shipping-section">
        <h2>Dirección de Envío</h2>
        <div v-if="order.shipping_address" class="shipping-address-box">
          <p>{{ order.shipping_address.street }} {{ order.shipping_address.number }}</p>
          <p v-if="order.shipping_address.details">{{ order.shipping_address.details }}</p>
          <p>{{ order.shipping_address.commune }}, {{ order.shipping_address.region }}</p>
        </div>
        <div v-else class="no-items">No se especificó una dirección de envío para este pedido.</div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* (Tus estilos existentes) */
.order-detail-view {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
}
h1 {
  text-align: center;
  margin-bottom: 30px;
}
.btn-back {
  margin-bottom: 25px;
}
.detail-section {
  margin-bottom: 35px;
  background-color: var(--color-background-soft);
  padding: 25px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}
.detail-section h2 {
  font-size: 1.4rem;
  margin-top: 0;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--color-border-hover);
  padding-bottom: 10px;
}
.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}
.summary-grid p {
  margin: 0;
}
.summary-grid strong {
  color: var(--color-text-soft);
  margin-right: 8px;
}
.product-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.product-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  border-bottom: 1px solid var(--color-border-hover);
}
.product-item:last-child {
  border-bottom: none;
}
.product-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}
.product-info {
  flex-grow: 1;
}
.product-name {
  font-weight: 600;
  margin: 0 0 4px 0;
}
.product-quantity-price {
  font-size: 0.9em;
  color: var(--color-text-soft);
  margin: 0;
}
.product-subtotal {
  font-weight: 600;
  font-size: 1rem;
}
.shipping-address-box {
  background-color: var(--color-background);
  padding: 15px;
  border-radius: 5px;
  border: 1px solid var(--color-border);
}
.shipping-address-box p {
  margin: 5px 0;
}
span[class^='status-'] {
  font-weight: bold;
  text-transform: capitalize;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.85em;
}
.status-pending,
.status-pending_verification {
  color: #856404;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
}
.status-paid,
.status-processing,
.status-preparing_shipment {
  color: #0c5460;
  background-color: #d1ecf1;
  border: 1px solid #bee5eb;
}
.status-shipped {
  color: #155724;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}
.status-delivered {
  color: #383d41;
  background-color: #e2e3e5;
  border: 1px solid #d6d8db;
}
.status-cancelled,
.status-failed,
.status-unknown {
  color: #721c24;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}
.status-cancelled,
.status-failed {
  text-decoration: line-through;
}
.btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 18px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.btn-tertiary {
  background-color: transparent;
  color: var(--color-link);
  border: 1px solid var(--color-border);
}
.loading-indicator,
.error-message,
.no-items {
  padding: 15px;
  text-align: center;
  border-radius: 5px;
  margin: 20px auto;
}
.error-message {
  background-color: #ffebee;
  color: #c62828;
}
.no-items {
  background-color: var(--color-background-mute);
}
@media (max-width: 600px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
  .detail-section {
    padding: 15px;
  }
}
.order-id {
  font-family: monospace;
}
.total-amount {
  font-weight: bold;
  font-size: 1.1em;
}

/* --- NUEVOS ESTILOS --- */
.financial-summary {
  grid-column: 1 / -1; /* Ocupa todo el ancho en la grilla */
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
}
.span-2 {
  /* Helper para ocupar 2 columnas */
  grid-column: 1 / -1;
}
</style>
