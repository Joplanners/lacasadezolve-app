<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { procesarPacks, formatearCLP } from '@/composables/usarPacksMayorista'
import { useToast } from 'vue-toastification'

const props = defineProps({
  producto: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['agregar-al-carrito'])

const toast = useToast()

const packsProcesados = computed(() => {
  return procesarPacks(props.producto?.print_quantity_packages)
})

const tieneDisenos = computed(() => {
  return (
    props.producto?.available_print_designs &&
    Array.isArray(props.producto.available_print_designs) &&
    props.producto.available_print_designs.length > 0
  )
})

const indicePackSeleccionado = ref(0)
const cantidadPacks = ref(1)
const disenoSeleccionado = ref('')

const packSeleccionado = computed(() => {
  if (packsProcesados.value.length === 0) return null
  return packsProcesados.value[indicePackSeleccionado.value] || packsProcesados.value[0]
})

const unidadesTotales = computed(() => {
  if (!packSeleccionado.value) return 0
  return packSeleccionado.value.quantity * cantidadPacks.value
})

const totalPrecioCLP = computed(() => {
  if (!packSeleccionado.value) return 0
  return packSeleccionado.value.total_price * cantidadPacks.value
})

function seleccionarPack(index) {
  indicePackSeleccionado.value = index
}

function incrementarPacks() {
  cantidadPacks.value++
}

function decrementarPacks() {
  if (cantidadPacks.value > 1) {
    cantidadPacks.value--
  }
}

function handleAgregar() {
  if (!packSeleccionado.value) {
    toast.error('Por favor, selecciona un pack de cantidad.')
    return
  }

  if (tieneDisenos.value && !disenoSeleccionado.value) {
    toast.error('Por favor, selecciona un diseño o modelo antes de continuar.')
    return
  }

  emit('agregar-al-carrito', {
    pack: packSeleccionado.value,
    cantidadPacks: cantidadPacks.value,
    diseno: disenoSeleccionado.value || null,
    precioTotal: totalPrecioCLP.value,
    unidadesTotales: unidadesTotales.value,
  })
}

// Inicializar selección
onMounted(() => {
  if (packsProcesados.value.length > 0) {
    indicePackSeleccionado.value = 0
  }
})

watch(
  () => props.producto,
  () => {
    if (packsProcesados.value.length > 0) {
      indicePackSeleccionado.value = 0
    }
  },
  { deep: true },
)
</script>

<template>
  <div class="selector-packs-mayorista" v-if="packsProcesados.length > 0">
    <!-- Selector de Diseños si existen -->
    <div v-if="tieneDisenos" class="bloque-opcion">
      <label class="titulo-opcion">🎨 Elige tu Modelo / Diseño:</label>
      <select v-model="disenoSeleccionado" class="select-diseno">
        <option value="" disabled>Selecciona una opción...</option>
        <option v-for="diseno in producto.available_print_designs" :key="diseno" :value="diseno">
          {{ diseno }}
        </option>
      </select>
    </div>

    <!-- Botones estilo AliExpress para Packs -->
    <div class="bloque-opcion">
      <div class="header-packs">
        <label class="titulo-opcion">📦 Selecciona el Pack de Cantidad:</label>
        <span class="badge-aliexpress">Venta por mayor disponible</span>
      </div>

      <div class="grid-packs">
        <button
          v-for="(pkg, idx) in packsProcesados"
          :key="idx"
          type="button"
          class="card-pack"
          :class="{ seleccionado: indicePackSeleccionado === idx }"
          @click="seleccionarPack(idx)"
        >
          <div class="badge-ahorro" v-if="pkg.porcentajeAhorro > 0">
            Ahorras {{ pkg.porcentajeAhorro }}%
          </div>
          <div class="pack-cantidad">{{ pkg.quantity }} {{ pkg.quantity === 1 ? 'unidad' : 'unidades' }}</div>
          <div class="pack-precio">{{ formatearCLP(pkg.total_price) }}</div>
          <div class="pack-unitario">{{ formatearCLP(pkg.unitPrice) }} c/u</div>
        </button>
      </div>
    </div>

    <!-- Selector de Cantidad de Packs -->
    <div class="bloque-opcion bloque-cantidad-packs">
      <div class="controles-cantidad-wrapper">
        <label class="titulo-opcion">¿Cuántos packs llevarás?</label>
        <div class="stepper-packs">
          <button
            type="button"
            class="btn-stepper"
            @click="decrementarPacks"
            :disabled="cantidadPacks <= 1"
          >
            -
          </button>
          <span class="cantidad-display">{{ cantidadPacks }} {{ cantidadPacks === 1 ? 'pack' : 'packs' }}</span>
          <button type="button" class="btn-stepper" @click="incrementarPacks">
            +
          </button>
        </div>
      </div>

      <!-- Resumen en vivo de unidades -->
      <p class="detalle-unidades" v-if="packSeleccionado">
        Recibirás en total: <strong>{{ unidadesTotales }} unidades</strong>
        <span v-if="cantidadPacks > 1">({{ cantidadPacks }} packs de {{ packSeleccionado.quantity }} uds)</span>
      </p>
    </div>

    <!-- Barra de Total y Botón de Compra -->
    <div class="resumen-compra-pack">
      <div class="precio-final-col">
        <span class="label-subtotal">Total por {{ cantidadPacks }} {{ cantidadPacks === 1 ? 'pack' : 'packs' }}:</span>
        <span class="monto-total">{{ formatearCLP(totalPrecioCLP) }} CLP</span>
      </div>
      <button type="button" class="btn-comprar-pack" @click="handleAgregar">
        🛒 Añadir al carrito
      </button>
    </div>
  </div>
</template>

<style scoped>
.selector-packs-mayorista {
  background: #ffffff;
  border: 1px solid #ffe0b2;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 4px 14px rgba(255, 145, 0, 0.08);
}

.bloque-opcion {
  margin-bottom: 20px;
}

.header-packs {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.titulo-opcion {
  font-size: 0.95em;
  font-weight: 700;
  color: #2c3e50;
  display: block;
  margin: 0;
}

.badge-aliexpress {
  background-color: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.78em;
  font-weight: 600;
}

.select-diseno {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fbfbfb;
  font-size: 0.95em;
  color: #333;
  margin-top: 8px;
  transition: border-color 0.2s ease;
  cursor: pointer;
}

.select-diseno:focus {
  border-color: #ff9100;
  outline: none;
}

/* Grilla de packs estilo AliExpress */
.grid-packs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
}

.card-pack {
  position: relative;
  background-color: #fff;
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  padding: 14px 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.card-pack:hover {
  border-color: #ffb74d;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
}

.card-pack.seleccionado {
  border-color: #e65100;
  background-color: #fff8e1;
  box-shadow: 0 0 0 1px #e65100, 0 4px 12px rgba(230, 81, 0, 0.15);
}

.badge-ahorro {
  position: absolute;
  top: -8px;
  right: -6px;
  background: linear-gradient(135deg, #ff5722, #e65100);
  color: #ffffff;
  font-size: 0.68em;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(230, 81, 0, 0.3);
}

.pack-cantidad {
  font-size: 0.95em;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.pack-precio {
  font-size: 1.1em;
  font-weight: 800;
  color: #e65100;
  margin-bottom: 2px;
}

.pack-unitario {
  font-size: 0.78em;
  color: #666;
}

/* Stepper de cantidad de packs */
.bloque-cantidad-packs {
  background-color: #fafafa;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.controles-cantidad-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.stepper-packs {
  display: inline-flex;
  align-items: center;
  border: 2px solid #ddd;
  border-radius: 8px;
  background-color: #fff;
  overflow: hidden;
}

.btn-stepper {
  background-color: #f7f7f7;
  border: none;
  width: 38px;
  height: 38px;
  font-size: 1.2em;
  font-weight: bold;
  color: #444;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-stepper:hover:not(:disabled) {
  background-color: #ff9100;
  color: #fff;
}

.btn-stepper:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cantidad-display {
  padding: 0 16px;
  font-weight: 700;
  font-size: 0.95em;
  color: #222;
  min-width: 80px;
  text-align: center;
}

.detalle-unidades {
  margin: 10px 0 0 0;
  font-size: 0.88em;
  color: #555;
}

.detalle-unidades strong {
  color: #e65100;
}

/* Resumen final */
.resumen-compra-pack {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px dashed #ffd59e;
  gap: 15px;
  flex-wrap: wrap;
}

.precio-final-col {
  display: flex;
  flex-direction: column;
}

.label-subtotal {
  font-size: 0.82em;
  color: #777;
}

.monto-total {
  font-size: 1.45em;
  font-weight: 900;
  color: #e65100;
}

.btn-comprar-pack {
  flex: 1;
  min-width: 180px;
  background: linear-gradient(135deg, #ff7b00, #e65100);
  color: #fff;
  border: none;
  padding: 13px 20px;
  border-radius: 8px;
  font-size: 1.05em;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(230, 81, 0, 0.25);
  transition: all 0.2s ease;
}

.btn-comprar-pack:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(230, 81, 0, 0.35);
}

@media (max-width: 480px) {
  .grid-packs {
    grid-template-columns: repeat(2, 1fr);
  }
  .resumen-compra-pack {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-comprar-pack {
    width: 100%;
  }
}
</style>
