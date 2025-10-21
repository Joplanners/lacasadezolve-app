<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { supabase } from '@/lib/supabaseClient'
// BORRA O COMENTA la siguiente línea porque FontAwesomeIcon es global:
// import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

const route = useRoute()
const router = useRouter()
const toast = useToast()

const orderId = ref(route.params.orderId)
const orderDetails = ref(null)
const selectedFile = ref(null)
const isUploading = ref(false)
const proofUploaded = ref(false)

// --- Función handleFileChange (sin cambios) ---
function handleFileChange(event) {
  // ... (código sin cambios)
  const file = event.target.files[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      toast.error('El archivo es muy grande (máx 5MB).')
      selectedFile.value = null
      event.target.value = null
      return
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato no permitido (solo JPG, PNG, PDF).')
      selectedFile.value = null
      event.target.value = null
      return
    }
    selectedFile.value = file
  } else {
    selectedFile.value = null
  }
}

// --- Función handleUploadProof (sin cambios) ---
async function handleUploadProof() {
  // ... (código sin cambios)
  if (!selectedFile.value) {
    toast.warning('Por favor, selecciona el archivo de tu comprobante.')
    return
  }
  if (!orderId.value) {
    toast.error('ID de pedido inválido. No se puede subir el comprobante.')
    return
  }

  isUploading.value = true
  toast.info('Subiendo comprobante...')

  try {
    const fileExtension = selectedFile.value.name.split('.').pop()
    const fileName = `comprobante-${orderId.value}-${Date.now()}.${fileExtension}`
    const filePath = `${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(filePath, selectedFile.value)

    if (uploadError) throw uploadError

    console.log('Archivo subido con éxito a Supabase Storage:', uploadData)

    const { data: updateData, error: updateError } = await supabase
      .from('orders')
      .update({
        comprobante_url: uploadData.path,
        status: 'pending_verification',
      })
      .eq('id', orderId.value)
      .select('id, status, comprobante_url')
      .single()

    if (updateError) throw updateError

    console.log('Pedido actualizado en la base de datos:', updateData)

    proofUploaded.value = true
    toast.success('¡Comprobante subido con éxito! Verificaremos tu pago pronto.')
    selectedFile.value = null
  } catch (error) {
    console.error('Error detallado en handleUploadProof:', error)
    let errorMessage = 'Hubo un error al subir el comprobante. Intenta de nuevo.'
    if (error instanceof Error && error.message) {
      if (error.message.includes('mime type'))
        errorMessage = 'Tipo de archivo no permitido por el bucket.'
      else if (error.message.includes('size'))
        errorMessage = 'El archivo supera el tamaño máximo permitido.'
      else errorMessage = `Error: ${error.message}`
    } else if (typeof error === 'object' && error?.message) {
      errorMessage = `Error: ${error.message}`
    }
    toast.error(errorMessage)

    if (error.message.includes('actualizar el estado')) {
      try {
        console.warn('Fallo al actualizar DB, pero archivo podría haber subido.')
      } catch (removeError) {
        console.error('Error en rollback manual:', removeError)
      }
    }
  } finally {
    isUploading.value = false
  }
}

// --- onMounted (DESCOMENTADO y funcional) ---
onMounted(async () => {
  if (!orderId.value) {
    toast.error('ID de pedido inválido.')
    router.replace({ name: 'home' })
    return
  }
  console.log(`Cargando instrucciones para pedido: ${orderId.value}`)

  // Verificar si ya existe comprobante
  try {
    const { data: orderData, error } = await supabase
      .from('orders')
      .select('comprobante_url')
      .eq('id', orderId.value)
      .single()

    if (error && error.code !== 'PGRST116') {
      // Ignora error "No rows found"
      throw error
    }

    if (orderData && orderData.comprobante_url) {
      console.log('Comprobante ya existe para este pedido:', orderData.comprobante_url)
      proofUploaded.value = true
      toast.info('Ya has subido un comprobante para este pedido.')
    } else {
      console.log('No se encontró comprobante previo para este pedido.')
    }
  } catch (err) {
    console.error('Error al verificar comprobante existente:', err)
  }
})
</script>

<template>
  <div class="transfer-pending-container">
    <h1>¡Pedido Recibido! Pendiente de Pago</h1>
    <p class="order-id-display">
      Número de Pedido: <strong>{{ orderId }}</strong>
    </p>

    <div class="instructions-section">
      <h2>Instrucciones para Transferencia Bancaria</h2>
      <p>
        Por favor, realiza la transferencia con los siguientes datos y luego sube tu comprobante.
      </p>

      <div class="bank-details">
        <p><strong>Beneficiario:</strong> La Casa de Zolve SpA</p>
        <p><strong>RUT:</strong> 77.446.775-0</p>
        <p><strong>Banco:</strong> Banco de Chile</p>
        <p><strong>Tipo de Cuenta:</strong> Cuenta vista</p>
        <p><strong>Número de Cuenta:</strong> 495325273</p>
        <p><strong>Correo Electrónico:</strong> pagos@lacasadezolve.com</p>
        <p><strong>Asunto/Comentario:</strong> Pago Pedido {{ orderId }}</p>
      </div>

      <p v-if="orderDetails" class="total-amount">
        Monto a Transferir: <strong>{{ formatPrice(orderDetails.total_amount) }}</strong>
      </p>
    </div>

    <div class="upload-section">
      <h2>Sube tu Comprobante</h2>
      <p>
        Una vez realizada la transferencia, adjunta aquí el comprobante (JPG, PNG o PDF, máx 5MB).
      </p>

      <div v-if="proofUploaded" class="proof-uploaded-feedback">
        <p>✅ ¡Ya subiste un comprobante para este pedido!</p>
        <p>Lo verificaremos pronto.</p>
      </div>
      <template v-else>
        <div class="file-input-wrapper">
          <label for="proofFile" class="btn btn-secondary">
            {{ selectedFile ? 'Cambiar Archivo' : 'Seleccionar Archivo' }}
          </label>
          <input
            type="file"
            id="proofFile"
            @change="handleFileChange"
            accept=".jpg,.jpeg,.png,.pdf"
          />
          <span v-if="selectedFile" class="file-name">{{ selectedFile.name }}</span>
        </div>

        <button
          @click="handleUploadProof"
          class="btn btn-primary btn-upload"
          :disabled="!selectedFile || isUploading"
        >
          {{ isUploading ? 'Subiendo...' : 'Subir Comprobante' }}
        </button>
      </template>

      <p class="verification-notice">
        Verificaremos tu pago dentro de las próximas 24-48 horas hábiles. Recibirás un correo de
        confirmación una vez aprobado.
      </p>

      <div class="contact-links-container">
        <p>Si tienes dudas, contáctanos:</p>
        <a href="mailto:contacto@lacasadezolve.com" class="contact-link"
          >contacto@lacasadezolve.com</a
        >
        |
        <a
          href="https://wa.me/56936649482"
          target="_blank"
          rel="noopener noreferrer"
          class="contact-link"
          >WhatsApp</a
        >
      </div>
    </div>

    <div class="back-home">
      <router-link :to="{ name: 'home' }" class="btn btn-tertiary">Volver al Inicio</router-link>
    </div>
  </div>
</template>

<style scoped>
.transfer-pending-container {
  max-width: 700px;
  margin: 30px auto;
  padding: 30px;
  background-color: var(--color-background-soft);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

h1 {
  text-align: center;
  color: var(--brand-orange); /* Naranja para "pendiente" */
  margin-bottom: 10px;
}

.order-id-display {
  text-align: center;
  font-size: 1.1rem;
  color: var(--color-text-soft);
  margin-bottom: 30px;
}
.order-id-display strong {
  color: var(--color-text);
  font-family: monospace; /* Para que el ID se vea como código */
}

.instructions-section,
.upload-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px dashed var(--color-border-hover);
}
.upload-section {
  border-bottom: none; /* Sin borde en la última */
  padding-bottom: 0;
}

h2 {
  font-size: 1.4rem;
  color: var(--color-heading);
  margin-bottom: 15px;
}

.bank-details {
  background-color: var(--color-background);
  padding: 15px 20px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  margin-bottom: 15px;
}
.bank-details p {
  margin: 8px 0;
  line-height: 1.5;
}
.bank-details strong {
  display: inline-block;
  min-width: 110px; /* Alinea los dos puntos */
}

/* Estilos para el input de archivo personalizado */
.file-input-wrapper {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap; /* Para móvil */
}
/* Oculta el input real */
.file-input-wrapper input[type='file'] {
  display: none;
}
/* Estilo del botón falso */
.file-input-wrapper label.btn {
  cursor: pointer;
  flex-shrink: 0; /* Evita que se achique */
}
.file-name {
  font-style: italic;
  color: var(--color-text-soft);
  word-break: break-all; /* Evita desbordamiento */
}

.btn-upload {
  display: block; /* Ocupa ancho completo */
  width: 100%;
  padding: 12px;
  font-size: 1.1rem;
  margin-bottom: 20px;
}
.btn-upload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.verification-notice,
.upload-section p:last-of-type {
  font-size: 0.9rem;
  color: var(--color-text-soft);
  text-align: center;
  margin-bottom: 10px;
}
.contact-link {
  color: var(--brand-turquoise);
  text-decoration: underline;
  font-weight: 500;
}
.contact-link:hover {
  color: var(--brand-pink);
}

.back-home {
  margin-top: 30px;
  text-align: center;
}
/* Botones (reutilizados) */
.btn {
  display: inline-block;
  text-align: center;
  text-decoration: none;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-primary {
  background-color: var(--brand-pink);
  color: white;
}
.btn-primary:hover:not(:disabled) {
  background-color: #e65c7a;
  transform: translateY(-2px);
}
.btn-secondary {
  background-color: var(--brand-turquoise);
  color: white;
}
.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-link-hover);
}
.btn-tertiary {
  background-color: transparent;
  color: var(--color-link);
  border: 1px solid var(--color-border);
} /* Nuevo estilo para volver */
.btn-tertiary:hover {
  background-color: var(--color-background-mute);
}

.contact-links-container {
  text-align: center; /* Centra el contenido */
  margin-top: 15px; /* Añade espacio arriba */
}
.contact-links-container p {
  font-size: 0.9rem;
  color: var(--color-text-soft);
  margin-bottom: 5px; /* Espacio entre texto y enlaces */
}
/* Responsive */
@media (max-width: 600px) {
  .transfer-pending-container {
    padding: 20px;
  }
  h1 {
    font-size: 1.5rem;
  }
  h2 {
    font-size: 1.2rem;
  }
  .bank-details strong {
    min-width: 90px;
  } /* Ajuste para móvil */
}
</style>
