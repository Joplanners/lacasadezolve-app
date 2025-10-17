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
} from '@fortawesome/free-solid-svg-icons'
import {
  faInstagram,
  faFacebookF,
  faYoutube,
  faTiktok, // <-- 1. IMPORTAMOS EL ÍCONO DE TIKTOK
} from '@fortawesome/free-brands-svg-icons'

// Añadimos TODOS los íconos que usamos a la biblioteca central
library.add(
  faEye,
  faEyeSlash,
  faVolumeUp,
  faVolumeMute,
  faStore,
  faInstagram,
  faFacebookF,
  faYoutube,
  faTiktok, // <-- 2. LO AÑADIMOS A LA BIBLIOTECA
)

const app = createApp(App)

app.component('font-awesome-icon', FontAwesomeIcon)

app.use(createPinia())
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
