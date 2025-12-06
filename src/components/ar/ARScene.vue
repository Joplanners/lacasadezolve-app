<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

// Register Chroma Key Shader Component for A-Frame
if (typeof window !== 'undefined' && window.AFRAME) {
  window.AFRAME.registerShader('chromakey', {
    schema: {
      src: { type: 'map' },
      color: { type: 'color', default: '#00FF00', is: 'uniform' },
      transparent: { type: 'boolean', default: true, is: 'uniform' },
      keyColor: { type: 'color', default: '#00FF00', is: 'uniform' },
      similarity: { type: 'number', default: 0.4, is: 'uniform' },
      smoothness: { type: 'number', default: 0.08, is: 'uniform' }
    },
    
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    
    fragmentShader: `
      uniform sampler2D src;
      uniform vec3 keyColor;
      uniform float similarity;
      uniform float smoothness;
      varying vec2 vUv;
      
      void main() {
        vec4 videoColor = texture2D(src, vUv);
        
        float Y1 = 0.299 * keyColor.r + 0.587 * keyColor.g + 0.114 * keyColor.b;
        float Cr1 = keyColor.r - Y1;
        float Cb1 = keyColor.b - Y1;
        
        float Y2 = 0.299 * videoColor.r + 0.587 * videoColor.g + 0.114 * videoColor.b;
        float Cr2 = videoColor.r - Y2;
        float Cb2 = videoColor.b - Y2;
        
        float blend = smoothstep(similarity, similarity + smoothness, distance(vec2(Cr2, Cb2), vec2(Cr1, Cb1)));
        gl_FragColor = vec4(videoColor.rgb, videoColor.a * blend);
      }
    `
  });
}

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
const videoPlaneRef = ref(null)
const imagePlaneRef = ref(null)
const contentScalerRef = ref(null)

// Internal state for media loading
const isVideoPlaying = ref(false)

// --- A-Frame Event Handlers ---

const handleSceneLoaded = (event) => {
  emit('scene-loaded', event)
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
  if (!content || !content.content_url) return

  // CRITICAL FIX: Stop any playing video before switching content
  pauseVideo()
  const videoEl = videoAssetRef.value
  if (videoEl) {
    videoEl.pause()
    videoEl.currentTime = 0
    videoEl.muted = true // Mute to ensure no audio plays during transition
  }

  emit('content-loading-start')
  const type = content.type.toLowerCase()
  const url = getCacheBustedUrl(content.content_url)
  
  try {
    if (type === 'video') {
      await loadVideo(url)
    } else if (type === 'image') {
      await loadImage(url)
    }
    emit('content-loaded')
    
    // Auto-play if marker is visible
    if (props.isMarkerVisible && type === 'video') {
      playVideo()
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
  if (visible && props.currentContent?.type === 'video') {
    playVideo()
  } else {
    pauseVideo()
  }
})

function updatePlaneDimensions(content) {
  if (!content) return
  
  const type = content.type.toLowerCase()
  let width = 1
  let height = 1
  let finalScale = 1
  
  // Calculate auto-scale (object-fit: cover effect)
  if (content.auto_scale !== false) {
    // Auto-scale is enabled - simple approach that works
    if (type === 'video' && videoAssetRef.value) {
      const v = videoAssetRef.value
      if (v.videoWidth && v.videoHeight) {
        // Just use aspect ratio directly with a good multiplier
        const videoAspect = v.videoWidth / v.videoHeight
        
        // For portrait videos (taller than wide), scale up
        // For landscape videos (wider than tall), scale differently
        if (videoAspect < 1) {
          // Portrait video (9:16, etc) - needs more scale
          finalScale = 1.3
        } else {
          // Landscape video (16:9, etc)
          finalScale = 1.3
        }
      }
      
      if (videoPlaneRef.value) {
        videoPlaneRef.value.setAttribute('width', '1')
        videoPlaneRef.value.setAttribute('height', '1')
        videoPlaneRef.value.setAttribute('scale', `${finalScale} ${finalScale} 1`)
        videoPlaneRef.value.setAttribute('visible', 'true')
        
        // Apply chroma key shader if needed
        if (content.use_chroma_key) {
          videoPlaneRef.value.setAttribute('material', 'shader: chromakey; src: #videoAsset; transparent: true; side: double;')
        } else {
          videoPlaneRef.value.setAttribute('material', 'shader: flat; src: #videoAsset; transparent: true;')
        }
      }
    } else if (type === 'image' && imageAssetRef.value) {
      finalScale = 1.3
      
      if (imagePlaneRef.value) {
        imagePlaneRef.value.setAttribute('width', '1')
        imagePlaneRef.value.setAttribute('height', '1')
        imagePlaneRef.value.setAttribute('scale', `${finalScale} ${finalScale} 1`)
        imagePlaneRef.value.setAttribute('visible', 'true')
      }
    }
  } else {
    // Manual scale override
    finalScale = content.scale_override || 1
    
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
        
        if (content.use_chroma_key) {
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
  pauseVideo
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
