<script setup>
import { ref } from 'vue'

// Aquí pones tus enlaces reales
const links = ref([
  { 
    title: '🦊 Visita mi Tienda', 
    url: 'https://lacasadezolve.com', 
    icon: '🛍️',
    class: 'primary'
  },
  { 
    title: '📅 Planner App (Solo Chile)', 
    url: 'https://planner.lacasadezolve.com', 
    icon: '✨',
    class: 'accent' // Para destacarlo
  },
  { 
    title: '📸 Instagram', 
    url: 'https://instagram.com/zolve_fox', 
    icon: '📷',
    class: 'secondary'
  },
  { 
    title: '🎵 TikTok', 
    url: 'https://tiktok.com/@zolve_fox', 
    icon: '💃',
    class: 'secondary'
  },
{ 
    title: '💬 Háblanos al WhatsApp', 
    // REEMPLAZA EL 569XXXXXXXX CON TU NÚMERO REAL (sin el +)
    // El texto del final es el mensaje automático (está codificado para URL)
    url: 'https://wa.me/56936649482?text=Hola%20Zolve!%20Vengo%20de%20tu%20perfil%20y%20tengo%20una%20duda%20%F0%9F%A6%8A', 
    icon: '📱',
    class: 'secondary' // Usamos el estilo secundario para que no pelee con el Planner
  }
])

const openLink = (url) => {
  window.open(url, '_blank')
}
</script>

<template>
  <div class="linktree-container">
    <div class="profile-section">
      <div class="avatar">
        <img src="/zolveNavidad.png" alt="Zolve Avatar" />
      </div>
      <h1>@lacasadezolve</h1>
      <p>Stationery & K-pop Stuff ✨</p>
    </div>

    <div class="links-list">
      <button 
        v-for="(link, index) in links" 
        :key="index"
        class="link-btn"
        :class="link.class"
        @click="openLink(link.url)"
      >
        <span class="icon">{{ link.icon }}</span>
        <span class="text">{{ link.title }}</span>
      </button>
    </div>

    <footer class="footer">
      <p>Hecho con 💚 por Jackie</p>
    </footer>
  </div>
</template>

<style scoped>
/* Contenedor Principal */
.linktree-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 40px 20px;
  text-align: center;
  /* Usamos tu fuente y fondo base */
  font-family: var(--font-family-base);
  background-color: var(--color-background); 
  color: var(--color-text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Avatar del Zorrito */
.avatar img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  /* AQUÍ EL CAMBIO: Usamos tu rosado de marca para el borde */
  border: 4px solid var(--brand-pink); 
  object-fit: cover;
  margin-bottom: 10px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

h1 {
  font-size: 1.5rem;
  margin: 0;
  /* Usamos el color de títulos de tu base.css */
  color: var(--color-heading);
  font-weight: var(--font-weight-bold);
}

p {
  color: var(--vt-c-text-light-2); /* Un gris suave de tus variables */
  margin-top: 5px;
  margin-bottom: 30px;
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* Estilos Base de Botones */
.link-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border: none;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: var(--font-weight-medium); /* Usamos tu variable de peso */
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  text-decoration: none;
  position: relative;
  /* Sombra suave */
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.link-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.link-btn .icon {
  position: absolute;
  left: 20px;
  font-size: 1.2rem;
}

/* --- VARIACIONES DE COLORES --- */

/* Primary: Para la Tienda (Fondo blanco, borde Turquesa) */
.primary {
  background-color: var(--vt-c-white);
  border: 2px solid var(--brand-turquoise);
  color: var(--brand-turquoise);
}

.primary:hover {
  background-color: var(--brand-turquoise);
  color: var(--vt-c-white);
}

/* Accent: Para el Planner (Fondo Turquesa Sólido) */
.accent {
  background-color: var(--brand-turquoise);
  color: var(--vt-c-white);
  border: 2px solid var(--brand-turquoise);
}

.accent:hover {
  /* Usamos tu variable de hover definida en base.css */
  background-color: var(--color-link-hover);
  border-color: var(--color-link-hover);
}

/* Secondary: Para Redes Sociales (Fondo suave) */
.secondary {
  background-color: var(--vt-c-white-soft);
  color: var(--color-text);
  border: 1px solid transparent;
}

.secondary:hover {
  background-color: var(--vt-c-white);
  /* Al pasar el mouse, se pone rosado Zolve */
  border-color: var(--brand-pink);
  color: var(--brand-pink);
}

.footer {
  margin-top: 40px;
  font-size: 0.8rem;
  opacity: 0.8;
  color: var(--vt-c-text-light-2);
}
</style>