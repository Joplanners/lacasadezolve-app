<script setup>
import { ref } from 'vue'
import { supabase } from '@/lib/supabaseClient.js'
import PasswordInput from '@/components/PasswordInput.vue'

const email = ref('')
const password = ref('')
const isRegistering = ref(false)
const loading = ref(false)
const message = ref('')
const errorMsg = ref('')

const isForgotPasswordMode = ref(false)
const forgotPasswordEmail = ref('')
const forgotPasswordLoading = ref(false)
const forgotPasswordMessage = ref('')
const forgotPasswordErrorMsg = ref('')

const clearAllMessages = () => {
  message.value = ''
  errorMsg.value = ''
  forgotPasswordMessage.value = ''
  forgotPasswordErrorMsg.value = ''
}

const toggleAuthMode = () => {
  isRegistering.value = !isRegistering.value
  clearAllMessages()
  email.value = ''
  password.value = ''
}

const handleLogin = async () => {
  clearAllMessages()
  loading.value = true
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    if (error) throw error
  } catch (error) {
    console.error('AuthView: Error en inicio de sesión:', error.message)
    errorMsg.value = `Error al iniciar sesión: ${error.message}`
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  clearAllMessages()
  loading.value = true
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
    })
    if (error) throw error
    message.value = '¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.'
    isRegistering.value = false
    email.value = ''
    password.value = ''
  } catch (error) {
    console.error('AuthView: Error en registro:', error.message)
    errorMsg.value = `Error al registrar: ${error.message}`
  } finally {
    loading.value = false
  }
}

const handleGoogleLogin = async () => {
  clearAllMessages()
  loading.value = true
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    })
    if (error) throw error
  } catch (error) {
    console.error('AuthView: Error con Google Login:', error.message)
    errorMsg.value = `Error con Google: ${error.message}`
    loading.value = false
  }
}

const handleForgotPasswordClick = () => {
  clearAllMessages()
  isForgotPasswordMode.value = true
  isRegistering.value = false
  email.value = ''
  password.value = ''
}

const handleSendResetLink = async () => {
  if (!forgotPasswordEmail.value) {
    forgotPasswordErrorMsg.value = 'Por favor, ingresa tu correo electrónico.'
    return
  }
  clearAllMessages()
  forgotPasswordLoading.value = true
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.value, {
      redirectTo: `${window.location.origin}/actualizar-contrasena`,
    })
    if (error) throw error
    forgotPasswordMessage.value =
      'Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña. ¡Revisa tu bandeja de entrada y spam!'
  } catch (error) {
    console.error('AuthView: Error en handleSendResetLink:', error.message)
    forgotPasswordErrorMsg.value =
      'Ocurrió un error al procesar tu solicitud. Inténtalo de nuevo más tarde o verifica que el correo sea correcto.'
  } finally {
    forgotPasswordLoading.value = false
  }
}

const switchToLoginRegister = () => {
  clearAllMessages()
  isForgotPasswordMode.value = false
  isRegistering.value = false
  forgotPasswordEmail.value = ''
}
</script>

<template>
  <div class="auth-container">
    <!-- === FORMULARIO DE OLVIDÉ CONTRASEÑA === -->
    <div v-if="isForgotPasswordMode">
      <h1>Restablecer Contraseña</h1>
      <div class="logo-image-container">
        <img src="/Zolve_Logo.png" alt="Logo Zolve" class="auth-logo" />
      </div>
      <form @submit.prevent="handleSendResetLink">
        <p class="forgot-password-instructions">
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
        </p>
        <div class="form-group">
          <label for="forgot-email">Correo Electrónico:</label>
          <input
            type="email"
            id="forgot-email"
            v-model="forgotPasswordEmail"
            required
            autocomplete="email"
            :disabled="forgotPasswordLoading"
            placeholder="tuCorreo@ejemplo.com"
            class="form-input"
          />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="forgotPasswordLoading">
          {{ forgotPasswordLoading ? 'Enviando...' : 'Enviar Enlace' }}
        </button>
      </form>
      <p v-if="forgotPasswordMessage" class="success-message">{{ forgotPasswordMessage }}</p>
      <p v-if="forgotPasswordErrorMsg" class="error-message">{{ forgotPasswordErrorMsg }}</p>
      <p class="toggle-auth">
        <a
          href="#"
          @click.prevent="switchToLoginRegister"
          :class="{ disabled: forgotPasswordLoading }"
          class="auth-link"
        >
          ← Volver a Iniciar Sesión
        </a>
      </p>
    </div>

    <!-- === FORMULARIO DE LOGIN / REGISTRO === -->
    <div v-else>
      <h1>{{ isRegistering ? 'Crear Cuenta Nueva' : 'Bienvenido a Zolve' }}</h1>

      <!-- ***** IMAGEN DEL ZORRITO ***** -->
      <div class="logo-image-container">
        <!-- CAMBIA 'logo-zolve.png' AL NOMBRE DE TU IMAGEN EN LA CARPETA 'public' -->
        <img src="/Zolve_Logo.png" alt="Logo Zolve" class="auth-logo" />
      </div>
      <!-- ***** FIN IMAGEN DEL ZORRITO ***** -->

      <form @submit.prevent="isRegistering ? handleRegister() : handleLogin()">
        <div class="form-group">
          <label for="email">Correo Electrónico:</label>
          <input
            type="email"
            id="email"
            v-model="email"
            required
            autocomplete="email"
            :disabled="loading"
            placeholder="tuCorreo@ejemplo.com"
            class="form-input"
          />
        </div>

        <PasswordInput
          v-model="password"
          id="auth-password"
          :label="isRegistering ? 'Crea una Contraseña:' : 'Contraseña:'"
          :autocomplete="isRegistering ? 'new-password' : 'current-password'"
          :disabled="loading"
          :required="true"
          placeholder="Tu contraseña segura"
        />

        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Procesando...' : isRegistering ? 'Crear mi Cuenta' : 'Ingresar' }}
        </button>
      </form>

      <p v-if="!isRegistering" class="forgot-password">
        <a
          href="#"
          @click.prevent="handleForgotPasswordClick"
          :class="{ disabled: loading }"
          class="auth-link"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </p>

      <p v-if="message" class="success-message">{{ message }}</p>
      <p v-if="errorMsg" class="error-message">{{ errorMsg }}</p>

      <button @click="handleGoogleLogin" class="btn btn-google" :disabled="loading">
        {{ loading ? '...' : 'Ingresar con Google' }}
      </button>

      <p class="toggle-auth">
        {{ isRegistering ? '¿Ya tienes una cuenta con nosotros?' : '¿Eres nuevo por aquí?' }}
        <a
          href="#"
          @click.prevent="toggleAuthMode"
          :class="{ disabled: loading }"
          class="auth-link important-link"
        >
          {{ isRegistering ? 'Inicia Sesión' : 'Regístrate Ahora' }}
        </a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 30px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  font-family: var(--font-family-base);
  text-align: center;
  background-color: var(--color-background-soft);
}
h1 {
  margin-bottom: 15px; /* Reducido un poco para dar espacio al logo */
  color: var(--color-heading);
  font-weight: var(--font-weight-bold);
}

/* Estilos para el contenedor de la imagen del logo */
.logo-image-container {
  display: flex;
  justify-content: center;
  margin-top: 0px; /* Espacio entre el h1 y la imagen, puede ser 0 si el h1 ya tiene margen inferior */
  margin-bottom: 25px; /* Espacio entre la imagen y el formulario */
}

/* Estilos para la imagen del logo (el zorrito) */
.auth-logo {
  width: 90px; /* Ajusta el tamaño deseado */
  height: 90px; /* Mismo valor que width para un círculo perfecto si la imagen es cuadrada */
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--brand-pink); /* Borde opcional */
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15); /* Sombra opcional */
}

.form-group {
  margin-bottom: 20px;
  text-align: left;
}
label {
  display: block;
  margin-bottom: 8px;
  color: var(--color-text);
  font-weight: var(--font-weight-medium);
  font-size: 0.95em;
}

.form-input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-sizing: border-box;
  font-family: var(--font-family-base);
  font-size: 1rem;
  color: var(--color-text);
  background-color: var(--color-background);
}
.form-input:focus {
  outline: none;
  border-color: var(--brand-pink);
  box-shadow: 0 0 0 2px rgba(255, 107, 135, 0.25);
}
.form-input::placeholder {
  color: var(--vt-c-text-dark-2);
  opacity: 0.7;
}
.form-input:disabled {
  background-color: var(--color-background-mute);
  cursor: not-allowed;
  opacity: 0.7;
}

.btn {
  padding: 12px 18px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  font-weight: var(--font-weight-medium);
  margin-top: 10px;
  width: 100%;
  box-sizing: border-box;
  transition:
    background-color 0.2s ease,
    transform 0.1s ease,
    opacity 0.2s ease;
  color: var(--vt-c-white);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  opacity: 0.9;
}

.btn-primary {
  background-color: var(--brand-pink);
}
.btn-primary:hover:not(:disabled) {
  background-color: #e65c7a;
}
.btn-google {
  background-color: var(--brand-turquoise);
  margin-top: 15px;
}
.btn-google:hover:not(:disabled) {
  background-color: var(--color-link-hover);
}
.btn:disabled {
  background-color: #cccccc !important;
  color: #666666 !important;
  cursor: not-allowed;
  opacity: 0.6;
  transform: none !important;
}

.auth-link {
  color: var(--vt-c-indigo);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  transition: color 0.2s ease;
}
.auth-link.important-link {
  color: var(--brand-pink);
  font-weight: var(--font-weight-bold);
}
.auth-link:hover:not(.disabled) {
  text-decoration: underline;
  color: var(--brand-pink);
}
.auth-link.important-link:hover:not(.disabled) {
  color: #e65c7a;
}
.auth-link.disabled {
  color: #cccccc !important;
  pointer-events: none;
  text-decoration: none !important;
}

.forgot-password {
  margin-top: 20px;
  margin-bottom: 15px;
  font-size: 0.9em;
}
.success-message,
.error-message {
  margin-top: 15px;
  font-size: 0.9em;
  font-weight: var(--font-weight-medium);
  padding: 10px 15px;
  border-radius: 4px;
  word-break: break-word;
  text-align: left;
  line-height: 1.4;
}
.success-message {
  color: #155724;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}
.error-message {
  color: #721c24;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}
.toggle-auth {
  margin-top: 25px;
  font-size: 0.95em;
}

.forgot-password-instructions {
  margin-bottom: 20px;
  font-size: 0.95em;
  color: var(--color-text);
  text-align: left;
  line-height: 1.5;
}

@media (max-width: 480px) {
  .auth-container {
    width: 90%;
    margin: 30px auto;
    padding: 20px;
    border: none;
    box-shadow: none;
  }

  h1 {
    font-size: 1.6rem;
    margin-bottom: 10px; /* Ajustar si es necesario con el logo */
  }

  .auth-logo {
    width: 70px; /* Logo un poco más pequeño en móviles */
    height: 70px;
  }
  .logo-image-container {
    margin-bottom: 20px; /* Ajustar espacio inferior del logo en móviles */
  }

  .form-input {
    padding: 10px 12px;
    font-size: 0.95rem;
  }

  .btn {
    padding: 12px 15px;
    font-size: 0.95rem;
  }

  .forgot-password,
  .toggle-auth {
    font-size: 0.9em;
  }

  .forgot-password-instructions {
    font-size: 0.9em;
  }
}
</style>
