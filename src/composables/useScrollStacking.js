/**
 * Composable reutilizable para el efecto de stacking con GSAP ScrollTrigger.
 * Cada sección se "pinea" y la siguiente se sobrepone al hacer scroll.
 *
 * Uso:
 *   const { initStacking, destroyStacking } = useScrollStacking()
 *   onMounted(() => initStacking(sectionRefs))
 *   onUnmounted(() => destroyStacking())
 */
import { ref } from 'vue'

let gsap = null
let ScrollTrigger = null
const isReady = ref(false)

async function loadGSAP() {
  if (gsap && ScrollTrigger) return
  const gsapModule = await import('gsap')
  const stModule = await import('gsap/ScrollTrigger')
  gsap = gsapModule.default
  ScrollTrigger = stModule.ScrollTrigger
  gsap.registerPlugin(ScrollTrigger)
  isReady.value = true
}

export function useScrollStacking() {
  /**
   * Inicializa el efecto de stacking en las secciones dadas.
   * @param {HTMLElement[]} sections - Array de elementos DOM (las secciones)
   * @param {Object} options - Opciones de personalización
   * @param {boolean} options.fadeIn - Si las secciones aparecen con fade (default: true)
   * @param {boolean} options.blur - Si las secciones aparecen con blur (default: true)
   */
  async function initStacking(sections, options = {}) {
    const { fadeIn = true, blur = true } = options
    await loadGSAP()

    sections.forEach((section) => {
      if (!section) return

      // Pin each section so the next scrolls over it
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        pin: true,
        pinSpacing: false,
      })

      // Animate title on enter
      if (fadeIn) {
        const title = section.querySelector('.stack-title')
        if (title) {
          gsap.from(title, {
            scrollTrigger: {
              trigger: section,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
            opacity: 0,
            y: 40,
            duration: 0.6,
            ease: 'power2.out',
          })
        }
      }

      // Stamp effect on product cards (staggered)
      const cards = section.querySelectorAll('.product-card')
      if (cards.length) {
        cards.forEach((card, i) => {
          gsap.from(card, {
            scrollTrigger: {
              trigger: section,
              start: 'top 60%',
              toggleActions: 'play none none reverse',
            },
            scale: 1.8,
            opacity: 0,
            rotation: i % 2 === 0 ? 12 : -8,
            duration: 0.5,
            delay: i * 0.3,
            ease: 'back.out(2)',
          })
        })
      }
    })
  }

  /**
   * Anima bloques con fade-in simple al hacer scroll.
   * @param {HTMLElement[]} blocks - Array de elementos a animar
   */
  async function initFadeInBlocks(blocks) {
    await loadGSAP()
    blocks.forEach((block, i) => {
      if (!block) return
      gsap.from(block, {
        scrollTrigger: {
          trigger: block,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
        opacity: 0,
        y: 40,
        duration: 0.6,
        delay: i * 0.15,
        ease: 'power2.out',
      })
    })
  }

  /**
   * Anima un hero con logo bounce + título + typewriter texto + shimmer.
   * @param {HTMLElement} heroEl - El elemento contenedor del hero
   */
  async function initHeroAnimation(heroEl) {
    if (!heroEl) return
    await loadGSAP()

    const logo = heroEl.querySelector('.hero-logo-img')
    const title = heroEl.querySelector('.hero-title')
    const lines = heroEl.querySelectorAll('.hero-line[data-typewriter]')
    const shimmerEl = heroEl.querySelector('.hero-shimmer')

    const tl = gsap.timeline({ delay: 0.3 })

    // 1. Logo bounces in
    if (logo) {
      tl.to(logo, {
        scale: 1,
        opacity: 1,
        duration: 1,
        ease: 'elastic.out(1, 0.4)',
      })
    }

    // 2. Title fades in
    if (title) {
      tl.to(title, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
      }, '-=0.3')
    }

    // 3. Typewriter effect on each line
    lines.forEach((line) => {
      const text = line.textContent
      const isShimmer = line.classList.contains('hero-shimmer')
      line.textContent = ''
      line.style.opacity = '1'

      // Create a cursor element
      const cursor = document.createElement('span')
      cursor.className = 'typewriter-cursor'
      line.appendChild(cursor)

      // Type each character
      const chars = text.split('')
      chars.forEach((char, charIndex) => {
        tl.call(() => {
          cursor.remove()
          if (isShimmer) {
            // For shimmer, we need to set text without clearing the gradient
            line.textContent = text.slice(0, charIndex + 1)
          } else {
            line.textContent = text.slice(0, charIndex + 1)
          }
          line.appendChild(cursor)
        }, null, `>+${charIndex === 0 ? 0.3 : 0.03}`)
      })

      // Remove cursor after line finishes
      tl.call(() => {
        cursor.remove()
      }, null, '>+0.2')
    })

    // 4. Shimmer on last line
    if (shimmerEl) {
      tl.to(shimmerEl, {
        backgroundPosition: '200% center',
        duration: 1.5,
        ease: 'power1.inOut',
      }, '>+0.2')
    }
  }

  /**
   * Destruye todos los ScrollTriggers activos. Llamar en onUnmounted.
   */
  function destroyStacking() {
    if (ScrollTrigger) {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }

  return {
    isReady,
    initStacking,
    initFadeInBlocks,
    initHeroAnimation,
    destroyStacking,
  }
}
