<script setup>
import { ref, watch, onUnmounted } from 'vue' // --> Cambiamos los imports
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()
const newPassword = ref('')
const confirmPassword = ref('')
const message = ref('')
const errorMsg = ref('')
const loading = ref(false)

// Esta variable ahora controlará si mostramos el formulario o el mensaje de error.
const showForm = ref(false)
const verificationError = ref('')

// Usamos un 'watcher' para reaccionar a los cambios en el store.
const unwatch = watch(
  () => authStore.isPasswordRecoveryMode,
  (isRecovery) => {
    if (isRecovery) {
      // Si el store nos dice que estamos en modo recuperación, mostramos el formulario.
      console.log('UpdatePasswordView: Modo recuperación detectado. Mostrando formulario.')
      showForm.value = true
      verificationError.value = ''
    } else {
      // Si no estamos en modo recuperación, mostramos el error.
      console.warn('UpdatePasswordView: Modo recuperación no está activo.')
      showForm.value = false
      verificationError.value =
        'El enlace es inválido o ha expirado. Por favor, solicita uno nuevo.'
    }
  },
  { immediate: true }, // Se ejecuta inmediatamente al cargar el componente.
)

onUnmounted(() => {
  // Limpiamos el watcher cuando el componente se destruye para evitar memory leaks.
  unwatch()
  // Y nos aseguramos de salir del modo recuperación si el usuario se va de la página.
  authStore.exitPasswordRecoveryMode()
})

const handleUpdatePassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = 'Las contraseñas no coinciden.'
    return
  }
  // --> ¡IMPORTANTE! Aquí debemos validar contra las nuevas reglas de seguridad
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
  if (!passwordRegex.test(newPassword.value)) {
    errorMsg.value =
      'La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos.'
    return
  }

  loading.value = true
  errorMsg.value = ''
  message.value = ''

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword.value,
    })
    if (error) throw error

    message.value = '¡Contraseña actualizada con éxito! Redirigiendo al login en 3 segundos...'
    // La sesión ya se limpia sola por el evento de Supabase. Salimos del modo.
    authStore.exitPasswordRecoveryMode()

    setTimeout(() => {
      router.replace({ name: 'login' }) // Usamos replace para una mejor UX
    }, 3000)
  } catch (error) {
    console.error('Error al actualizar contraseña:', error.message)
    errorMsg.value = `Error al actualizar: ${error.message}`
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="update-password-container">
    <h1>Establecer Nueva Contraseña</h1>
    <div v-if="showForm">
      <p>Ingresa tu nueva contraseña a continuación.</p>
      <form @submit.prevent="handleUpdatePassword">
        <div class="form-group">
          <label for="newPassword">Nueva Contraseña:</label>
          <input
            type="password"
            id="newPassword"
            v-model="newPassword"
            required
            autocomplete="new-password"
          />
        </div>
        <div class="form-group">
          <label for="confirmPassword">Confirmar Nueva Contraseña:</label>
          <input
            type="password"
            id="confirmPassword"
            v-model="confirmPassword"
            required
            autocomplete="new-password"
          />
        </div>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Actualizando...' : 'Actualizar Contraseña' }}
        </button>
      </form>
    </div>

    <div v-else>
      <p v-if="verificationError" class="error-message">{{ verificationError }}</p>
      <p v-else>Verificando enlace...</p>
      <div v-if="!verificationError" class="spinner"></div>
      <p><router-link :to="{ name: 'auth' }">Volver al Login</router-link></p>
    </div>

    <p v-if="message" class="success-message">{{ message }}</p>
    <p v-if="errorMsg" class="error-message">{{ errorMsg }}</p>
  </div>
</template>

<style scoped>
.update-password-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 30px;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-family: sans-serif;
  text-align: center;
}
h1 {
  margin-bottom: 20px;
}
.form-group {
  margin-bottom: 15px;
  text-align: left;
}
label {
  display: block;
  margin-bottom: 5px;
}
input[type='password'] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
button {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  margin-top: 10px;
  width: 100%;
  box-sizing: border-box;
}
.btn-primary {
  background-color: #007bff;
  color: white;
}
.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}
.btn-primary:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
.success-message {
  color: green;
  margin-top: 15px;
  font-weight: bold;
}
.error-message {
  color: red;
  margin-top: 15px;
  font-weight: bold;
}

/* Estilos para el spinner */
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1); /* Color más visible sobre fondo blanco */
  border-radius: 50%;
  border-top: 4px solid #3498db; /* Color azul */
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 20px auto; /* Centrar spinner */
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* === AÑADE ESTO AL FINAL DE TU <style scoped> EN UpdatePasswordView.vue === */

/* Primero, unifica con tus variables globales si lo deseas */
.update-password-container {
  font-family: var(--font-family-base); /* Usa tu fuente base */
  background-color: var(--color-background-soft); /* Fondo consistente */
  border-color: var(--color-border); /* Borde consistente */
}
h1 {
  color: var(--color-heading); /* Color de encabezado consistente */
}
label {
  color: var(--color-text);
  font-weight: var(--font-weight-medium);
}
input[type='password'] {
  font-family: var(--font-family-base);
  font-size: 1rem;
  border-color: var(--color-border);
}
input[type='password']:focus {
  outline: none;
  border-color: var(--brand-pink); /* Consistente con otros formularios */
  box-shadow: 0 0 0 2px rgba(255, 107, 135, 0.2);
}
button.btn-primary {
  /* Asumiendo que este es el botón principal */
  background-color: var(--brand-pink); /* Usa tu color primario */
  color: var(--vt-c-white);
  font-weight: var(--font-weight-medium);
  transition:
    background-color 0.2s ease,
    transform 0.1s ease;
}
button.btn-primary:hover:not(:disabled) {
  background-color: #e65c7a; /* Hover de tu primario */
  transform: translateY(-1px);
}
button.btn-primary:disabled {
  background-color: #cccccc; /* Estilo deshabilitado consistente */
  opacity: 0.7;
}

@media (max-width: 480px) {
  .update-password-container {
    width: 90%;
    margin: 30px auto;
    padding: 20px;
    border: none;
    box-shadow: none;
  }
  h1 {
    font-size: 1.5rem; /* Título un poco más pequeño */
    margin-bottom: 15px;
  }
  input[type='password'] {
    padding: 12px; /* Más padding para tocar fácil */
    font-size: 0.95rem;
  }
  button {
    padding: 12px;
    font-size: 1rem;
  }
}
</style>
