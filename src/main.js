import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { faInstagram, faFacebookF, faYoutube } from '@fortawesome/free-brands-svg-icons'
import { useAuthStore } from './stores/authStore' // Importamos el store

// --- Librería de Íconos ---
library.add(faEye, faEyeSlash, faInstagram, faFacebookF, faYoutube)

// --- Creación de la App ---
const app = createApp(App)
app.component('font-awesome-icon', FontAwesomeIcon)

// --- Pinia y Router ---
const pinia = createPinia()
app.use(pinia)
app.use(router)

// --- Toastification (Notificaciones) ---
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
app.use(Toast, toastOptions)

// --- Montaje de la App ---
app.mount('#app')

// --- NUEVA LÓGICA: RE-SINCRONIZACIÓN DE SESIÓN EN VISIBILIDAD ---
// Esta es la solución principal al problema de la sesión "congelada".
// Obtenemos una instancia del authStore para usarla fuera de un componente.
const authStore = useAuthStore(pinia)

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log(
      '%cApp visible de nuevo. Forzando re-chequeo de sesión.',
      'color: orange; font-weight: bold;',
    )
    // Reutilizamos la función que ya verifica la sesión al cargar la página.
    authStore.checkSessionOnLoad()
  }
})
