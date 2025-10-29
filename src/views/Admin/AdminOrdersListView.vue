<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from 'vue-toastification'

const orders = ref([])
const loading = ref(true)
const error = ref('')
const toast = useToast()

const activeFilter = ref('todos')

const searchQuery = ref('')
let debounceTimer = null

const currentPage = ref(1)
const ordersPerPage = ref(10)
const totalOrders = ref(0)

const totalPages = computed(() => {
  return Math.ceil(totalOrders.value / ordersPerPage.value)
})

async function fetchOrders() {
  loading.value = true
  error.value = ''

  const from = (currentPage.value - 1) * ordersPerPage.value
  const to = from + ordersPerPage.value - 1

  try {
    let query = supabase
      .from('orders')
      // --- ✨ ¡SOLUCIÓN AQUÍ! ✨ ---
      // Cambiamos el select() para que pida TODAS las columnas (*)
      // en lugar de solo una lista específica.
      .select(
        `*`, // Antes aquí tenías una lista larga de columnas
        { count: 'exact' },
      )
      // --- FIN DE LA SOLUCIÓN ---
      .order('created_at', { ascending: false })
      .range(from, to)

    if (searchQuery.value.trim()) {
      const searchTerm = `%${searchQuery.value.trim()}%`
      query = query.or(`customer_name.ilike.${searchTerm},customer_email.ilike.${searchTerm}`)
    }

    if (activeFilter.value === 'pendientes') {
      query = query.eq('status', 'pending_verification')
    }
    if (activeFilter.value === 'listos') {
      query = query.in('status', ['paid', 'processing'])
    }

    const { data, error: fetchError, count } = await query

    // 🔥 LOGS DE DEBUG
    console.log('=== DEBUG ORDERS ===')
    console.log('Total count:', count)
    console.log('Orders data:', data)
    console.log('JSON Orders:', JSON.stringify(data, null, 2)) // <-- ¡REVISA ESTE!
    console.log('Active filter:', activeFilter.value)
    console.log('Search query:', searchQuery.value)
    console.log('====================')

    if (fetchError) throw fetchError

    orders.value = data || []
    totalOrders.value = count || 0
  } catch (err) {
    console.error('Error fetching orders:', err)
    error.value = 'No se pudieron cargar los pedidos.'
    orders.value = []
    totalOrders.value = 0
  } finally {
    loading.value = false
  }
}

watch(searchQuery, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    currentPage.value = 1
    fetchOrders()
  }, 500)
})

watch(activeFilter, () => {
  currentPage.value = 1
  fetchOrders()
})

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchOrders()
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchOrders()
  }
}

onMounted(fetchOrders)

function formatDate(dateTimeString) {
  if (!dateTimeString) return '-'
  try {
    const date = new Date(dateTimeString)
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Fecha inválida'
  }
}

function formatPrice(value) {
  const numValue = Number(value)
  if (isNaN(numValue)) return '$ -'
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(numValue)
}

async function updateOrderStatus(orderId, newStatus) {
  if (!orderId || !newStatus) return
  const orderIndex = orders.value.findIndex((o) => o.id === orderId)
  if (orderIndex === -1) return
  const oldStatus = orders.value[orderIndex].status

  orders.value[orderIndex].status = newStatus
  toast.info(`Actualizando estado...`)

  try {
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
    if (updateError) throw updateError
    toast.success(`Pedido actualizado a ${newStatus}.`)
    fetchOrders()
  } catch (err) {
    toast.error(`Error al actualizar pedido: ${err.message}`)
    orders.value[orderIndex].status = oldStatus
  }
}

function viewProof(urlPath) {
  if (!urlPath) {
    toast.warning('Este pedido no tiene comprobante adjunto.')
    return
  }
  try {
    const { data } = supabase.storage.from('comprobantes').getPublicUrl(urlPath)
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank')
    } else {
      throw new Error('No se pudo obtener la URL pública.')
    }
  } catch {
    toast.error('No se pudo abrir el comprobante.')
  }
}

function statusClass(status) {
  const safeStatus = String(status || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
  return `status-${safeStatus}`
}
</script>

<template>
  <div class="admin-orders-list">
    <div class="header-section">
      <h3>Gestión de Pedidos</h3>

      <div class="search-bar">
        <input type="text" v-model="searchQuery" placeholder="Buscar por ID, nombre o email..." />
      </div>

      <div class="filter-tabs">
        <button
          @click="activeFilter = 'pendientes'"
          :class="{ active: activeFilter === 'pendientes' }"
        >
          Pendientes de Verificación
        </button>
        <button @click="activeFilter = 'listos'" :class="{ active: activeFilter === 'listos' }">
          Listos para Preparar
        </button>
        <button @click="activeFilter = 'todos'" :class="{ active: activeFilter === 'todos' }">
          Todos los Pedidos
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-indicator"><p>Cargando pedidos...</p></div>
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="fetchOrders" class="btn btn-secondary">Reintentar</button>
    </div>
    <div v-else-if="orders.length === 0" class="no-items">
      <p v-if="searchQuery">No se encontraron pedidos para "{{ searchQuery }}".</p>
      <p v-else>No hay pedidos que coincidan con este filtro.</p>
    </div>

    <div v-else>
      <div class="orders-card-list">
        <div
          v-for="order in orders"
          :key="order.id"
          class="order-card"
          :class="`status-border-${statusClass(order.status)}`"
        >
          <div class="card-info">
            <p class="customer-name" :title="order.customer_email">
              {{ order.customer_name || order.customer_email || 'N/A' }}
            </p>
            <p class="order-details">
              <RouterLink
                :to="{ name: 'admin-order-detail', params: { orderId: order.id } }"
                class="order-id-link"
                :title="order.id"
              >
                #{{ order.id.substring(0, 8) }}
              </RouterLink>
              <span class="order-date">{{ formatDate(order.created_at) }}</span>
            </p>
            <p class="order-total">
              Total: <strong>{{ formatPrice(order.total_amount) }}</strong>
            </p>
          </div>

          <div class="card-status">
            <span :class="['status-badge', statusClass(order.status)]">
              {{ order.status || 'Desconocido' }}
            </span>
            <p class="payment-method">{{ order.payment_method || '-' }}</p>
          </div>

          <div class="card-actions">
            <button
              v-if="order.payment_method === 'transferencia' && order.comprobante_url"
              @click="viewProof(order.comprobante_url)"
              class="btn btn-info"
              title="Ver Comprobante"
            >
              📄 Ver Comprobante
            </button>

            <select
              :value="order.status"
              @change="updateOrderStatus(order.id, $event.target.value)"
              class="status-select"
              title="Cambiar Estado"
            >
              <option :value="order.status" disabled>Cambiar estado...</option>
              <option v-if="order.status === 'pending_verification'" value="paid">
                ✅ Marcar Pagado
              </option>
              <option
                v-if="['paid', 'pending_verification'].includes(order.status)"
                value="processing"
              >
                ⏳ A Procesando
              </option>
              <option v-if="['paid', 'processing'].includes(order.status)" value="shipped">
                🚚 Marcar Enviado
              </option>
              <option value="cancelled">❌ Cancelar Pedido</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="pagination-controls">
        <button @click="prevPage" :disabled="currentPage === 1" class="btn">Anterior</button>
        <span>Página {{ currentPage }} de {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage === totalPages" class="btn">
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-orders-list {
  padding: 15px;
  max-width: 1200px;
  margin: auto;
}

.header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-bottom: 25px;
}

h3 {
  margin: 0;
  font-size: 1.8rem;
}

.search-bar {
  width: 100%;
  max-width: 400px;
}
.search-bar input {
  width: 100%;
  padding: 10px 15px;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  font-size: 1rem;
}

.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}
.filter-tabs button {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background-soft);
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}
.filter-tabs button:hover {
  background-color: var(--color-background-mute);
}
.filter-tabs button.active {
  background-color: var(--brand-pink);
  color: white;
  border-color: var(--brand-pink);
}

.orders-card-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.order-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 15px 20px;
  padding: 15px;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-left: 5px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.status-border-status-pending_verification {
  border-left-color: #ffc107;
}
.status-border-status-paid {
  border-left-color: #17a2b8;
}
.status-border-status-processing {
  border-left-color: #17a2b8;
}

.card-info {
  flex: 2 1 250px;
}
.card-status {
  flex: 1 1 150px;
  text-align: center;
}
.card-actions {
  flex: 1 1 200px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
}

.customer-name {
  font-weight: 600;
  font-size: 1.1em;
  margin: 0 0 8px 0;
}
.order-details,
.order-total {
  font-size: 0.9em;
  color: var(--color-text-soft);
  margin: 4px 0;
}
.order-id-link {
  font-family: monospace;
  background-color: var(--color-background-mute);
  padding: 2px 5px;
  border-radius: 3px;
  margin-right: 10px;
  color: var(--brand-turquoise);
  text-decoration: none;
  border-bottom: 1px dashed var(--brand-turquoise);
}
.order-id-link:hover {
  background-color: var(--brand-turquoise);
  color: white;
}
.order-total strong {
  color: var(--color-text);
  font-size: 1.1em;
}
.payment-method {
  font-size: 0.8em;
  color: var(--color-text-mute);
  margin-top: 5px;
  font-style: italic;
}
.status-select,
.btn-info {
  width: 100%;
  padding: 8px 10px;
  font-size: 0.9rem;
  border-radius: 5px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  cursor: pointer;
}
.btn-info {
  background-color: var(--brand-turquoise);
  color: white;
}
.btn-info:hover {
  background-color: #138496;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 25px;
}
.pagination-controls .btn {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
}
.pagination-controls .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--color-background-mute);
}

.loading-indicator p,
.error-message p,
.no-items p {
  font-style: italic;
  text-align: center;
}
.error-message {
  background-color: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
  border-radius: 5px;
  padding: 15px;
}
.no-items {
  background-color: #f0f4f8;
  color: #4a5568;
  border: 1px solid #d3dfea;
  border-radius: 5px;
  padding: 15px;
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
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-secondary {
  background-color: var(--brand-turquoise);
  color: white;
}

@media (max-width: 768px) {
  .order-card {
    flex-direction: column;
    align-items: stretch;
  }
  .card-status {
    text-align: left;
    order: 3;
  }
  .card-info {
    order: 1;
  }
  .card-actions {
    order: 2;
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
