<template>
  <div class="admin-layout">
    <h2>Panel de Administración</h2>
    <nav>
      <router-link :to="{ name: 'admin-dashboard' }">Dashboard</router-link> |
      <router-link :to="{ name: 'admin-users' }">Usuarios</router-link> |
      <router-link :to="{ name: 'admin-markers' }">Marcadores</router-link> |
      <router-link :to="{ name: 'admin-contents' }">Contenidos</router-link> |
      <!-- 👇 NUEVO ENLACE AÑADIDO AQUÍ 👇 -->
      <router-link :to="{ name: 'admin-overlay-images' }">Fotos Mágicas</router-link> |
      <!-- 👇 NUEVO ENLACE AÑADIDO AQUÍ 👇 -->
      <router-link :to="{ name: 'admin-categories' }">Categorías</router-link> |
      <router-link :to="{ name: 'admin-products' }">Productos</router-link> |
      <router-link :to="{ name: 'admin-featured-products' }"> Productos Destacados </router-link> |
      <router-link :to="{ name: 'admin-banners' }">Banners</router-link> |
    </nav>
    <hr />
    <main>
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { RouterView, RouterLink } from 'vue-router'
</script>

<style scoped>
.admin-layout {
  padding: 20px;
  font-family: sans-serif;
}
nav {
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}
nav a {
  margin-right: 10px;
  text-decoration: none;
  color: #007bff;
}
nav a.router-link-exact-active {
  font-weight: bold;
  text-decoration: underline;
}
</style>
