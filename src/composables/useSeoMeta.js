import { useHead } from '@vueuse/head'
import { computed, unref } from 'vue'

const SITE_NAME = 'La Casa de Zolve'
const BASE_URL = 'https://lacasadezolve.com'
const DEFAULT_IMAGE = `${BASE_URL}/Zolve_Logo.webp`
const DEFAULT_DESCRIPTION =
  'Descubre papelería, K-Pop, regalos y productos con Realidad Aumentada. ¡La tienda K-Pop de Zolve en Chile!'

/**
 * Composable para configurar los meta tags SEO de cada página.
 *
 * @param {Object} options
 * @param {string|Ref<string>} options.title - Título de la página (se agrega " | La Casa de Zolve")
 * @param {string|Ref<string>} [options.description] - Descripción para SEO
 * @param {string|Ref<string>} [options.image] - URL de la imagen para OG/Twitter
 * @param {string|Ref<string>} [options.url] - Path relativo (ej: '/tienda')
 * @param {string} [options.type='website'] - Tipo de Open Graph (website, product, article)
 * @param {string} [options.robots] - Directiva robots (ej: 'noindex, nofollow')
 */
export function useSeoMeta(options) {
  const title = computed(() => {
    const t = unref(options.title)
    return t ? `${t} | ${SITE_NAME}` : SITE_NAME
  })

  const description = computed(() => unref(options.description) || DEFAULT_DESCRIPTION)
  const image = computed(() => unref(options.image) || DEFAULT_IMAGE)
  const url = computed(() => {
    const path = unref(options.url) || '/'
    return `${BASE_URL}${path}`
  })
  const type = options.type || 'website'

  const headConfig = {
    title,
    meta: [
      { name: 'description', content: description },
      // Open Graph
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: image },
      { property: 'og:url', content: url },
      { property: 'og:type', content: type },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:locale', content: 'es_CL' },
      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
    ],
    link: [{ rel: 'canonical', href: url }],
  }

  // Agregar robots solo si se especifica (para noindex, etc.)
  if (options.robots) {
    headConfig.meta.push({ name: 'robots', content: options.robots })
  }

  useHead(headConfig)
}
