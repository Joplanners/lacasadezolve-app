<script setup>
import { ref } from 'vue'
import { formatearCLP } from '@/composables/usarPacksMayorista'

const props = defineProps({
  activo: {
    type: Boolean,
    default: false,
  },
  paquetes: {
    type: Array,
    default: () => [],
  },
  disenos: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:activo', 'update:paquetes', 'update:disenos'])

const nuevoDisenoInput = ref('')

function toggleActivo(event) {
  emit('update:activo', event.target.checked)
}

function agregarPaquete() {
  const lista = Array.isArray(props.paquetes) ? [...props.paquetes] : []
  lista.push({ quantity: null, total_price: null })
  emit('update:paquetes', lista)
}

function eliminarPaquete(indice) {
  const lista = [...props.paquetes]
  lista.splice(indice, 1)
  emit('update:paquetes', lista)
}

function actualizarCantidad(indice, valor) {
  const lista = [...props.paquetes]
  lista[indice] = { ...lista[indice], quantity: valor ? Number(valor) : null }
  emit('update:paquetes', lista)
}

function actualizarPrecio(indice, valor) {
  const lista = [...props.paquetes]
  lista[indice] = { ...lista[indice], total_price: valor ? Number(valor) : null }
  emit('update:paquetes', lista)
}

function calcularUnitario(pkg) {
  const q = Number(pkg.quantity)
  const p = Number(pkg.total_price)
  if (!q || !p || q <= 0 || p <= 0) return '-'
  return `${formatearCLP(Math.round(p / q))} c/u`
}

function agregarDiseno() {
  const texto = nuevoDisenoInput.value.trim()
  if (!texto) return

  const lista = Array.isArray(props.disenos) ? [...props.disenos] : []
  if (!lista.includes(texto)) {
    lista.push(texto)
    emit('update:disenos', lista)
  }
  nuevoDisenoInput.value = ''
}

function eliminarDiseno(indice) {
  const lista = [...props.disenos]
  lista.splice(indice, 1)
  emit('update:disenos', lista)
}
</script>

<template>
  <div class="configurador-mayorista">
    <!-- Checkbox Activador -->
    <div class="form-group checkbox-group">
      <input
        type="checkbox"
        id="toggleMayorista"
        :checked="activo"
        @change="toggleActivo"
      />
      <label for="toggleMayorista">
        <strong>📦 Venta por Mayor / Packs de Cantidad</strong> (Ej: 1 un, 50 un, 100 un)
      </label>
    </div>

    <!-- Panel de Configuración -->
    <div v-if="activo" class="panel-mayorista">
      <div class="info-alert">
        <p>
          <strong>💡 Modo Packs de Cantidad:</strong>
          Permite al cliente elegir un paquete cerrado (ej. 1 calendario a $1.500, 50 a $17.000, 100 a $30.000).
          Además, el cliente podrá sumar múltiples packs al carrito (ej. 2 packs de 100 = 200 unidades).
        </p>
      </div>

      <!-- Sección de Diseños / Variantes Opcionales -->
      <div class="subseccion-disenos">
        <label class="seccion-label">🎨 Diseños o Modelos Disponibles (Opcional):</label>
        <p class="seccion-desc">
          Si el producto tiene modelos a elegir (ej: "Calendario BTS 2026", "Calendario Stray Kids"), agrégalos aquí. El cliente elegirá uno antes de comprar.
        </p>
        <div class="diseno-input-row">
          <input
            type="text"
            v-model="nuevoDisenoInput"
            @keydown.enter.prevent="agregarDiseno"
            placeholder="Ej: Versión Jin, Modelo Holográfico..."
            class="input-diseno"
          />
          <button type="button" @click="agregarDiseno" class="btn-secundario">
            + Añadir Modelo
          </button>
        </div>

        <div v-if="disenos && disenos.length > 0" class="badges-disenos">
          <span v-for="(diseno, index) in disenos" :key="index" class="badge-item">
            {{ diseno }}
            <button type="button" @click="eliminarDiseno(index)" class="btn-cerrar" title="Eliminar">&times;</button>
          </span>
        </div>
      </div>

      <!-- Tabla de Packs -->
      <div class="subseccion-packs">
        <label class="seccion-label">📊 Configurar Paquetes de Cantidad:</label>
        <div class="tabla-contenedor">
          <table class="tabla-packs">
            <thead>
              <tr>
                <th>Cantidad (Uds)</th>
                <th>Precio Total Pack (CLP)</th>
                <th>Precio Unitario</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!paquetes || paquetes.length === 0">
                <td colspan="4" class="fila-vacia">
                  No hay packs configurados. Haz clic en "+ Agregar Pack" para definir el primero (ej. 1 unidad).
                </td>
              </tr>
              <tr v-for="(pkg, index) in paquetes" :key="index">
                <td>
                  <input
                    type="number"
                    :value="pkg.quantity"
                    @input="actualizarCantidad(index, $event.target.value)"
                    min="1"
                    step="1"
                    placeholder="Ej: 50"
                    class="input-tabla"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    :value="pkg.total_price"
                    @input="actualizarPrecio(index, $event.target.value)"
                    min="1"
                    step="1"
                    placeholder="Ej: 17000"
                    class="input-tabla"
                  />
                </td>
                <td>
                  <span class="badge-unitario">{{ calcularUnitario(pkg) }}</span>
                </td>
                <td class="col-accion">
                  <button
                    type="button"
                    @click="eliminarPaquete(index)"
                    class="btn-eliminar-fila"
                    title="Eliminar este pack"
                  >
                    &times;
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <button type="button" @click="agregarPaquete" class="btn-secundario btn-agregar-pack">
          + Agregar Pack de Cantidad
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.configurador-mayorista {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.panel-mayorista {
  background-color: #fdfbf7;
  border: 1px solid #f2e2cf;
  border-left: 4px solid #ff7b00;
  border-radius: 8px;
  padding: 18px;
  margin-top: 10px;
}

.info-alert {
  background-color: #fff9f0;
  border: 1px solid #ffe8cc;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 0.9em;
  color: #7a4600;
  margin-bottom: 16px;
}

.info-alert p {
  margin: 0;
  line-height: 1.4;
}

.subseccion-disenos {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px dashed #e6d3c0;
}

.seccion-label {
  display: block;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
  font-size: 0.95em;
}

.seccion-desc {
  font-size: 0.85em;
  color: #666;
  margin-top: 0;
  margin-bottom: 10px;
}

.diseno-input-row {
  display: flex;
  gap: 10px;
}

.input-diseno {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.9em;
}

.badges-disenos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.badge-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: #fff3e0;
  color: #d85c00;
  border: 1px solid #ffd099;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 500;
}

.btn-cerrar {
  background: none;
  border: none;
  color: #d85c00;
  font-size: 1.2em;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

.tabla-contenedor {
  overflow-x: auto;
  margin-top: 8px;
}

.tabla-packs {
  width: 100%;
  border-collapse: collapse;
  background-color: #fff;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.tabla-packs th {
  background-color: #faf5ee;
  color: #555;
  font-weight: 600;
  text-align: left;
  padding: 10px 12px;
  font-size: 0.85em;
  border-bottom: 2px solid #eee;
}

.tabla-packs td {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}

.fila-vacia {
  text-align: center;
  color: #888;
  padding: 20px !important;
  font-size: 0.9em;
  font-style: italic;
}

.input-tabla {
  width: 100%;
  max-width: 140px;
  padding: 7px 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 0.9em;
}

.input-tabla:focus {
  border-color: #ff7b00;
  outline: none;
}

.badge-unitario {
  display: inline-block;
  background-color: #f1f8e9;
  color: #2e7d32;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
}

.col-accion {
  text-align: center;
  width: 40px;
}

.btn-eliminar-fila {
  background: none;
  border: none;
  color: #d32f2f;
  font-size: 1.4em;
  cursor: pointer;
  line-height: 1;
  padding: 4px;
}

.btn-eliminar-fila:hover {
  transform: scale(1.2);
}

.btn-secundario {
  background-color: #fff;
  border: 1px solid #ff7b00;
  color: #ff7b00;
  padding: 8px 14px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85em;
  transition: all 0.2s ease;
}

.btn-secundario:hover {
  background-color: #ff7b00;
  color: #fff;
}

.btn-agregar-pack {
  margin-top: 12px;
}
</style>
