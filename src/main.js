import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
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
} from '@fortawesome/free-solid-svg-icons'
import { faInstagram, faFacebookF, faYoutube, faTiktok } from '@fortawesome/free-brands-svg-icons'
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

// --- 🔥 INICIALIZACIÓN ASÍNCRONA DE LA APP 🔥 ---
async function initializeApp() {
  const app = createApp(App)

  app.component('font-awesome-icon', FontAwesomeIcon)

  // 1. Crear e instalar Pinia PRIMERO
  app.use(createPinia())

  // 2. Obtener el store de Auth y LLAMAR A LA INICIALIZACIÓN
  //    (Esto debe pasar DESPUÉS de app.use(createPinia()))
  const authStore = useAuthStore()
  await authStore.initializeAuth() // <-- ¡La magia está aquí!

  // 3. Ahora que la sesión está lista, usar el router.
  //    El router guard (beforeEach) se ejecutará y encontrará
  //    la 'authReadyPromise' ya resuelta.
  app.use(router)

  // 4. Usar el resto de plugins
  app.use(Toast, toastOptions)

  // 5. Montar la app
  app.mount('#app')
}

// Llamar a la función asíncrona para iniciar todo
initializeApp()
