/**
 * Módulo centralizado de Google Analytics 4 (GA4) y Consentimiento Granular de Cookies
 * La Casa de Zolve SpA - Cumplimiento Ley N° 19.628 y Ley N° 21.719 (Chile)
 * ID de medición: G-209MS94TPM (lacasadezolve.com)
 */

export const GA4_MEASUREMENT_ID = 'G-209MS94TPM'
export const CONSENT_STORAGE_KEY = 'zolve_cookie_consent_v1'
const PURCHASE_TRACKED_PREFIX = 'zolve_ga4_purchase_'

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/**
 * Asegura que dataLayer y la función gtag existan en window
 */
function ensureGtagStub() {
  if (!isBrowser()) return
  window.dataLayer = window.dataLayer || []
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }
  }
}

/**
 * Obtiene el objeto de preferencias guardadas de cookies:
 * { essential: true, analytics: boolean, marketing: boolean, updatedAt: string } | null
 */
export function getCookieConsent() {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    if (raw === 'accepted') {
      return { essential: true, analytics: true, marketing: true }
    }
    if (raw === 'rejected') {
      return { essential: true, analytics: false, marketing: false }
    }
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return {
        essential: true,
        analytics: Boolean(parsed.analytics),
        marketing: Boolean(parsed.marketing),
        updatedAt: parsed.updatedAt || null,
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Inicializa GA4 con Google Consent Mode v2.
 * Por defecto bloquea las cookies analíticas y de marketing hasta que el usuario elija en el banner,
 * salvo que ya haya guardado sus preferencias previamente en este navegador.
 */
export function initGA4() {
  if (!isBrowser()) return

  ensureGtagStub()

  const saved = getCookieConsent()
  const analyticsGranted = saved?.analytics ? 'granted' : 'denied'
  const marketingGranted = saved?.marketing ? 'granted' : 'denied'

  // 1. Configurar estado por defecto de Consent Mode v2
  window.gtag('consent', 'default', {
    analytics_storage: analyticsGranted,
    ad_storage: marketingGranted,
    ad_user_data: marketingGranted,
    ad_personalization: marketingGranted,
    wait_for_update: 500,
  })

  // 2. Inyectar el script de gtag.js una única vez si aún no está en el DOM
  const existingScript = document.querySelector(
    `script[src*="googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}"]`
  )

  if (!existingScript) {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`
    document.head.appendChild(script)

    window.gtag('js', new Date())
    window.gtag('config', GA4_MEASUREMENT_ID, {
      anonymize_ip: true,
    })
  }
}

/**
 * Guarda preferencias granulares de cookies ({ analytics, marketing })
 */
export function saveCookiePreferences({ analytics = false, marketing = false } = {}) {
  if (!isBrowser()) return
  const payload = {
    essential: true,
    analytics: Boolean(analytics),
    marketing: Boolean(marketing),
    updatedAt: new Date().toISOString(),
  }

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload))
  } catch (err) {
    console.warn('No se pudo guardar el consentimiento en localStorage:', err)
  }

  initGA4()
  const analyticsState = payload.analytics ? 'granted' : 'denied'
  const marketingState = payload.marketing ? 'granted' : 'denied'

  window.gtag('consent', 'update', {
    analytics_storage: analyticsState,
    ad_storage: marketingState,
    ad_user_data: marketingState,
    ad_personalization: marketingState,
  })
}

/**
 * Usuario acepta todas las categorías de cookies
 */
export function acceptAnalyticsCookies() {
  saveCookiePreferences({ analytics: true, marketing: true })
}

/**
 * Usuario elige solo cookies esenciales (rechaza analíticas y marketing)
 */
export function rejectAnalyticsCookies() {
  saveCookiePreferences({ analytics: false, marketing: false })
}

/**
 * Permite al usuario reabrir el banner de consentimiento en cualquier momento
 * (Derecho de revocación fácil según Ley 21.719).
 */
export function openCookiePreferences() {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent('zolve:open-cookie-banner'))
}

/**
 * Registra una venta real en GA4 (evento 'purchase').
 * Incluye doble protección:
 * 1. Solo dispara si la orden tiene estado 'paid'.
 * 2. Guarda el ID de la orden en localStorage para no duplicar la venta al recargar la página.
 *
 * @param {Object} order Objeto de la orden cargado desde Supabase
 */
export function trackPurchase(order) {
  if (!isBrowser() || !order || !order.id) return

  // Candado 1: Solo órdenes efectivamente pagadas
  if (order.status !== 'paid') {
    return
  }

  // Candado 2: Evitar duplicados si el usuario refresca la página o vuelve por sus descargas
  const storageKey = `${PURCHASE_TRACKED_PREFIX}${order.id}`
  try {
    if (localStorage.getItem(storageKey)) {
      return
    }
  } catch {
    // Continuar si localStorage está restringido
  }

  ensureGtagStub()

  const items = Array.isArray(order.order_items)
    ? order.order_items.map((item) => ({
        item_id: String(item.product_id || item.product?.id || item.id),
        item_name: item.product?.name || item.product_name || 'Producto Zolve',
        price: Number(item.price_at_purchase ?? item.unit_price ?? item.product?.price ?? 0),
        quantity: Number(item.quantity || 1),
      }))
    : []

  window.gtag('event', 'purchase', {
    transaction_id: String(order.id),
    value: Number(order.total_amount || 0),
    currency: 'CLP',
    shipping: Number(order.shipping_cost || 0),
    items,
  })

  try {
    localStorage.setItem(storageKey, new Date().toISOString())
  } catch {
    // Ignorar error de almacenamiento
  }
}
