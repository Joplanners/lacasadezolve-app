<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  initGA4,
  getCookieConsent,
  acceptAnalyticsCookies,
  rejectAnalyticsCookies,
  saveCookiePreferences,
} from '@/ga4'

const showBanner = ref(false)
const showConfigPanel = ref(false)
const analyticsEnabled = ref(true)
const marketingEnabled = ref(false)

function loadCurrentPreferences() {
  const current = getCookieConsent()
  if (current) {
    analyticsEnabled.value = Boolean(current.analytics)
    marketingEnabled.value = Boolean(current.marketing)
  } else {
    analyticsEnabled.value = true
    marketingEnabled.value = false
  }
}

function handleOpenBannerEvent() {
  loadCurrentPreferences()
  showConfigPanel.value = true
  showBanner.value = true
}

onMounted(() => {
  initGA4()
  const currentConsent = getCookieConsent()
  if (!currentConsent) {
    showBanner.value = true
  } else {
    loadCurrentPreferences()
  }
  window.addEventListener('zolve:open-cookie-banner', handleOpenBannerEvent)
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('zolve:open-cookie-banner', handleOpenBannerEvent)
  }
})

function toggleConfigPanel() {
  showConfigPanel.value = !showConfigPanel.value
}

function handleAcceptAll() {
  acceptAnalyticsCookies()
  showConfigPanel.value = false
  showBanner.value = false
}

function handleRejectOptional() {
  rejectAnalyticsCookies()
  showConfigPanel.value = false
  showBanner.value = false
}

function handleSaveCustom() {
  saveCookiePreferences({
    analytics: analyticsEnabled.value,
    marketing: marketingEnabled.value,
  })
  showConfigPanel.value = false
  showBanner.value = false
}
</script>

<template>
  <transition name="cookie-slide">
    <aside
      v-if="showBanner"
      class="cookie-consent-banner"
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de privacidad y configuración de cookies"
    >
      <div class="cookie-consent-content">
        <div class="cookie-consent-text">
          <p class="cookie-title">🍪 Privacidad, Cookies y Protección de Datos Personales</p>
          <p class="cookie-description">
            En <strong>La Casa de Zolve SpA</strong> utilizamos almacenamiento esencial para tu
            sesión y carrito, y —con tu autorización— cookies analíticas (<strong>Google Analytics 4</strong>)
            y de atribución de campañas en redes sociales (<strong>Instagram / Facebook</strong>)
            para mejorar tu experiencia, en estricto cumplimiento de la
            <strong>Ley N° 19.628 y la Ley N° 21.719</strong> sobre Protección de Datos Personales.
            Revisa nuestra
            <router-link :to="{ name: 'privacy-policy' }" class="cookie-link"
              >Política de Privacidad</router-link
            >,
            <router-link :to="{ name: 'cookies-policy' }" class="cookie-link"
              >Política de Cookies</router-link
            >
            y
            <router-link :to="{ name: 'terms-conditions' }" class="cookie-link"
              >Términos y Condiciones</router-link
            >.
          </p>
        </div>

        <div class="cookie-consent-actions">
          <button type="button" class="btn-cookie btn-config" @click="toggleConfigPanel">
            {{ showConfigPanel ? 'Ocultar opciones' : '⚙️ Configurar' }}
          </button>
          <button type="button" class="btn-cookie btn-essential" @click="handleRejectOptional">
            Solo esenciales
          </button>
          <button type="button" class="btn-cookie btn-accept" @click="handleAcceptAll">
            Aceptar todas
          </button>
        </div>
      </div>

      <!-- Submenú Granular de Configuración -->
      <transition name="cookie-expand">
        <div v-if="showConfigPanel" class="cookie-config-panel">
          <div class="cookie-category-list">
            <!-- 1. Esenciales -->
            <div class="cookie-category-item">
              <div class="category-info">
                <div class="category-header">
                  <strong>🔒 Cookies y Almacenamiento Esencial</strong>
                  <span class="badge-always">Siempre activas</span>
                </div>
                <p>
                  Indispensables para que el sitio funcione: mantienen tu sesión segura (Supabase),
                  guardan los productos de tu carrito y recuerdan tu decisión sobre este aviso. No
                  almacenan datos con fines publicitarios.
                </p>
              </div>
              <div class="category-switch">
                <label class="switch disabled" title="Obligatorias para el funcionamiento">
                  <input type="checkbox" checked disabled />
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <!-- 2. Analíticas (GA4) -->
            <div class="cookie-category-item">
              <div class="category-info">
                <div class="category-header">
                  <strong>📊 Cookies Analíticas y de Estadística (Google Analytics 4)</strong>
                </div>
                <p>
                  Nos permiten medir de forma agregada y con IP anonimizada las visitas al sitio,
                  las búsquedas, las páginas más vistas y confirmar compras reales para mejorar
                  nuestro catálogo.
                </p>
              </div>
              <div class="category-switch">
                <label class="switch">
                  <input type="checkbox" v-model="analyticsEnabled" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <!-- 3. Marketing / Redes Sociales -->
            <div class="cookie-category-item">
              <div class="category-info">
                <div class="category-header">
                  <strong>📣 Cookies de Campañas y Redes Sociales (Meta / Instagram / Ads)</strong>
                </div>
                <p>
                  Permiten identificar cuando visitas nuestra tienda desde nuestras campañas o
                  publicaciones en Instagram, Facebook o anuncios digitales, para medir el alcance
                  de nuestras promociones.
                </p>
              </div>
              <div class="category-switch">
                <label class="switch">
                  <input type="checkbox" v-model="marketingEnabled" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="cookie-config-footer">
            <button type="button" class="btn-cookie btn-save-custom" @click="handleSaveCustom">
              Guardar mis preferencias
            </button>
          </div>
        </div>
      </transition>
    </aside>
  </transition>
</template>

<style scoped>
.cookie-consent-banner {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  max-width: 1020px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.99);
  border: 1.5px solid var(--brand-pink, #f06292);
  border-radius: 14px;
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.2);
  padding: 16px 22px;
  z-index: 9998;
  backdrop-filter: blur(8px);
}

.cookie-consent-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.cookie-consent-text {
  flex: 1;
}

.cookie-title {
  margin: 0 0 6px 0;
  font-weight: 700;
  font-size: 0.98rem;
  color: var(--color-heading, #2c3e50);
}

.cookie-description {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--color-text, #4a5568);
}

.cookie-link {
  color: var(--brand-pink, #e91e63);
  font-weight: 600;
  text-decoration: underline;
}

.cookie-consent-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.btn-cookie {
  padding: 9px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-config {
  background: #fdf2f8;
  color: #be185d;
  border: 1px solid #f9a8d4;
}

.btn-config:hover {
  background: #fce7f3;
}

.btn-essential {
  background: transparent;
  color: var(--color-text, #4a5568);
  border: 1px solid var(--color-border, #cbd5e0);
}

.btn-essential:hover {
  background: #f7fafc;
}

.btn-accept {
  background: var(--brand-pink, #f06292);
  color: #ffffff;
  border: 1px solid var(--brand-pink, #f06292);
}

.btn-accept:hover {
  filter: brightness(0.95);
  transform: translateY(-1px);
}

/* Panel desplegable granular */
.cookie-config-panel {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e2e8f0;
}

.cookie-category-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cookie-category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 14px;
}

.category-info {
  flex: 1;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.88rem;
  color: #1e293b;
  margin-bottom: 4px;
}

.badge-always {
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}

.category-info p {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: #64748b;
}

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #cbd5e1;
  transition: 0.25s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.25s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--brand-pink, #f06292);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.switch.disabled .slider {
  background-color: #94a3b8;
  cursor: not-allowed;
}

.cookie-config-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.btn-save-custom {
  background: var(--brand-turquoise, #00bcd4);
  color: #fff;
  border: none;
  padding: 9px 18px;
}

.btn-save-custom:hover {
  filter: brightness(0.95);
}

.cookie-slide-enter-active,
.cookie-slide-leave-active,
.cookie-expand-enter-active,
.cookie-expand-leave-active {
  transition: all 0.25s ease;
}

.cookie-slide-enter-from,
.cookie-slide-leave-to,
.cookie-expand-enter-from,
.cookie-expand-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 768px) {
  .cookie-consent-banner {
    bottom: 10px;
    left: 10px;
    right: 10px;
    padding: 14px 15px;
    max-height: 88vh;
    overflow-y: auto;
  }

  .cookie-consent-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .cookie-consent-actions {
    width: 100%;
    flex-wrap: wrap;
    justify-content: stretch;
  }

  .btn-cookie {
    flex: 1;
    text-align: center;
  }

  .btn-save-custom {
    width: 100%;
  }
}
</style>
