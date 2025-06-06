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
import { useAuthStore } from './stores/authStore'

library.add(faEye, faEyeSlash, faInstagram, faFacebookF, faYoutube)

const app = createApp(App)
app.component('font-awesome-icon', FontAwesomeIcon)

const pinia = createPinia()
app.use(pinia)
app.use(router)

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

app.mount('#app')

const authStore = useAuthStore(pinia)

// --- LÓGICA DE CIERRE DE SESIÓN MEJORADA ---

// Esta bandera nos dirá si el usuario se ha ido de la pestaña en algún momento.
let wasEverHidden = false

document.addEventListener('visibilitychange', () => {
  // Si el usuario se va (cambia de pestaña/app), simplemente levantamos la bandera.
  if (document.visibilityState === 'hidden') {
    wasEverHidden = true
    return // No hacemos nada más por ahora.
  }

  // Este código solo se ejecuta cuando la pestaña se vuelve VISIBLE.
  // Y crucialmente, solo actuamos si la bandera `wasEverHidden` es verdadera.
  if (document.visibilityState === 'visible' && wasEverHidden) {
    // Si al volver, el usuario estaba logueado, cerramos la sesión.
    if (authStore.isLoggedIn) {
      authStore.signOut()
    }
  }
})
