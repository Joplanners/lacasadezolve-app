<script setup>
import { RouterLink } from 'vue-router'
import { useSeoMeta } from '@/composables/useSeoMeta'

useSeoMeta({
  title: 'Página No Encontrada',
  description: 'La página que buscas no existe en La Casa de Zolve.',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <img src="/Zolve404.webp" alt="Zolve el zorro está perdido" class="zolve-image" />
      <h1>¡Ups! Página No Encontrada</h1>
      <p class="subtitle">
        Parece que Zolve se aventuró por un camino que no existía. ¡No te preocupes, te ayudamos a
        volver a casa!
      </p>
      <router-link :to="{ name: 'home' }" class="btn-back-home"> Volver al Inicio </router-link>
    </div>
  </div>
</template>

<style scoped>
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  flex-grow: 1; /* Ocupa todo el espacio disponible en <main> */
  padding: 40px 20px;
  font-family: var(--font-family-base);
}

.not-found-content {
  max-width: 500px;
}

.zolve-image {
  max-width: 200px;
  height: auto;
  margin-bottom: 30px;
}

h1 {
  font-size: 2.5rem;
  color: var(--brand-pink);
  margin-bottom: 15px;
}

.subtitle {
  font-size: 1.1rem;
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 30px;
}

.btn-back-home {
  display: inline-block;
  padding: 12px 30px;
  background-color: var(--brand-turquoise);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 1.1rem;
  transition: all 0.2s ease;
}

.btn-back-home:hover {
  background-color: var(--brand-pink);
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

@media (max-width: 600px) {
  h1 {
    font-size: 2rem;
  }
  .zolve-image {
    max-width: 150px;
  }
}
</style>
