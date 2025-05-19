<script setup>
import { useRoute, RouterLink } from 'vue-router';
const route = useRoute();
</script>

<template>
  <div class="page-content-wrapper">
    <div class="legal-placeholder-container">
      <h1>Página de: {{ route.name }}</h1>
      <p>Contenido para esta página estará disponible próximamente.</p>
      <p>Agradecemos tu comprensión.</p>
      <router-link :to="{ name: 'home' }" class="btn-back">Volver al Inicio</router-link>
    </div>
  </div>
</template>

<style scoped>
.legal-placeholder-container {
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
}
.legal-placeholder-container h1 {
  margin-bottom: 20px;
  color: var(--color-heading);
  font-size: 1.8rem;
}
.legal-placeholder-container p {
  margin-bottom: 15px;
  color: var(--color-text);
  font-size: 1rem;
}
.btn-back {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: var(--brand-turquoise);
  color: var(--vt-c-white);
  text-decoration: none;
  border-radius: 5px;
  transition: background-color 0.2s ease;
}
.btn-back:hover {
  background-color: var(--color-link-hover);
}
</style>