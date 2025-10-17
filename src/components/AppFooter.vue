<script setup>
import { RouterLink } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
</script>

<template>
  <footer class="app-footer">
    <div class="footer-main-content">
      <div class="footer-column footer-branding">
        <router-link :to="{ name: 'home' }">
          <img src="/Zolve_Logo.png" alt="Logo La Casa de Zolve" class="footer-logo" />
        </router-link>
        <div class="footer-legal-info">
          <p><strong>La Casa de Zolve</strong></p>
          <p>RUT: 77.446.775-0</p>
        </div>
      </div>

      <div class="footer-column footer-links-section">
        <h4>Links de Interés</h4>
        <ul>
          <li>
            <router-link :to="{ name: 'terms-conditions' }">Términos y Condiciones</router-link>
          </li>
          <li>
            <router-link :to="{ name: 'privacy-policy' }">Política de Privacidad</router-link>
          </li>
          <li><router-link :to="{ name: 'cookies-policy' }">Política de Cookies</router-link></li>
        </ul>
      </div>

      <div class="footer-column footer-contact">
        <h4>Contacto</h4>
        <p>📞 +56 9 3664 9482</p>
        <p>📧 contacto@lacasadezolve.com</p>
        <p>📍 Santiago, Chile</p>
        <div class="social-icons">
          <a
            href="https://www.instagram.com/zolve_fox/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <font-awesome-icon :icon="['fab', 'instagram']" />
          </a>
          <a
            href="https://www.facebook.com/people/Zolve/61558525044896/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
          >
            <font-awesome-icon :icon="['fab', 'facebook-f']" />
          </a>
          <a
            href="https://www.youtube.com/@LaCasadeZolve"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
          >
            <font-awesome-icon :icon="['fab', 'youtube']" />
          </a>
          <a
            href="https://www.tiktok.com/@zolve_fox"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
          >
            <font-awesome-icon :icon="['fab', 'tiktok']" />
          </a>
        </div>
      </div>
    </div>

    <div class="footer-copyright">
      <p>&copy; {{ new Date().getFullYear() }} La Casa de Zolve. Todos los derechos reservados.</p>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  background-color: var(--color-background-mute);
  padding: 40px 20px 20px 20px;
  font-size: 0.9em;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.footer-main-content {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  max-width: 1280px;
  margin: 0 auto 30px auto;
}

.footer-column {
  text-align: left;
}

.footer-branding {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.footer-logo {
  max-width: 100px;
  height: auto;
  border-radius: 50%;
  border: 2px solid var(--brand-pink);
  margin-bottom: 15px;
}

.footer-legal-info p {
  margin: 2px 0;
  font-size: 0.9em;
  color: var(--color-text-soft);
}
.footer-legal-info p strong {
  color: var(--color-text);
  font-weight: 500;
}

.footer-column h4 {
  font-size: 1.1em;
  color: var(--color-heading);
  margin-top: 0;
  margin-bottom: 15px;
  font-weight: var(--font-weight-bold);
}

.footer-links-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-links-section li {
  margin-bottom: 10px;
}

.footer-links-section a {
  color: var(--color-text);
  text-decoration: none;
}
.footer-links-section a:hover {
  color: var(--brand-pink);
  text-decoration: underline;
}

.footer-contact p {
  margin: 0 0 10px 0;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.social-icons {
  display: flex;
  gap: 15px;
  margin-top: 15px;
}

.social-icons a {
  color: var(--color-text);
  font-size: 1.5em;
  transition: color 0.2s ease;
}
.social-icons a:hover {
  color: var(--brand-pink);
}

.footer-copyright {
  text-align: center;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--color-border);
}
.footer-copyright p {
  font-size: 0.9em;
  font-weight: bold;
  color: var(--color-text-soft);
}

@media (max-width: 767px) {
  .footer-main-content {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .footer-column,
  .footer-branding {
    text-align: center;
    align-items: center;
  }
  .footer-contact p {
    justify-content: center;
  }
  .social-icons {
    justify-content: center;
  }
}
</style>
