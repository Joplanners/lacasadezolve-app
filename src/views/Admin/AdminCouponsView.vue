<!-- src/views/Admin/AdminCouponsView.vue -->
<script setup>
import { ref, reactive, onMounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from 'vue-toastification'

const toast = useToast()
const coupons = ref([])
const loading = ref(true)
const error = ref(null)

// --- ESTADO GLOBAL DEL PROYECTO (CONCURSO) ---
const isContestActive = ref(false)
const settingLoading = ref(true)

async function fetchStoreSettings() {
  settingLoading.value = true
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'is_contest_active')
      .single()
    if (data) {
      isContestActive.value = data.value === 'true' || data.value === true
    }
  } catch (err) {
    console.warn('No se pudo cargar el estado del concurso', err)
  } finally {
    settingLoading.value = false
  }
}

async function handleToggleContest() {
  const newValue = !isContestActive.value
  try {
    const { error } = await supabase
      .from('store_settings')
      .update({ value: newValue })
      .eq('key', 'is_contest_active')
    
    if (error) throw error
    isContestActive.value = newValue
    toast.success(`Sorteo/Concurso ${newValue ? 'ACTIVADO' : 'DESACTIVADO'}.`)
  } catch (err) {
    toast.error('Error al cambiar el estado del concurso.')
  }
}

const newCoupon = reactive({
  code: '',
  discount_percent: 10,
  expires_at: null,
  coupon_type: 'MARKETING',
})
const isSubmitting = ref(false)

async function fetchCoupons() {
  loading.value = true
  error.value = null
  try {
    const { data, error: dbError } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
    if (dbError) throw dbError
    coupons.value = data
  } catch {
    error.value = 'No se pudieron cargar los cupones.'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

async function handleCreateCoupon() {
  if (!newCoupon.code || !newCoupon.discount_percent) {
    toast.error('El código y el porcentaje son obligatorios.')
    return
  }
  isSubmitting.value = true
  try {
    const { error: insertError } = await supabase.from('coupons').insert({
      ...newCoupon,
      code: newCoupon.code.toUpperCase().trim(), // Guardar en mayúsculas
    })
    if (insertError) throw insertError
    toast.success(`Cupón "${newCoupon.code.toUpperCase()}" creado con éxito.`)
    // Resetear formulario
    newCoupon.code = ''
    newCoupon.discount_percent = 10
    newCoupon.expires_at = null
    newCoupon.coupon_type = 'MARKETING'
    await fetchCoupons() // Refrescar la lista
  } catch (err) {
    toast.error(`Error al crear el cupón: ${err.message}`)
  } finally {
    isSubmitting.value = false
  }
}

async function handleToggleActive(couponId, currentStatus) {
  try {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !currentStatus })
      .eq('id', couponId)
    if (error) throw error
    toast.success('Estado del cupón actualizado.')
    await fetchCoupons()
  } catch {
    toast.error('No se pudo actualizar el estado.')
  }
}

onMounted(() => {
  fetchCoupons()
  fetchStoreSettings()
})

function formatDate(dateString) {
  if (!dateString) return 'Nunca'
  return new Date(dateString).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="admin-coupons-view">
    <h3>Promociones y Cupones</h3>

    <!-- PANEL DEL CONCURSO GLOBAL -->
    <div class="contest-panel coupon-form">
      <div class="contest-panel-header">
        <div>
          <h4 style="margin-bottom: 0;">Interruptor Global del Concurso</h4>
          <p style="font-size: 0.9rem; color: #555; margin-top: 5px;">
            Enciende o apaga la cajita de Instagram en el proceso de pago.
          </p>
        </div>
        <button 
          @click="handleToggleContest" 
          :disabled="settingLoading"
          :class="isContestActive ? 'btn-active-contest' : 'btn-inactive-contest'"
        >
          {{ isContestActive ? '🟢 Concurso ACTIVO' : '🔴 Concurso INACTIVO' }}
        </button>
      </div>
    </div>

    <!-- Formulario para crear cupón -->
    <form @submit.prevent="handleCreateCoupon" class="coupon-form">
      <h4>Crear Nuevo Cupón</h4>
      <div class="form-grid">
        <div class="form-group">
          <label for="code">Código</label>
          <input
            type="text"
            id="code"
            v-model="newCoupon.code"
            placeholder="EJ: VERANO20"
            required
          />
        </div>
        <div class="form-group">
          <label for="discount">Descuento (%)</label>
          <input
            type="number"
            id="discount"
            v-model.number="newCoupon.discount_percent"
            min="1"
            max="100"
            required
          />
        </div>
        <div class="form-group">
          <label for="expires">Fecha de Expiración (Opcional)</label>
          <input type="date" id="expires" v-model="newCoupon.expires_at" />
        </div>
        <div class="form-group">
          <label for="type">Tipo de Cupón</label>
          <select id="type" v-model="newCoupon.coupon_type" required>
            <option value="MARKETING">Marketing (General)</option>
            <option value="FIRST_PURCHASE">Primera Compra (Uso Único)</option>
          </select>
        </div>
      </div>
      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Creando...' : 'Crear Cupón' }}
      </button>
    </form>

    <!-- Lista de cupones existentes -->
    <h4>Cupones Existentes</h4>
    <div v-if="loading" class="loading-indicator">Cargando cupones...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="!loading && coupons.length > 0" class="coupons-table-container">
      <table class="coupons-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descuento</th>
            <th>Tipo</th>
            <th>Expira</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="coupon in coupons" :key="coupon.id">
            <td class="code-cell">{{ coupon.code }}</td>
            <td>{{ coupon.discount_percent }}%</td>
            <td>{{ coupon.coupon_type }}</td>
            <td>{{ formatDate(coupon.expires_at) }}</td>
            <td>
              <span :class="coupon.is_active ? 'status-active' : 'status-inactive'">
                {{ coupon.is_active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td>
              <button @click="handleToggleActive(coupon.id, coupon.is_active)">
                {{ coupon.is_active ? 'Desactivar' : 'Activar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!loading && coupons.length === 0">No hay cupones creados.</p>
  </div>
</template>

<style scoped>
/* (Estilos similares a tus otros componentes de admin) */
.admin-coupons-view {
  padding: 20px;
}
.coupon-form {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  border: 1px solid #dee2e6;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}
.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.coupons-table-container {
  overflow-x: auto;
}
.coupons-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}
.coupons-table th,
.coupons-table td {
  border: 1px solid #dee2e6;
  padding: 10px;
  text-align: left;
}
.coupons-table th {
  background-color: #e9ecef;
}
.code-cell {
  font-weight: bold;
  font-family: monospace;
}
.status-active {
  color: green;
  font-weight: bold;
}
.status-inactive {
  color: red;
  font-weight: bold;
}
button {
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid transparent;
}

.contest-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.btn-active-contest {
  background-color: #e6f4ea;
  color: #1e8e3e;
  border: 1px solid #1e8e3e;
  font-weight: bold;
}
.btn-inactive-contest {
  background-color: #fce8e6;
  color: #d93025;
  border: 1px solid #d93025;
  font-weight: bold;
}
</style>
