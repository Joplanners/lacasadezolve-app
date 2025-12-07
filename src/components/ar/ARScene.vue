<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

// Import troika-text for premium 3D text support
// This will register the troika-text component with A-Frame
try {
  import('aframe-troika-text')
} catch (e) {
  console.warn('[ARScene] troika-text not available:', e)
}

// Function to register Chroma Key Shader for A-Frame
function registerChromaKeyShader() {
  if (typeof window === 'undefined' || !window.AFRAME) {
    console.warn('[ARScene] A-Frame not available for shader registration')
    return false
  }
  
  // Check if shader already registered
  if (window.AFRAME.shaders && window.AFRAME.shaders.chromakey) {
    console.log('[ARScene] Chroma key shader already registered')
    return true
  }
  
  try {
    window.AFRAME.registerShader('chromakey', {
      schema: {
        src: { type: 'map' },
        color: { type: 'color', default: '#00FF00' },
        transparent: { default: true }
      },
      
      init: function(data) {
        const videoEl = data.src
        if (!videoEl) return
        
        const texture = new window.THREE.VideoTexture(videoEl)
        texture.minFilter = window.THREE.LinearFilter
        texture.magFilter = window.THREE.LinearFilter
        texture.format = window.THREE.RGBAFormat
        
        // Parse the key color
        const keyColorStr = data.color || '#00FF00'
        const keyColor = new window.THREE.Color(keyColorStr)
        
        this.material = new window.THREE.ShaderMaterial({
          uniforms: {
            map: { value: texture },
            keyColor: { value: new window.THREE.Vector3(keyColor.r, keyColor.g, keyColor.b) },
            similarity: { value: 0.3 },  // Threshold: how much G must exceed R and B
            smoothness: { value: 0.15 }  // Edge smoothing
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D map;
            uniform vec3 keyColor;
            uniform float similarity;
            uniform float smoothness;
            varying vec2 vUv;
            
            void main() {
              vec4 texColor = texture2D(map, vUv);
              
              // Simple approach: detect if pixel is "green-ish"
              // A pixel is green if: green channel is high AND greater than red and blue
              float greenDominance = texColor.g - max(texColor.r, texColor.b);
              
              // If greenDominance is high (>0.3), it's a green pixel -> make transparent
              // similarity controls the threshold
              float alpha = 1.0 - smoothstep(similarity - smoothness, similarity + smoothness, greenDominance);
              
              gl_FragColor = vec4(texColor.rgb, texColor.a * alpha);
            }
          `,
          transparent: true,
          side: window.THREE.DoubleSide
        })
      },
      
      update: function(data) {
        // Handle updates if needed
        if (this.material && this.material.uniforms && data.src) {
          const videoEl = data.src
          if (videoEl && videoEl.tagName === 'VIDEO') {
            this.material.uniforms.map.value = new window.THREE.VideoTexture(videoEl)
          }
        }
      }
    })
    console.log('[ARScene] Chroma key shader registered successfully')
    return true
  } catch (err) {
    console.error('[ARScene] Error registering chroma key shader:', err)
    return false
  }
}

// Try to register immediately if A-Frame is available
registerChromaKeyShader()

const props = defineProps({
  mindFileUrl: String,
  currentContent: Object,
  isARReady: Boolean,
  isMarkerVisible: Boolean,
  isInBrowserFullscreen: Boolean,
  // Scaling props
  scaleFactor: { type: Number, default: 1.0 }
})

const emit = defineEmits([
  'scene-loaded',
  'ar-ready',
  'ar-error',
  'marker-found',
  'marker-lost',
  'content-loading-start',
  'content-loaded',
  'content-error'
])

const sceneRef = ref(null)
const videoAssetRef = ref(null)
const imageAssetRef = ref(null)
const audioAssetRef = ref(null)
const videoPlaneRef = ref(null)
const imagePlaneRef = ref(null)
const textPlaneRef = ref(null)
const contentScalerRef = ref(null)

// Internal state for media loading
const isVideoPlaying = ref(false)
const isAudioPlaying = ref(false)

// --- A-Frame Event Handlers ---

const handleSceneLoaded = (event) => {
  emit('scene-loaded', event)
  
  // Ensure chroma key shader is registered when A-Frame scene is ready
  registerChromaKeyShader()
  
  // Hide VR button immediately
  const sceneEl = event.target
  const vrButton = sceneEl.querySelector('.a-enter-vr-button')
  if (vrButton) {
    vrButton.style.display = 'none'
    vrButton.style.visibility = 'hidden'
  }
}

const handleArReady = () => {
  emit('ar-ready')
}

const handleArError = (event) => {
  emit('ar-error', event)
}

const handleTargetFound = () => {
  emit('marker-found')
}

const handleTargetLost = () => {
  emit('marker-lost')
  pauseVideo()
  pauseAudio()
}

// --- Media Loading & Control ---

const YOUR_R2_DOMAIN_IDENTIFIER = 'pub-48e6b80b718c43a99a9b98163de9920c.r2.dev'

function getCacheBustedUrl(url) {
  if (url && url.includes(YOUR_R2_DOMAIN_IDENTIFIER)) {
    const cacheBuster = `v=${Date.now()}`
    return `${url}${url.includes('?') ? '&' : '?'}${cacheBuster}`
  }
  return url
}

async function loadMedia(content) {
  if (!content) return

  // CRITICAL FIX: Stop any playing media before switching content
  pauseVideo()
  pauseAudio()
  
  const videoEl = videoAssetRef.value
  if (videoEl) {
    videoEl.pause()
    videoEl.currentTime = 0
    videoEl.muted = true // Mute to ensure no audio plays during transition
  }

  // Hide all planes first
  if (videoPlaneRef.value) videoPlaneRef.value.setAttribute('visible', 'false')
  if (imagePlaneRef.value) imagePlaneRef.value.setAttribute('visible', 'false')
  if (textPlaneRef.value) textPlaneRef.value.setAttribute('visible', 'false')

  emit('content-loading-start')
  const type = content.type.toLowerCase()
  const url = content.content_url ? getCacheBustedUrl(content.content_url) : null
  
  try {
    if (type === 'video') {
      await loadVideo(url)
    } else if (type === 'image') {
      await loadImage(url)
    } else if (type === 'text') {
      loadText(content)
    } else if (type === 'audio') {
      await loadAudio(url)
    }
    emit('content-loaded')
    
    // Auto-play if marker is visible
    if (props.isMarkerVisible) {
      if (type === 'video') {
        playVideo()
      } else if (type === 'audio') {
        playAudio()
      }
    }
  } catch (error) {
    console.error("Error loading media:", error)
    emit('content-error', error.message)
  }
}

function loadVideo(url) {
  return new Promise((resolve, reject) => {
    const videoEl = videoAssetRef.value
    if (!videoEl) return reject(new Error("Video element not found"))

    // Reset
    videoEl.pause()
    videoEl.removeAttribute('src')
    videoEl.load()

    const onLoaded = () => {
      cleanup()
      resolve()
    }

    const onError = (e) => {
      cleanup()
      reject(new Error(`Error loading video: ${e.type}`))
    }

    const cleanup = () => {
      videoEl.removeEventListener('loadeddata', onLoaded)
      videoEl.removeEventListener('error', onError)
    }

    videoEl.addEventListener('loadeddata', onLoaded, { once: true })
    videoEl.addEventListener('error', onError, { once: true })
    
    videoEl.crossOrigin = 'anonymous'
    videoEl.src = url
    videoEl.load()
  })
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const imgEl = imageAssetRef.value
    if (!imgEl) return reject(new Error("Image element not found"))

    const onLoad = () => {
      cleanup()
      resolve()
    }
    
    const onError = () => {
      cleanup()
      reject(new Error("Error loading image"))
    }

    const cleanup = () => {
      imgEl.removeEventListener('load', onLoad)
      imgEl.removeEventListener('error', onError)
    }

    imgEl.addEventListener('load', onLoad, { once: true })
    imgEl.addEventListener('error', onError, { once: true })
    
    imgEl.crossOrigin = 'anonymous'
    imgEl.src = url
  })
}

// Font URL mapping for troika-text
const fontUrls = {
  'Roboto': 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf',
  'Outfit': 'https://fonts.gstatic.com/s/outfit/v11/QGYpz_MVcBeNP4NJtEtq.ttf',
  'Poppins': 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrFJA.ttf',
  'Inter': 'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.ttf',
  'Lobster': 'https://fonts.gstatic.com/s/lobster/v28/neILzCirqoswsqX9zoKmM4MwWJU.ttf',
  'Dancing Script': 'https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7B1i0HTeB9q4g.ttf'
}

function loadText(content) {
  if (!textPlaneRef.value) return
  
  const textEl = textPlaneRef.value
  const text = content.text_content || ''
  const color = content.text_color || '#FFFFFF'
  const fontSize = content.text_font_size || 0.5
  const fontFamily = content.text_font_family || 'Roboto'
  const textStyle = content.text_style || 'simple'
  const animation = content.text_animation || 'fadeIn'
  
  console.log('[ARScene] loadText:', { text, color, fontSize, fontFamily, textStyle, animation })
  
  if (textStyle === '3d') {
    // Use troika-text for 3D premium text
    const fontUrl = fontUrls[fontFamily] || fontUrls['Roboto']
    
    textEl.setAttribute('troika-text', `
      value: ${text};
      color: ${color};
      fontSize: ${fontSize};
      font: ${fontUrl};
      maxWidth: 2;
      textAlign: center;
      anchorX: center;
      anchorY: middle;
      outlineWidth: 0.02;
      outlineColor: #000000;
    `)
    
    // Remove simple text attributes if any
    textEl.removeAttribute('value')
    textEl.removeAttribute('text')
  } else {
    // Use simple a-text
    textEl.removeAttribute('troika-text')
    textEl.setAttribute('value', text)
    textEl.setAttribute('color', color)
    textEl.setAttribute('width', (fontSize * 3).toString())
  }
  
  // Apply entry animation
  if (animation !== 'none') {
    textEl.setAttribute('opacity', '0')
    textEl.setAttribute('scale', '0.01 0.01 0.01')
    
    setTimeout(() => {
      if (animation === 'fadeIn') {
        textEl.setAttribute('animation', 'property: opacity; from: 0; to: 1; dur: 800; easing: easeOutQuad')
        textEl.setAttribute('animation__scale', 'property: scale; from: 0.01 0.01 0.01; to: 1 1 1; dur: 800; easing: easeOutQuad')
      } else if (animation === 'scaleIn') {
        textEl.setAttribute('opacity', '1')
        textEl.setAttribute('animation', 'property: scale; from: 0.01 0.01 0.01; to: 1 1 1; dur: 600; easing: easeOutBack')
      } else if (animation === 'bounceIn') {
        textEl.setAttribute('opacity', '1')
        textEl.setAttribute('animation', 'property: scale; from: 0.01 0.01 0.01; to: 1.1 1.1 1.1; dur: 400; easing: easeOutQuad')
        setTimeout(() => {
          textEl.setAttribute('animation', 'property: scale; from: 1.1 1.1 1.1; to: 1 1 1; dur: 200; easing: easeInQuad')
        }, 400)
      }
    }, 100)
  } else {
    textEl.setAttribute('opacity', '1')
    textEl.setAttribute('scale', '1 1 1')
  }
  
  textEl.setAttribute('visible', 'true')
}

async function playVideo() {
  const videoEl = videoAssetRef.value
  if (videoEl && videoEl.readyState >= 2) {
    try {
      videoEl.muted = false // Unmute when playing
      await videoEl.play()
      isVideoPlaying.value = true
    } catch (e) {
      console.warn("Autoplay prevented:", e)
    }
  }
}

function pauseVideo() {
  const videoEl = videoAssetRef.value
  if (videoEl) {
    videoEl.pause()
    isVideoPlaying.value = false
  }
}

// Note: loadText function is now defined earlier with 3D text support

// --- Audio Content ---
function loadAudio(url) {
  return new Promise((resolve, reject) => {
    const audioEl = audioAssetRef.value
    if (!audioEl) return reject(new Error("Audio element not found"))

    // Reset
    audioEl.pause()
    audioEl.removeAttribute('src')
    audioEl.load()

    const onLoaded = () => {
      cleanup()
      resolve()
    }

    const onError = (e) => {
      cleanup()
      reject(new Error(`Error loading audio: ${e.type}`))
    }

    const cleanup = () => {
      audioEl.removeEventListener('canplaythrough', onLoaded)
      audioEl.removeEventListener('error', onError)
    }

    audioEl.addEventListener('canplaythrough', onLoaded, { once: true })
    audioEl.addEventListener('error', onError, { once: true })
    
    audioEl.crossOrigin = 'anonymous'
    audioEl.src = url
    audioEl.load()
  })
}

async function playAudio() {
  const audioEl = audioAssetRef.value
  if (audioEl && audioEl.readyState >= 2) {
    try {
      await audioEl.play()
      isAudioPlaying.value = true
    } catch (e) {
      console.warn("Audio autoplay prevented:", e)
    }
  }
}

function pauseAudio() {
  const audioEl = audioAssetRef.value
  if (audioEl) {
    audioEl.pause()
    isAudioPlaying.value = false
  }
}

// --- Watchers ---

watch(() => props.currentContent, async (newContent, oldContent) => {
  if (newContent?.id !== oldContent?.id) {
    // Hide planes while loading
    if (videoPlaneRef.value) videoPlaneRef.value.setAttribute('visible', 'false')
    if (imagePlaneRef.value) imagePlaneRef.value.setAttribute('visible', 'false')
    
    await loadMedia(newContent)
    
    // Update Aspect Ratio and Visibility
    updatePlaneDimensions(newContent)
  }
}, { deep: true })

watch(() => props.isMarkerVisible, (visible) => {
  const type = props.currentContent?.type?.toLowerCase()
  if (visible) {
    if (type === 'video') {
      playVideo()
    } else if (type === 'audio') {
      playAudio()
    }
  } else {
    pauseVideo()
    pauseAudio()
  }
})

function updatePlaneDimensions(content) {
  if (!content) return
  
  const type = content.type.toLowerCase()
  let width = 1
  let height = 1
  let baseScale = 1
  let finalScale = 1
  
  console.log('[ARScene] updatePlaneDimensions:', {
    type,
    auto_scale: content.auto_scale,
    scale_override: content.scale_override,
    use_chroma_key: content.use_chroma_key
  })
  
  // Determine base scale
  if (content.auto_scale !== false) {
    // Auto-scale mode: use 1.3 as base
    baseScale = 1.3
  } else {
    // Manual mode: use 1.0 as base
    baseScale = 1.0
  }
  
  // Apply scale_override as a multiplier if provided
  if (content.scale_override && content.scale_override > 0) {
    finalScale = content.scale_override
  } else {
    finalScale = baseScale
  }
  
  console.log('[ARScene] Final scale:', finalScale)
  
  if (type === 'video' && videoAssetRef.value) {
    const v = videoAssetRef.value
    if (v.videoWidth && v.videoHeight) {
      height = v.videoHeight / v.videoWidth
    }
    
    if (videoPlaneRef.value) {
      videoPlaneRef.value.setAttribute('width', '1')
      videoPlaneRef.value.setAttribute('height', height.toString())
      videoPlaneRef.value.setAttribute('scale', `${finalScale} ${finalScale} 1`)
      videoPlaneRef.value.setAttribute('visible', 'true')
      
      // Apply chroma key shader if needed
      if (content.use_chroma_key) {
        console.log('[ARScene] Applying chroma key shader')
        videoPlaneRef.value.setAttribute('material', 'shader: chromakey; src: #videoAsset; transparent: true; side: double;')
      } else {
        videoPlaneRef.value.setAttribute('material', 'shader: flat; src: #videoAsset; transparent: true;')
      }
    }
  } else if (type === 'image' && imageAssetRef.value) {
    const i = imageAssetRef.value
    if (i.naturalWidth && i.naturalHeight) {
      height = i.naturalHeight / i.naturalWidth
    }
    
    if (imagePlaneRef.value) {
      imagePlaneRef.value.setAttribute('width', '1')
      imagePlaneRef.value.setAttribute('height', height.toString())
      imagePlaneRef.value.setAttribute('scale', `${finalScale} ${finalScale} 1`)
      imagePlaneRef.value.setAttribute('visible', 'true')
    }
  }
  
  // Apply position adjustments
  const posX = content.position_x || 0
  const posY = content.position_y || 0
  const posZ = content.position_z || 0
  
  if (type === 'video' && videoPlaneRef.value) {
    videoPlaneRef.value.setAttribute('position', `${posX} ${posY} ${posZ}`)
  } else if (type === 'image' && imagePlaneRef.value) {
    imagePlaneRef.value.setAttribute('position', `${posX} ${posY} ${posZ}`)
  }
}

// --- Lifecycle ---
// Expose methods if needed by parent
defineExpose({
  playVideo,
  pauseVideo,
  playAudio,
  pauseAudio
})
</script>

<template>
  <div class="ar-scene-wrapper">
    <a-scene
      v-if="mindFileUrl"
      ref="sceneRef"
      embedded
      :mindar-image="`imageTargetSrc: ${mindFileUrl}; autoStart: true; maxTrack: 1; uiLoading: no; uiError: no; uiScanning: no; filterMinCF: 0.0001; filterBeta: 0.01; warmupTolerance: 5; missTolerance: 5;`"
      vr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false"
      @loaded="handleSceneLoaded"
      @arReady="handleArReady"
      @arError="handleArError"
    >
      <!-- Assets: Removed timeout attribute to fix video loading issue -->
      <a-assets>
        <video
          ref="videoAssetRef"
          id="videoAsset"
          preload="auto"
          loop
          crossorigin="anonymous"
          playsinline
          webkit-playsinline
        ></video>
        <img
          ref="imageAssetRef"
          id="imageAsset"
          crossorigin="anonymous"
        />
        <audio
          ref="audioAssetRef"
          id="audioAsset"
          preload="auto"
          loop
          crossorigin="anonymous"
        ></audio>
      </a-assets>

      <a-camera
        position="0 0 0"
        look-controls="enabled: false"
        camera="active: false"
        cursor="rayOrigin: mouse; fuse: false;"
        raycaster="objects: .clickable; showLine: false;"
      ></a-camera>

      <a-entity 
        id="targetEntity" 
        mindar-image-target="targetIndex: 0"
        @targetFound="handleTargetFound"
        @targetLost="handleTargetLost"
      >
        <a-entity 
          ref="contentScalerRef" 
          id="contentScaler" 
          :scale="`${scaleFactor} ${scaleFactor} ${scaleFactor}`" 
          position="0 0 0"
        >
          <!-- Image Plane -->
          <a-image
            ref="imagePlaneRef"
            id="imagePlane"
            class="clickable"
            position="0 0 0"
            rotation="0 0 0"
            width="1"
            height="1"
            visible="false"
            src="#imageAsset"
            material="shader: flat; transparent: true;"
          ></a-image>

          <!-- Video Plane -->
          <a-video
            ref="videoPlaneRef"
            id="videoPlane"
            class="clickable"
            position="0 0 0"
            rotation="0 0 0"
            width="1"
            height="1"
            visible="false"
            src="#videoAsset"
            material="shader: flat; transparent: true;"
          ></a-video>

          <!-- Text Plane -->
          <a-text
            ref="textPlaneRef"
            id="textPlane"
            position="0 0 0"
            rotation="0 0 0"
            visible="false"
            align="center"
            anchor="center"
            baseline="center"
            color="#FFFFFF"
            value=""
            width="1.5"
            wrap-count="30"
          ></a-text>
        </a-entity>
      </a-entity>
    </a-scene>
  </div>
</template>

<style scoped>
.ar-scene-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: transparent;
}
a-scene {
  display: block;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background-color: transparent !important;
}

/* Force MindAR video to be visible */
a-scene video,
a-scene canvas {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}

/* Ensure the camera video feed is positioned correctly */
.mindar-ui-overlay,
.mindar-ui-loading,
.mindar-ui-compatibility {
  display: none !important;
}
</style>
