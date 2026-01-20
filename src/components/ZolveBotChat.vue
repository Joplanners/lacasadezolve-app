<template>
  <div class="zolve-bot-widget-container">
    <!-- Ventana del Chat -->
    <transition name="chat-window-fade">
      <div v-if="isChatOpen" class="chat-window">
        <div class="chat-header">
          <img src="/zolve-chat-icon.png" alt="Zolve Icon" class="header-icon" />
          <span>Zolve Bot</span>
          <button @click="closeChat" class="close-chat-btn" aria-label="Cerrar chat">×</button>
        </div>

        <div class="chat-body" ref="chatBodyRef">
          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="['message', message.sender]"
          >
            <p v-html="formatMessage(message.text)"></p>
          </div>
          <div v-if="isLoading" class="message bot loading">
            <p>Zolve está pensando...</p>
          </div>
        </div>

        <div class="chat-footer">
          <input
            type="text"
            v-model="userInput"
            :placeholder="inputPlaceholder"
            @keyup.enter="handleSendMessage"
            :disabled="isLoading"
            ref="userInputRef"
          />
          <button @click="handleSendMessage" :disabled="isLoading || !userInput.trim()">
            Enviar
          </button>
        </div>
      </div>
    </transition>

    <!-- Botón Flotante para abrir el chat -->
    <transition name="fab-fade">
      <div v-if="!isChatOpen" @click="openChat" class="fab-container">
        <div class="fab-text">¿Tienes preguntas?</div>

        <button class="chat-fab" aria-label="Abrir chat de ZolveBot">
          <img src="/zolve-chat-icon.png" alt="Abrir Chat" />
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, computed, onMounted } from 'vue'
import { useProductsStore } from '@/stores/storeProducts'

const productsStore = useProductsStore()

const isChatOpen = ref(false)
const messages = ref([])
const userInput = ref('')
const isLoading = ref(false)
const chatBodyRef = ref(null)
const userInputRef = ref(null)

const userName = ref('') // Puedes mantenerlo si quieres usar el nombre en el saludo o lógica del frontend
const awaitingName = ref(true) // Para controlar el placeholder del input

// --- SYSTEM PROMPT (DEBE ESTAR DEFINIDO AQUÍ) ---
// Asegúrate de que esta constante exista y tenga tu prompt completo.
// Si es muy largo, considera importarlo desde otro archivo .js para mantener este más limpio.
// --- SYSTEM PROMPT DINÁMICO ---
// --- SYSTEM PROMPT DINÁMICO ---
const dynamicProductList = computed(() => {
  const products = productsStore.products
  if (!products || products.length === 0) return 'Por el momento no tengo la lista de precios a mano, pero pregúntame y te ayudo.'
  
  const baseUrl = window.location.origin
  // Listar: Nombre: $Precio - [Ver detalle](url)
  return products
    .filter(p => p.is_active)
    .map(p => `- ${p.name}: $${p.price?.toLocaleString('es-CL') || 'Consultar'} - [Ver detalle](${baseUrl}/producto/${p.id})`)
    .join('\n')
})

const dynamicCategoryList = computed(() => {
  const categories = productsStore.categories
  if (!categories || categories.length === 0) return ''
  return categories.map(c => `- ${c.name}`).join('\n')
})

const SYSTEM_PROMPT_ZOLVE = computed(() => `Eres Zolve 🦊, el asistente inteligente, amigable y astuto de la tienda online 'La Casa de Zolve'.
Tu misión: Ayudar con consultas sobre productos, precios, envíos, contacto y guiar en el proceso de compra.

**INSTRUCCIÓN INICIAL:**
Siempre saluda con energía. Si no sabes el nombre del usuario, pregúntalo amablemente.

**CATEGORÍAS DE PRODUCTOS DISPONIBLES:**
${dynamicCategoryList.value}

**LISTA DE PRODUCTOS Y PRECIOS ACTUALIZADOS (CLP):**
${dynamicProductList.value}

**INFORMACIÓN CLAVE DEL NEGOCIO:**
1. **Personalización:**
   - La mayoría de nuestros productos (cuadernos, agendas, planners) son 100% personalizables.
   - El cliente puede subir sus imágenes directamente en la web al hacer el pedido.
   - Si tienen dudas o archivos complejos, pueden contactarnos.
   - **Contacto Directo:**
     - WhatsApp: +56 9 3664 9482
     - Instagram: @zolve_fox
     - Correo: contacto@lacasadezolve.com
     - O el formulario de contacto en la web.

2. **Pagos:**
   - Aceptamos **WebPay** (tarjetas débito/crédito) y **Transferencia Bancaria**.
   - Damos boleta en todas las compras.

3. **Envíos y Entregas:**
   - **Envíos a Domicilio:** A todo Chile (vía Starken, por pagar).
   - **Retiro Presencial:** Gratis en Santiago. Previa coordinación en estaciones de Metro **La Cisterna** o **Einstein**.

4. **Tiempos de Producción:**
   - Nuestros productos son hechos a mano con amor. El tiempo de confección es de **3 días hábiles** una vez confirmado el pago y diseño.

**TU PERSONALIDAD:**
- Tono: Cercano, chileno neutro, alegre, usas emojis (🦊✨).
- **IMPORTANTE:** NO menciones servicios de Realidad Aumentada (AR), ese servicio ya no está disponible.
- Si no sabes algo: "Esa es una buena pregunta 🦊. Escríbenos al WhatsApp +56 9 3664 9482 o a contacto@lacasadezolve.com y mis amigos humanos te ayudarán".

**FORMATO RESPUESTA:**
- Usa **negritas** para destacar precios o datos claves.
- Si sugieres un producto, usa el enlace proporcionado para que el usuario pueda verlo.
- Sé conciso.
`)

onMounted(async () => {
  // Cargar productos y categorías
  await Promise.all([
    productsStore.fetchAllProducts(),
    productsStore.fetchCategories()
  ])
})
// --- FIN SYSTEM PROMPT ---

const inputPlaceholder = computed(() => {
  return awaitingName.value ? 'Escribe tu nombre aquí...' : 'Escribe tu mensaje...'
})

const addMessage = (sender, text) => {
  messages.value.push({ sender, text })
  nextTick(() => {
    scrollToBottom()
  })
}

const openChat = async () => {
  isChatOpen.value = true
  awaitingName.value = true // Asumimos que siempre pedimos el nombre al abrir
  messages.value = [] // Limpiar historial al abrir

  // El backend manejará el primer saludo si es una respuesta predefinida a "hola"
  // o si la IA está instruida a saludar.
  // Para controlar explícitamente el primer mensaje del bot desde el frontend:
  addMessage(
    'bot',
    '¡Hola! Soy Zolve 🦊. Para una atención más personalizada, ¿me podrías decir tu nombre?',
  )
  // Si prefieres que el saludo inicial venga del backend (para ahorrar una llamada si es predefinido):
  // Podrías enviar un mensaje "inicial" al backend aquí, o simplemente esperar a que el usuario escriba.
  // Por ahora, mantenemos el saludo desde el frontend para consistencia con tu diseño original.

  await nextTick()
  if (userInputRef.value) {
    userInputRef.value.focus()
  }
}

const closeChat = () => {
  isChatOpen.value = false
  // No necesitamos limpiar la sesión de chat aquí porque se maneja en el backend por solicitud
}

const scrollToBottom = () => {
  if (chatBodyRef.value) {
    chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
  }
}

const formatMessage = (text) => {
  if (typeof text !== 'string') return ''
  
  let formatted = text
    // Seguridad básica (escapar HTML) - opcional, pero buena práctica si el input viene de fuera
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    
    // Negrita: **texto** -> <strong>texto</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // Cursiva: *texto* -> <em>texto</em>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Enlaces Markdown: [texto](url) -> <a href="url" ...>texto</a>
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g, 
      '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--brand-pink, #f06292); text-decoration: underline;">$1</a>'
    )
    
    // Saltos de línea
    .replace(/\n/g, '<br>')

  return formatted
}

const handleSendMessage = async () => {
  const text = userInput.value.trim()
  if (!text || isLoading.value) return

  addMessage('user', text)
  const currentInput = userInput.value
  userInput.value = ''
  isLoading.value = true

  // Construir el historial para el backend
  // Filtra el saludo inicial del bot si lo añades manualmente en `openChat`
  // y no quieres que sea parte del historial enviado a la IA para su *primera* respuesta real.
  // Si tu backend maneja el saludo o si la IA lo debe considerar, puedes ajustar esto.
  const historyForBackend = messages.value
    .slice(0, -1) // No incluye el mensaje actual del usuario que va en userPrompt
    .filter((msg) => !(msg.sender === 'bot' && msg.text.startsWith('¡Hola! Soy Zolve 🦊.'))) // Ejemplo de filtro
    .map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model', // 'model' es para la IA
      parts: [{ text: msg.text }],
    }))

  try {
    const backendUrl = '/.netlify/functions/chat'

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt: SYSTEM_PROMPT_ZOLVE.value, // Enviar valor .value del computed
        chatHistory: historyForBackend,
        userPrompt: currentInput,
      }),
    })

    isLoading.value = false

    if (!response.ok) {
      let errorDetail = `Status: ${response.status} ${response.statusText}`
      try {
        const errorData = await response.json()
        errorDetail = errorData.error || errorData.details || errorDetail
      } catch {
        // No se pudo parsear JSON, usar el statusText
      }
      console.error('Error desde el backend:', errorDetail)
      addMessage('bot', `Zorry 🦊, algo no salió bien al contactar a mi cerebro: ${errorDetail}`)
      return
    }

    const data = await response.json()

    if (data.text) {
      addMessage('bot', data.text)
      if (awaitingName.value && messages.value.filter((m) => m.sender === 'user').length === 1) {
        // Si es la primera respuesta del usuario Y estábamos esperando el nombre.
        // La IA (o el backend con respuesta predefinida) debería haber respondido al nombre.
        userName.value = currentInput // O una extracción más inteligente del nombre
        awaitingName.value = false // Ya no esperamos el nombre
      }
    } else if (data.error) {
      console.error('Error reportado por el backend:', data.error)
      addMessage('bot', `🦊 Zorry, mi cerebro tuvo un pequeño hipo: ${data.error}`)
    } else {
      addMessage(
        'bot',
        'Recibí una respuesta un poco extraña de mi cerebro esta vez. ¿Podrías intentarlo de nuevo? 🦊',
      )
    }
  } catch (error) {
    console.error('Error de red o excepción al llamar al backend:', error)
    isLoading.value = false
    addMessage(
      'bot',
      `¡Uy! Parece que hay un problemita técnico para conectarme (¿mi servidor estará corriendo?). Intenta más tarde. 🦊`,
    )
  } finally {
    await nextTick()
    if (userInputRef.value && isChatOpen.value) {
      userInputRef.value.focus()
    }
  }
}

watch(isChatOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      if (userInputRef.value) {
        userInputRef.value.focus()
      }
    })
  }
})
</script>

<style scoped>
/* Contenedor principal del widget */
.zolve-bot-widget-container {
  position: fixed;
  bottom: 25px;
  right: 25px;
  z-index: 1050;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
}

/* Botón Flotante (FAB) */
.chat-fab {
  background-color: var(
    --brand-pink,
    #f06292
  ); /* Color por defecto si no están las variables CSS */
  color: var(--vt-c-white, #ffffff);
  border: 2px solid var(--vt-c-white, #ffffff);
  border-radius: 50%;
  width: 65px;
  height: 65px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  transition:
    transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
    background-color 0.2s ease;
  padding: 0;
  outline: none;
}
.chat-fab:hover {
  background-color: #e65c7a; /* Un tono más oscuro de rosa */
  transform: scale(1.1);
}
.chat-fab img {
  width: 55px;
  height: 55px;
  border-radius: 50%;
  object-fit: cover;
}

/* Ventana del Chat */
.chat-window {
  width: 360px;
  max-height: 70vh;
  min-height: 300px; /* Asegura una altura mínima */
  height: 480px; /* Altura fija, o puedes usar algo como `max-content` si prefieres que se ajuste */
  background-color: var(--color-background-soft, #f9f9f9);
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Para que el contenido interno no desborde los bordes redondeados */
  margin-bottom: 15px; /* Espacio entre la ventana y el botón FAB si ambos están visibles */
}

.chat-header {
  background: linear-gradient(135deg, var(--brand-pink, #f06292), #e65c7a);
  color: var(--vt-c-white, #ffffff);
  padding: 12px 18px;
  display: flex;
  align-items: center;
  font-weight: var(--font-weight-bold, bold);
  font-size: 1.1em;
  flex-shrink: 0; /* Evita que el header se encoja */
}
.header-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  margin-right: 10px;
  border: 1px solid rgba(255, 255, 255, 0.5);
}
.chat-header span {
  flex-grow: 1;
}
.close-chat-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.8em;
  cursor: pointer;
  line-height: 1; /* Ajusta para alinear mejor el '×' */
  padding: 0 5px;
  transition: color 0.2s ease;
}
.close-chat-btn:hover {
  color: var(--vt-c-white, #ffffff);
}

.chat-body {
  flex-grow: 1; /* Permite que el cuerpo del chat ocupe el espacio disponible */
  padding: 15px;
  overflow-y: auto; /* Habilita el scroll vertical cuando el contenido excede el alto */
  background-color: var(--color-background, #ffffff);
  color: var(--color-text, #333333);
  display: flex;
  flex-direction: column;
  gap: 10px; /* Espacio entre mensajes */
}

.message {
  padding: 10px 15px;
  border-radius: 18px;
  max-width: 85%;
  word-wrap: break-word; /* Evita que palabras largas rompan el layout */
  line-height: 1.4;
  font-size: 0.95em;
}
.message.user {
  background-color: var(--brand-turquoise, #4db6ac); /* Color por defecto */
  color: white;
  align-self: flex-end; /* Alinea los mensajes del usuario a la derecha */
  border-bottom-right-radius: 6px; /* Estilo de burbuja */
}
.message.bot {
  background-color: var(--color-background-mute, #eeeeee); /* Color por defecto */
  color: var(--color-text, #333333);
  align-self: flex-start; /* Alinea los mensajes del bot a la izquierda */
  border-bottom-left-radius: 6px; /* Estilo de burbuja */
}
.message.bot.loading p {
  font-style: italic;
  color: #777;
}

.chat-footer {
  border-top: 1px solid var(--color-border, #e0e0e0);
  padding: 12px 15px;
  display: flex;
  background-color: var(--color-background-soft, #f9f9f9);
  flex-shrink: 0; /* Evita que el footer se encoja */
}
.chat-footer input {
  flex-grow: 1;
  border: 1px solid var(--color-border-hover, #bdbdbd);
  border-radius: 20px;
  padding: 10px 15px;
  margin-right: 10px;
  font-size: 1em;
  font-family: var(--font-family-base, sans-serif); /* Fuente por defecto */
  outline-color: var(--brand-pink, #f06292); /* Color del outline al hacer foco */
}
.chat-footer input:disabled {
  background-color: var(--color-background-mute, #eeeeee);
  cursor: not-allowed;
}
.chat-footer button {
  background-color: var(--brand-pink, #f06292);
  color: var(--vt-c-white, #ffffff);
  border: none;
  border-radius: 20px;
  padding: 10px 18px;
  cursor: pointer;
  font-size: 1em;
  font-family: var(--font-family-base, sans-serif);
  font-weight: var(--font-weight-medium, 500);
  transition: background-color 0.2s ease;
}
.chat-footer button:hover:not(:disabled) {
  background-color: #e65c7a; /* Un tono más oscuro */
}
.chat-footer button:disabled {
  background-color: #f9a7b8; /* Un rosa más pálido para el estado desactivado */
  cursor: not-allowed;
}

/* Transiciones */
.fab-fade-enter-active,
.fab-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.fab-fade-enter-from,
.fab-fade-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
.chat-window-fade-enter-active,
.chat-window-fade-leave-active {
  transition:
    opacity 0.3s ease-out,
    transform 0.3s ease-out;
}
.chat-window-fade-enter-from,
.chat-window-fade-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}

/* Media Queries para Responsividad */
@media (max-width: 480px) {
  .zolve-bot-widget-container {
    bottom: 15px;
    right: 15px;
    left: 15px; /* Para que ocupe más ancho en móviles */
    align-items: center; /* Centra el FAB */
  }
  .chat-window {
    width: 100%; /* Ocupa todo el ancho disponible menos los márgenes del contenedor */
    max-width: none; /* Sobreescribe el max-width anterior */
    height: calc(
      100vh - 100px
    ); /* Ajusta la altura para móviles, dejando espacio para FAB y header del navegador */
    max-height: calc(100vh - 100px);
    margin-bottom: 10px; /* Menor margen en móviles */
    border-radius: 12px; /* Mantiene el borde redondeado */
  }
  .chat-fab {
    width: 55px;
    height: 55px;
  }
  .chat-fab img {
    width: 45px;
    height: 45px;
  }
}
/* Contenedor para el botón y el texto */
.fab-container {
  display: flex;
  align-items: center;
  gap: 12px; /* Espacio entre el texto y el botón */
  cursor: pointer; /* Para que toda el área se sienta clickeable */
}

/* Burbuja de texto */
.fab-text {
  background-color: var(--color-background, #ffffff);
  color: var(--color-text, #333333);
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-weight: 500;
  font-size: 0.95em;
  white-space: nowrap; /* Evita que el texto se parta en dos líneas */
}
</style>
