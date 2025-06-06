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

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    authStore.checkSessionOnLoad()
  }
})
