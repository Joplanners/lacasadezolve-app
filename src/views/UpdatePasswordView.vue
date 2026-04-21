<script setup>
import { ref, computed, onUnmounted, watch, onMounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from 'vue-toastification'
import PasswordInput from '@/components/PasswordInput.vue'

const authStore = useAuthStore()
const toast = useToast()

const newPassword = ref('')
const confirmPassword = ref('')
const message = ref('')
const errorMsg = ref('')
const loading = ref(false)
const showForm = ref(false)
const verificationError = ref('')

// Lógica de validación de contraseña
const passwordRequirements = computed(() => [
  { text: 'Al menos 8 caracteres', regex: /.{8,}/ },
  { text: 'Incluye una mayúscula (A-Z)', regex: /[A-Z]/ },
  { text: 'Incluye una minúscula (a-z)', regex: /[a-z]/ },
  { text: 'Incluye un número (0-9)', regex: /[0-9]/ },
  { text: 'Incluye un símbolo (!@#$...)', regex: /[^A-Za-z0-9]/ },
])

const passwordValidation = computed(() => {
  const value = newPassword.value
  return passwordRequirements.value.map((req) => ({
    ...req,
    valid: req.regex.test(value),
  }))
})

const isPasswordValid = computed(() => {
  if (passwordRequirements.value.length === 0) return true
  return passwordValidation.value.every((req) => req.valid)
})

const passwordsMatch = computed(() => {
  if (!newPassword.value || !confirmPassword.value) return true
  return newPassword.value === confirmPassword.value
})

// Verificación en el montaje del componente
onMounted(async () => {
  // Esperar a que Supabase termine de validar el token / código PKCE de la URL
  await authStore.authReadyPromise
  
  // En Supabase v2 con PKCE, a veces se emite SIGNED_IN en lugar de PASSWORD_RECOVERY
  // Si inició sesión o está en modo recuperación, permitimos el cambio
  if (authStore.isPasswordRecoveryMode || authStore.isLoggedIn) {
    showForm.value = true
    verificationError.value = ''
  } else {
    showForm.value = false
    verificationError.value =
      'El enlace es inválido o ha expirado. Por favor, solicita uno nuevo.'
  }
})

// Watcher reactivo por si el evento de Supabase tarda un milisegundo extra
const unwatch = watch(
  () => [authStore.isPasswordRecoveryMode, authStore.isLoggedIn],
  ([isRecovery, isLoggedIn]) => {
    if (isRecovery || isLoggedIn) {
      showForm.value = true
      verificationError.value = ''
    }
  }
)

onUnmounted(() => {
  unwatch()
  authStore.exitPasswordRecoveryMode()
})

const handleUpdatePassword = async () => {
  if (!passwordsMatch.value) {
    errorMsg.value = 'Las contraseñas no coinciden.'
    return
  }
  if (!isPasswordValid.value) {
    errorMsg.value = 'La nueva contraseña no cumple con todos los requisitos de seguridad.'
    return
  }

  loading.value = true
  errorMsg.value = ''
  message.value = ''

  try {
    // 1. Actualizar la contraseña
    const { error } = await supabase.auth.updateUser({
      password: newPassword.value,
    })
    if (error) throw error

    message.value = '¡Contraseña actualizada! Redirigiendo...'
    toast.success('¡Contraseña cambiada!', { timeout: 1000 })

    // 2. Limpiar modo INMEDIATAMENTE (antes de cualquier otra cosa)
    authStore.exitPasswordRecoveryMode()

    // 3. Cerrar sesión de forma asíncrona sin esperar
    supabase.auth.signOut().catch((err) => console.error('Error signOut:', err))

    // 4. Forzar redirección INMEDIATAMENTE
    setTimeout(() => {
      console.log('🚀 Forzando navegación con window.location')
      window.location.href = '/ingreso'
    }, 500)
  } catch (error) {
    errorMsg.value = `Error: ${error.message}`
    toast.error(errorMsg.value)
    loading.value = false
  }
  // NO hay finally - dejamos loading en true hasta que redirija
}
</script>

<template>
  <div class="update-password-container">
    <h1>Establecer Nueva Contraseña</h1>

    <div v-if="showForm">
      <p>Ingresa tu nueva contraseña. Asegúrate de que cumpla los requisitos.</p>
      <form @submit.prevent="handleUpdatePassword">
        <PasswordInput
          v-model="newPassword"
          id="new-password"
          label="Nueva Contraseña:"
          autocomplete="new-password"
          :disabled="loading || !!message"
          :required="true"
        >
          <template #requirements>
            <ul v-if="newPassword.length > 0" class="requirements-list">
              <li
                v-for="(req, index) in passwordValidation"
                :key="index"
                :class="{ valid: req.valid }"
              >
                <span class="requirement-icon">{{ req.valid ? '✓' : '✗' }}</span>
                {{ req.text }}
              </li>
            </ul>
          </template>
        </PasswordInput>

        <PasswordInput
          v-model="confirmPassword"
          id="confirm-password"
          label="Confirmar Nueva Contraseña:"
          autocomplete="new-password"
          :disabled="loading || !!message"
          :required="true"
        >
          <template #requirements>
            <p v-if="!passwordsMatch && confirmPassword.length > 0" class="error-message-inline">
              ✗ Las contraseñas no coinciden
            </p>
          </template>
        </PasswordInput>

        <button
          type="submit"
          class="btn-primary"
          :disabled="loading || !!message || !isPasswordValid || !passwordsMatch"
        >
          {{ loading ? 'Actualizando...' : 'Actualizar Contraseña' }}
        </button>
      </form>
    </div>

    <div v-else>
      <p v-if="verificationError" class="error-message">{{ verificationError }}</p>
      <p v-else>Verificando enlace...</p>
      <div v-if="!verificationError" class="spinner"></div>
      <p><router-link :to="{ name: 'login' }">Volver al Login</router-link></p>
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
p {
  margin-bottom: 15px;
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
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #3498db;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 20px auto;
}
@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}
.update-password-container {
  font-family: var(--font-family-base);
  background-color: var(--color-background-soft);
  border-color: var(--color-border);
}
h1 {
  color: var(--color-heading);
}
button.btn-primary {
  background-color: var(--brand-pink);
  color: var(--vt-c-white);
  font-weight: var(--font-weight-medium);
  transition:
    background-color 0.2s ease,
    transform 0.1s ease;
}
button.btn-primary:hover:not(:disabled) {
  background-color: #e65c7a;
  transform: translateY(-1px);
}
button.btn-primary:disabled {
  background-color: #cccccc;
  opacity: 0.7;
}
.requirements-list {
  list-style: none;
  padding: 0;
  margin: 0;
  color: var(--color-text-muted, #6c757d);
  text-align: left;
}
.requirements-list li {
  transition: color 0.3s ease;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}
.requirements-list li.valid {
  color: var(--brand-green, #28a745);
  font-weight: var(--font-weight-medium);
}
.requirement-icon {
  margin-right: 8px;
  width: 1em;
}
.error-message-inline {
  font-size: 0.85em;
  color: #c62828;
  text-align: left;
  margin: 5px 0 0 5px;
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
    font-size: 1.5rem;
    margin-bottom: 15px;
  }
  button {
    padding: 12px;
    font-size: 1rem;
  }
}
</style>
