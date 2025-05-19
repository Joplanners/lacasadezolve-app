<script setup>
import { RouterLink } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faStore } from '@fortawesome/free-solid-svg-icons'
</script>

<template>
  <div class="store-container">
    <div class="coming-soon-icon-wrapper">
      <font-awesome-icon :icon="faStore" class="coming-soon-icon" />
    </div>
    <h1>Tienda Zolve <span class="status-badge">Próximamente</span></h1>
    <p class="store-subtitle">
      ¡Estamos trabajando duro para traerte productos increíbles y experiencias AR únicas!
    </p>
    <p class="store-stay-tuned">
      Nuestra tienda online estará disponible muy pronto. ¡Vuelve a visitarnos!
    </p>
    <router-link :to="{ name: 'home' }" class="back-home-link">Volver al Inicio</router-link>
  </div>
</template>

<style scoped>
.store-container {
  max-width: 700px;
  margin: 60px auto;
  padding: 30px 20px;
  text-align: center;
  font-family: var(--font-family-base);
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - 120px);
  justify-content: center;
  box-sizing: border-box;
}

.coming-soon-icon-wrapper {
  margin-bottom: 25px;
}

.coming-soon-icon {
  font-size: 5rem;
  color: var(--brand-pink);
}

.store-container h1 {
  font-size: 2.8rem;
  color: var(--color-heading);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  line-height: 1.2;
}

.status-badge {
  font-size: 0.9rem;
  font-weight: bold;
  background-color: var(--brand-orange, #f39c12);
  color: white;
  padding: 7px 14px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.75px;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.store-subtitle {
  font-size: 1.25rem;
  color: var(--color-text);
  margin-bottom: 15px;
  line-height: 1.6;
  max-width: 580px;
}

.store-stay-tuned {
  font-size: 1rem;
  color: var(--vt-c-text-dark-2, #7f8c8d);
  margin-bottom: 35px;
}

.back-home-link {
  font-size: 1rem;
  color: var(--vt-c-indigo);
  text-decoration: underline; /* Subrayado por defecto */
  font-weight: var(--font-weight-medium);
  margin-top: 10px;
  padding: 5px;
  transition: color 0.2s ease;
}

.back-home-link:hover {
  color: var(--brand-pink);
}

@media (max-width: 768px) {
  .store-container h1 {
    font-size: 2.3rem;
  }
  .coming-soon-icon {
    font-size: 4.5rem;
  }
  .store-subtitle {
    font-size: 1.15rem;
    max-width: 90%;
  }
}

@media (max-width: 480px) {
  .store-container {
    margin-top: 40px;
    margin-bottom: 40px;
    padding: 25px 15px;
    min-height: calc(100vh - 80px);
  }
  .store-container h1 {
    font-size: 1.9rem;
    gap: 8px;
    margin-bottom: 15px;
  }
  .status-badge {
    font-size: 0.75rem;
    padding: 5px 10px;
  }
  .coming-soon-icon {
    font-size: 3.8rem;
    margin-bottom: 20px;
  }
  .store-subtitle {
    font-size: 1.05rem;
    margin-bottom: 10px;
  }
  .store-stay-tuned {
    font-size: 0.95rem;
    margin-bottom: 30px;
  }
  .back-home-link {
    font-size: 0.95rem;
  }
}
</style>
