<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

// Register troika-text when component mounts
function registerTroikaText() {
  if (typeof window === 'undefined' || !window.AFRAME) {
    console.warn('[ARText3D] A-Frame not available')
    return false
  }
  
  // Check if already registered
  if (window.AFRAME.components['troika-text']) {
    console.log('[ARText3D] troika-text already registered')
    return true
  }
  
  try {
    // Dynamic import to avoid SSR issues
    import('aframe-troika-text')
    console.log('[ARText3D] troika-text registered successfully')
    return true
  } catch (err) {
    console.error('[ARText3D] Error loading troika-text:', err)
    return false
  }
}

const props = defineProps({
  text: { type: String, default: '' },
  color: { type: String, default: '#FFFFFF' },
  fontSize: { type: Number, default: 0.5 },
  fontFamily: { type: String, default: 'Roboto' },
  position: { type: String, default: '0 0 0' },
  animation: { type: String, default: 'fadeIn' }, // 'fadeIn', 'scaleIn', 'bounceIn', 'none'
  visible: { type: Boolean, default: false },
  textAlign: { type: String, default: 'center' },
  maxWidth: { type: Number, default: 2 },
  outlineWidth: { type: Number, default: 0.02 },
  outlineColor: { type: String, default: '#000000' }
})

const textRef = ref(null)
const isAnimating = ref(false)

// Animation keyframes
const animations = {
  fadeIn: 'property: opacity; from: 0; to: 1; dur: 800; easing: easeOutQuad',
  scaleIn: 'property: scale; from: 0 0 0; to: 1 1 1; dur: 600; easing: easeOutBack',
  bounceIn: 'property: scale; from: 0 0 0; to: 1.1 1.1 1.1; dur: 400; easing: easeOutQuad',
  bounceBack: 'property: scale; from: 1.1 1.1 1.1; to: 1 1 1; dur: 200; easing: easeInQuad'
}

// Watch visibility to trigger animations
watch(() => props.visible, (newVal) => {
  if (newVal && textRef.value && props.animation !== 'none') {
    triggerAnimation()
  }
})

function triggerAnimation() {
  if (!textRef.value || isAnimating.value) return
  
  isAnimating.value = true
  const el = textRef.value
  
  if (props.animation === 'fadeIn') {
    el.setAttribute('animation', animations.fadeIn)
  } else if (props.animation === 'scaleIn') {
    el.setAttribute('animation', animations.scaleIn)
  } else if (props.animation === 'bounceIn') {
    el.setAttribute('animation', animations.bounceIn)
    // Add bounce back after initial animation
    setTimeout(() => {
      el.setAttribute('animation', animations.bounceBack)
    }, 400)
  }
  
  setTimeout(() => {
    isAnimating.value = false
  }, 1000)
}

onMounted(() => {
  registerTroikaText()
})

// Computed font URL based on fontFamily
const fontUrl = computed(() => {
  // Map common font names to Google Fonts URLs
  const fonts = {
    'Roboto': 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf',
    'Outfit': 'https://fonts.gstatic.com/s/outfit/v11/QGYpz_MVcBeNP4NJtEtq.ttf',
    'Poppins': 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrFJA.ttf',
    'Inter': 'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.ttf',
    'Lobster': 'https://fonts.gstatic.com/s/lobster/v28/neILzCirqoswsqX9zoKmM4MwWJU.ttf',
    'Dancing Script': 'https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7B1i0HTeB9q4g.ttf'
  }
  return fonts[props.fontFamily] || fonts['Roboto']
})

import { computed } from 'vue'
</script>

<template>
  <a-entity
    ref="textRef"
    :visible="visible"
    :position="position"
    :opacity="animation === 'fadeIn' ? 0 : 1"
    :scale="animation === 'scaleIn' || animation === 'bounceIn' ? '0 0 0' : '1 1 1'"
  >
    <a-entity
      troika-text
      :value="text"
      :color="color"
      :font-size="fontSize"
      :font="fontUrl"
      :align="textAlign"
      :max-width="maxWidth"
      :outline-width="outlineWidth"
      :outline-color="outlineColor"
      anchor="center"
      baseline="center"
    ></a-entity>
  </a-entity>
</template>

<style scoped>
/* No styles needed - A-Frame handles rendering */
</style>
