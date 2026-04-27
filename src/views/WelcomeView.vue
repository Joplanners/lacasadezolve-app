<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

// Obtenemos el nombre del usuario desde el store de Auth
// Usamos una computed property para reaccionar si tarda en cargar
// --- userName ACTUALIZADO ---
const userName = computed(() => {
  // 1. Prioridad: Nombre desde el perfil cargado en authStore
  if (authStore.userProfile?.first_name) {
    return authStore.userProfile.first_name
  }
  // 2. Fallback: Parte del email
  if (authStore.user?.email) {
    return authStore.user.email.split('@')[0]
  }
  // 3. Fallback genérico
  return 'Usuario'
})

// Redirección automática después de unos segundos
onMounted(() => {
  setTimeout(() => {
    // Redirigimos a la página de perfil
    router.push({ name: 'profile' })
  }, 3000) // 3 segundos
})
</script>

<template>
  <div class="welcome-container">
    <img src="/Zolve_Logo.webp" alt="Logo Zolve" class="welcome-logo" />
    <h1>¡Hola {{ userName }}!</h1>
    <h2>Bienvenido/a a La Casa de Zolve</h2>
    <p>Estamos preparándolo todo...</p>
    <div class="spinner"></div>
  </div>
</template>

<style scoped>
.welcome-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: calc(
    100vh - var(--app-header-actual-height, 0px)
  ); /* Ocupa alto menos el header si existe */
  text-align: center;
  padding: 1rem;
  background-color: var(--color-background-soft); /* Fondo suave */
}

.welcome-logo {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  margin-bottom: 25px;
  border: 3px solid var(--brand-pink);
}

h1 {
  font-size: 2.2rem;
  color: var(--color-heading);
  margin-bottom: 5px;
}
h2 {
  font-size: 1.5rem;
  color: var(--brand-turquoise);
  margin-bottom: 20px;
  font-weight: 500;
}

p {
  font-size: 1.1rem;
  color: var(--color-text-soft);
  margin-top: 10px;
  margin-bottom: 25px;
}

.spinner {
  /* Reutilizamos el spinner del checkout */
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid var(--brand-turquoise);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  h1 {
    font-size: 1.8rem;
  }
  h2 {
    font-size: 1.3rem;
  }
  p {
    font-size: 1rem;
  }
  .welcome-logo {
    width: 100px;
    height: 100px;
  }
}
</style>
