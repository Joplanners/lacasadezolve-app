import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'
import App from './App.vue'
import { routes, setupRouterGuards } from './router'
import './assets/main.css'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faEye,
  faEyeSlash,
  faVolumeUp,
  faVolumeMute,
  faStore,
  faShoppingCart,
  faEnvelope, // 🔥 AÑADIDO (para el email)
  faMapMarkerAlt, // 🔥 AÑADIDO (para la ubicación)
} from '@fortawesome/free-solid-svg-icons'
import {
  faInstagram,
  faFacebookF,
  faYoutube,
  faTiktok,
  faWhatsapp, // 🔥 AÑADIDO
} from '@fortawesome/free-brands-svg-icons'
import { useAuthStore } from '@/stores/authStore' // <-- ¡Importante añadir esto!

library.add(
  faEye,
  faEyeSlash,
  faVolumeUp,
  faVolumeMute,
  faStore,
  faInstagram,
  faFacebookF,
  faYoutube,
  faTiktok,
  faShoppingCart,
  faWhatsapp, // 🔥 AÑADIDO
  faEnvelope, // 🔥 AÑADIDO
  faMapMarkerAlt, // 🔥 AÑADIDO
)

const toastOptions = {
  position: 'top-right',
  timeout: 4000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
}

// --- 🔥 INICIALIZACIÓN ASÍNCRONA CON SSG 🔥 ---
export const createApp = ViteSSG(
  App,
  { routes },
  async ({ app, router, routes, isClient, initialState }) => {
    app.component('font-awesome-icon', FontAwesomeIcon)

    // 1. Crear e instalar Pinia PRIMERO
    app.use(createPinia())

    // 2. Configurar los guards del router para proteger rutas (SSG aware)
    setupRouterGuards(router, isClient)

    // 3. Obtener el store de Auth e inicializar SOLO EN EL CLIENTE
    // En SSG build (Node.js), window/localStorage no existen, así que 
    // pasamos de largo para generar el HTML base correctamente.
    if (isClient) {
      const authStore = useAuthStore()
      await authStore.initializeAuth() // <-- ¡La magia está aquí!
      
      // Mover Toast aquí para evitar que intente acceder al DOM durante SSR
      app.use(Toast, toastOptions)
    }
  }
)
