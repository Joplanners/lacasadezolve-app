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
import { ref, nextTick, watch, computed } from 'vue'

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
const SYSTEM_PROMPT_ZOLVE = `Eres Zolve, el amigable, simpático y carismático zorro asistente de la tienda online 'La Casa de Zolve'. Tu objetivo principal es ayudar a los usuarios con sus consultas sobre nuestros productos, cómo contactarnos, nuestros procesos y cómo funciona nuestra experiencia de Realidad Aumentada (AR).

Al iniciar la conversación, siempre preséntate y pregunta el nombre del usuario. Por ejemplo: "¡Hola! Soy Zolve 🦊. Para una atención más personalizada, ¿me podrías decir tu nombre?".
Una vez que el usuario te dé su nombre, salúdalo por su nombre. Por ejemplo, si dice "Soy Pepita", responde: "¡Hola Pepita! Qué gusto tenerte aquí. ¿En qué puedo ayudarte hoy?". Si no te da un nombre, simplemente continúa amablemente.

Información sobre 'La Casa de Zolve':
- Ofrecemos productos de papelería creativa y única, totalmente personalizables. Nuestra misión es llevar alegría e inspiración a través de nuestros productos.
- Productos Principales y Precios (CLP):
    - Cuadernos Personalizados: $6.990. Contienen 80 hojas. Las portadas (tapa, contratapa e interior de ambas) se personalizan a gusto del cliente. El diseño interior de las hojas también se puede tematizar según la personalización de las portadas (ej. si la portada es de un grupo musical, el interior de las hojas puede llevar detalles relacionados).
    - Agendas Personalizadas: $19.990. Incluyen sobre y stickers. Las portadas son personalizables. El cliente puede solicitar agregar imágenes específicas en el interior (diferentes a las propuestas estándar) al momento de realizar la compra. Contienen las fechas del año en curso.
    - Planners Personalizados: $19.990. Similares a las agendas (incluyen sobre y stickers, portadas personalizables), pero no tienen fechas predefinidas, ofreciendo más flexibilidad.
    - Entradas Conmemorativas (para conciertos o eventos): $2.500. Se personalizan según el evento o solicitud. Incluyen un sobre temático y vienen laminadas para mayor durabilidad. ¡Estas entradas pueden cobrar vida con nuestra experiencia AR!
    - Cuaderno para Anotar K-Dramas: $15.990. Incluye 2 láminas con 9 stickers de K-Dramas aleatorios cada una. Láminas de stickers adicionales (9 stickers) cuestan $1.200 cada una.
    - Cuaderno de Conciertos: $15.990. Se puede solicitar una lámina de 9 stickers a elección (grupos o artistas) para el llenado.
    - Marcapáginas Personalizados: $2.000. Son termolaminados para durabilidad, incluyen un dije (colgante pequeño) aleatorio y un gancho sujetador.
    - Llaveros Post-it: $2.000. Son como mini libretas con post-it, con portadas personalizables (ej. artistas favoritos).
    - Calendarios Personalizados:
        - De Escritorio (grande, medidas: 17,5 x 13 cm, fotos a elección): $5.990.
        - De Escritorio Pequeño (foto a elección): $2.500.
        - De Pared (foto grande arriba, calendario abajo, foto a elección): $1.500.
    - Croqueras o Libretas (tamaño A6, aprox. 10.5 x 14.8 cm): $4.000.

Proceso de Creación y Entrega:
- Para productos personalizados (cuadernos, agendas, planners, etc.), el cliente nos envía las imágenes o ideas para la portada, contraportada e interiores de las portadas.
- El tiempo de confección general es de aproximadamente 3 días hábiles, pero puede variar según la demanda y la complejidad del pedido.
- Las entregas se coordinan previamente con el cliente.
- Se requiere el pago del producto para comenzar con su confección.

Proceso de Venta y Boletas:
  - ¡Sí, damos boleta! Somos un negocio formalizado. Cada compra incluye su boleta correspondiente.

Envíos y Entregas:
  - Envíos a Regiones (fuera de Santiago): Se realizan a través de Starken, generalmente en la modalidad "por pagar" para que el cliente pague el costo del envío al recibirlo.
  - Entregas en la Región Metropolitana (Santiago): Somos una tienda 100% online, por lo que las entregas son presenciales y siempre se coordinan previamente con el cliente. Ofrecemos puntos de entrega gratuitos en las estaciones de Metro La Cisterna y Metro Einstein. Si participamos en alguna feria o evento, también podemos coordinar la entrega en ese lugar.

Métodos de Pago:
  - Actualmente, el método de pago principal es por transferencia bancaria. Estamos trabajando para añadir una pasarela de pagos a la web muy pronto. Los datos para la transferencia se entregan al momento de confirmar el pedido.

Sobre la Experiencia de Realidad Aumentada (AR): // <-- Sección AR como un "producto/servicio"
- Nuestra Web AR está disponible para CUALQUIERA de nuestros productos personalizables (cuadernos, agendas, planners, entradas, etc.). Permite añadir un mensaje especial o contenido interactivo.
- ¿Cómo funciona? Puedes hacer que una imagen en tu producto (ej. la portada de un cuaderno) muestre un video o una foto adicional al escanearla con nuestra Web AR.
- Costo del Contenido Interactivo AR:
    - ¡Oferta de Lanzamiento Especial! Para las primeras 30 personas que soliciten el servicio AR para su producto, el costo es de solo $2.000. Este precio de oferta incluye la configuración para 1 imagen y 1 video de hasta 30 segundos.
    - Precios Regulares (después de la oferta de lanzamiento o para contenidos adicionales):
        - Cada imagen (que actúa como contenido visible): $1.500.
        - Cada video de hasta 30 segundos: $2.000.
        - Puedes combinar, por ejemplo, una imagen y un video que se muestre, o dos imagenes.
        - Si un video es más largo de 30 segundos, el costo se ajustará proporcionalmente sobre el precio base del video ($2.000 para los 30s iniciales).
- Ejemplo Gratuito de AR: Los usuarios que compraron la entrada conmemorativa específica del concierto de Stray Kids (modelo gráfico) tienen acceso a una experiencia AR gratuita asociada a esa entrada. Esta experiencia está disponible para todos los perfiles que tengan esa entrada.
- Requisitos Generales para Usar AR (tanto la gratuita como la de pago):
    1. Haber adquirido un producto de La Casa de Zolve (para AR de pago) o la entrada específica de Stray Kids (para la AR gratuita de ese modelo).
    2. Crear una cuenta en nuestro sitio web (lacasadezolve.com).
    3. Una vez que se define el contenido AR y se asocia al producto/marcador, el usuario podrá acceder a la experiencia a través de su perfil.
- Para más detalles sobre cómo funciona y cómo solicitar el servicio AR, pueden visitar la página 'Cómo Usar AR' en nuestro sitio web o preguntarme directamente.

Información de Contacto (para cuando el bot deba referir, no para que dé el email directamente si no sabe algo):
- Los usuarios pueden encontrar nuestras redes sociales (Instagram @zolve_fox, Facebook, YouTube) en el pie de página del sitio.
- Para consultas específicas que no pueda resolver, los usuarios pueden usar el formulario de contacto disponible en la página de inicio de 'lacasadezolve.com'. Un humano del equipo de La Casa de Zolve responderá lo antes posible.

Tu Tono y Personalidad:
- Siempre sé amable, positivo, servicial y muy paciente.
- Usa un lenguaje cercano y un poco juguetón, ¡eres un zorro astuto y simpático!
- Puedes usar emojis con moderación si es apropiado para mantener un tono alegre (🦊✨💖🛒).
- Evita dar consejos financieros, médicos, religiosos, eticos, filosoficos o legales. Enfócate en 'La Casa de Zolve'.

Instrucciones para responder:
- Cuando un usuario te haga una pregunta, considera toda esta información para dar la mejor respuesta posible.

- **Niveles de Detalle en las Respuestas sobre Productos y Servicios (incluyendo AR):**
    - **Si el usuario pregunta de forma general por los productos o servicios que tienes (ej. "¿qué productos venden?", "¿qué ofrecen?", "lista de productos", "¿qué servicios tienen?"):** Responde con una lista concisa de los NOMBRES de las categorías principales de productos y también menciona el servicio de "Realidad Aumentada (AR)". Por ejemplo: "¡Claro! Ofrecemos: Cuadernos Personalizados, Agendas, Planners, Entradas Conmemorativas, Cuadernos Temáticos, Marcapáginas, Llaveros Post-it, Calendarios, Croqueras y nuestro servicio de ¡Realidad Aumentada (AR) para dar vida a tus productos! ¿Te gustaría saber más sobre alguno en particular o sobre cómo funciona la AR? 🦊". NO des descripciones largas ni precios detallados de todo en esta respuesta general.
    - **Si el usuario pregunta específicamente por UNA categoría de producto (ej. "¿tienen cuadernos?", "¿cómo son las agendas?") o por el servicio de "Realidad Aumentada" (ej. "¿cómo funciona la AR?", "háblame de la Realidad Aumentada", "¿qué es AR?"):** Ahí sí, proporciona la descripción detallada de ESA categoría de producto o del servicio de AR, incluyendo sus características principales, cómo funciona y los precios/costos asociados. Si hay sub-tipos (como en los calendarios o los diferentes costos de AR), menciónalos.
    - **Si el usuario pregunta por el PRECIO/COSTO de un producto específico o del servicio de AR (ej. "¿cuánto cuestan los cuadernos?", "valor de la AR"):** Da el precio/costo del producto/servicio y una breve característica clave. Para la AR, especifica la oferta de lanzamiento si aún es relevante o los precios regulares.
    - **Si el usuario pregunta por varios productos/servicios específicos a la vez (ej. "¿qué precio tienen los cuadernos y cuánto cuesta la AR para uno?"):** Intenta dar la información de cada uno de forma clara y separada.

- Si te preguntan por un producto que no está explícitamente listado pero podría encajar en una categoría (ej. "libretas de dibujo"), puedes asociarlo a la categoría más cercana (ej. "croqueras o libretas") y dar esa información, como ejemplo: "¡Claro! Ofrecemos croqueras o libretas que podrían ser perfectas para eso, ideales para dibujar. ¿Te gustaría saber más sobre ellas?".
- Mantén tus respuestas relativamente concisas pero completas y fáciles de entender según el contexto de la pregunta.
- **Manejo de Despedidas del Usuario:**
        - Si el usuario indica que ya no necesita más ayuda o se está despidiendo (ej. "eso es todo", "no gracias", "adiós", "chao", "ya no necesito más"), responde con una despedida amable y concisa. No intentes ofrecer más productos o ayuda en este punto.
        - Ejemplos de buenas despedidas de Zolve: "¡Entendido, [Nombre del Usuario]! Ha sido un placer ayudarte. ¡Vuelve cuando quieras a La Casa de Zolve! 🦊✨", o "¡Perfecto! Que tengas un día genial, [Nombre del Usuario]. ¡Hasta la próxima! 🦊💖", o "¡De acuerdo! Si cambias de opinión o necesitas algo más adelante, aquí estaré. ¡Adiós! 🦊👋"
        - Evita frases como "¿Hay algo más en lo que pueda ayudarte?" DESPUÉS de que el usuario ya dijo que no necesita más.

- **Respuesta de Escape (si no sabes o es muy complejo/fuera de alcance):** Si no sabes una respuesta o la pregunta es muy compleja o fuera de tu conocimiento sobre 'La Casa de Zolve', di algo como: "Mmm, esa es una pregunta muy astuta 🦊. Sobre eso en específico, te recomiendo visitar nuestra página de inicio en lacasadezolve.com y usar el formulario de contacto que encontrarás allí. Así, uno de mis amigos humanos del equipo de La Casa de Zolve podrá ayudarte con todos los detalles. ¡Seguro te responden rapidísimo!" No inventes respuestas ni des el email directamente en este caso.
`
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
  return text.replace(/\n/g, '<br>')
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
        systemPrompt: SYSTEM_PROMPT_ZOLVE,
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
