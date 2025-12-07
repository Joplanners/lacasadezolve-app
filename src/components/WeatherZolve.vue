<script setup>
import { ref, onMounted, computed } from 'vue'

const weatherData = ref(null)
const isLoading = ref(true)
const errorMsg = ref('')
const geolocationFailedOrDenied = ref(false)

const API_ENDPOINT_BASE = '/.netlify/functions/weather'

const fetchWeather = async (latitude = null, longitude = null) => {
  isLoading.value = true
  weatherData.value = null
  if (latitude !== null && longitude !== null) {
    errorMsg.value = ''
  }
  let endpoint = API_ENDPOINT_BASE
  if (latitude !== null && longitude !== null) {
    endpoint += `?lat=${latitude}&lon=${longitude}`
  }
  try {
    const response = await fetch(endpoint)
    if (!response.ok) {
      let errorDetail = `Error del servidor: ${response.status}`
      try {
        const errData = await response.json()
        errorDetail = errData.error || errorDetail
      } catch (e) {
        /*ignore*/
      }
      throw new Error(errorDetail)
    }
    const data = await response.json()
    if (data.error) {
      throw new Error(data.error)
    }
    weatherData.value = data
    if (latitude !== null && longitude !== null) {
      geolocationFailedOrDenied.value = false
    } else if (data.usedDefault) {
      if (!geolocationFailedOrDenied.value) geolocationFailedOrDenied.value = true
    }
  } catch (err) {
    console.error('Error fetching weather:', err)
    if (!errorMsg.value) {
      errorMsg.value = err.message || 'No se pudo cargar el clima.'
    }
  } finally {
    isLoading.value = false
  }
}

const requestWeather = () => {
  isLoading.value = true
  errorMsg.value = ''
  geolocationFailedOrDenied.value = false
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        geolocationFailedOrDenied.value = false
        fetchWeather(position.coords.latitude, position.coords.longitude)
      },
      (geoError) => {
        console.warn('[WeatherZolve] Geo Error:', geoError.message, `(Code: ${geoError.code})`)
        if (geoError.code === 1) {
          errorMsg.value = 'Permiso de ubicación denegado. Se mostrará clima de referencia.'
        } else if (geoError.code === 2) {
          errorMsg.value =
            'Tu ubicación no está disponible. Revisa los servicios de ubicación en tu dispositivo/navegador. Se mostrará clima de referencia.'
        } else if (geoError.code === 3) {
          errorMsg.value =
            'Tiempo agotado para obtener tu ubicación. Se mostrará clima de referencia.'
        } else {
          errorMsg.value =
            'No se pudo obtener tu ubicación precisa. Se mostrará clima de referencia.'
        }
        geolocationFailedOrDenied.value = true
        fetchWeather()
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    )
  } else {
    console.warn('[WeatherZolve] Geolocalización no soportada.')
    errorMsg.value =
      'Geolocalización no soportada en este navegador. Se mostrará clima de referencia.'
    geolocationFailedOrDenied.value = true
    fetchWeather()
  }
}

const weatherEmoji = computed(() => {
  if (!weatherData.value || !weatherData.value.description) return '🌍'
  const desc = weatherData.value.description.toLowerCase()
  if (desc.includes('soleado') || desc.includes('despejado') || desc.includes('clear')) return '☀️'
  if (
    desc.includes('parcialmente nublado') ||
    desc.includes('algo nublado') ||
    desc.includes('few clouds')
  )
    return '⛅'
  if (desc.includes('nubes dispersas') || desc.includes('scattered clouds')) return '☁️'
  if (
    desc.includes('nublado') ||
    desc.includes('cubierto') ||
    desc.includes('broken clouds') ||
    desc.includes('overcast clouds')
  )
    return '☁️'
  if (
    desc.includes('niebla') ||
    desc.includes('neblina') ||
    desc.includes('mist') ||
    desc.includes('fog')
  )
    return '🌫️'
  if (
    desc.includes('lluvia ligera') ||
    desc.includes('llovizna') ||
    desc.includes('light rain') ||
    desc.includes('drizzle')
  )
    return '🌦️'
  if (desc.includes('lluvia')) return '🌧️'
  if (desc.includes('tormenta')) return '⛈️'
  if (desc.includes('nieve')) return '❄️'
  return '🌡️'
})

// State for lazy loading - don't request on mount
const hasRequested = ref(false)

onMounted(() => {
  // No longer auto-request - wait for user interaction
  isLoading.value = false
})
</script>

<template>
  <div class="weather-zolve-widget">
    <!-- Initial state: Show button to request weather -->
    <div v-if="!hasRequested && !weatherData && !isLoading" class="weather-initial">
      <img src="/zolveClima.png" alt="Zolve Clima" class="zolve-icon" />
      <div class="weather-prompt">
        <p class="weather-prompt-text">Consulta el clima de tu zona</p>
        <button @click="hasRequested = true; requestWeather()" class="retry-button">
          📍 Ver mi clima
        </button>
      </div>
    </div>

    <div v-else-if="isLoading" class="weather-loading"><p>Obteniendo tu clima...</p></div>
    <div v-else-if="errorMsg && !weatherData" class="weather-error">
      <img src="/zolveClima.png" alt="Zolve Clima" class="zolve-icon-error" />
      <p>{{ errorMsg }}</p>
      <button @click="requestWeather" class="retry-button" v-if="geolocationFailedOrDenied">
        Intentar usar mi ubicación
      </button>
    </div>
    <div v-else-if="weatherData" class="weather-content">
      <img src="/zolveClima.png" alt="Zolve Clima" class="zolve-icon" />
      <div class="weather-info">
        <p class="weather-location">
          Clima para hoy en <strong>{{ weatherData.city }}</strong
          >:
          <span
            v-if="weatherData.usedDefault || geolocationFailedOrDenied"
            class="default-location-notice"
            >(ubicación de referencia)</span
          >
        </p>
        <div class="weather-details">
          <span class="weather-icon-emoji">{{ weatherEmoji }}</span>
          <span class="temperature">{{ weatherData.temperature }}°C</span>
          <span class="description">{{ weatherData.description }}</span>
        </div>
        <p
          v-if="weatherData.tempMin !== undefined && weatherData.tempMax !== undefined"
          class="temp-range"
        >
          Min: {{ weatherData.tempMin }}°C / Max: {{ weatherData.tempMax }}°C
        </p>
        <button
          @click="requestWeather"
          class="retry-button-small"
          v-if="geolocationFailedOrDenied || weatherData.usedDefault"
        >
          Usar mi ubicación actual
        </button>
      </div>
    </div>
    <div v-else class="weather-error">
      <img src="/zolveClima.png" alt="Zolve Clima" class="zolve-icon-error" />
      <p>Zorry 🦊, no se pudo cargar la información del clima.</p>
    </div>
  </div>
</template>

<style scoped>
.weather-zolve-widget {
  background-color: var(--color-background-mute, #f0f0f0);
  padding: 10px 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
  min-height: 70px;
  box-sizing: border-box;
  color: var(--color-text);
  position: relative;
}
.weather-initial {
  display: flex;
  align-items: center;
  gap: 15px;
}
.weather-prompt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}
.weather-prompt-text {
  margin: 0;
  font-size: 0.9em;
  color: var(--color-text-muted, #555);
}
.weather-loading p,
.weather-error p {
  margin: 0;
  font-style: italic;
  color: var(--color-text-muted, #555);
}
.weather-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  color: var(--color-text-muted);
  padding: 10px 0;
}
.weather-error p {
  color: var(--color-text-muted);
}
.zolve-icon-error {
  width: 30px;
  height: 30px;
  opacity: 0.7;
  margin-bottom: 5px;
}
.retry-button {
  background-color: var(--brand-turquoise);
  color: white;
  border: none;
  padding: 6px 12px;
  font-size: 0.85em;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 8px;
  font-weight: 500;
}
.retry-button:hover {
  background-color: var(--color-link-hover);
}
.retry-button-small {
  background-color: transparent;
  color: var(--brand-turquoise);
  border: 1px solid var(--brand-turquoise);
  padding: 3px 8px;
  font-size: 0.75em;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 5px;
  font-weight: 500;
  align-self: flex-start;
}
.retry-button-small:hover {
  background-color: rgba(var(--rgb-brand-turquoise, 77, 182, 172), 0.1);
  text-decoration: underline;
}
.weather-content {
  display: flex;
  align-items: center;
  gap: 15px;
  width: 100%;
  justify-content: center;
}
.zolve-icon {
  width: 50px;
  height: 50px;
  object-fit: contain;
  flex-shrink: 0;
}
.weather-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}
.weather-location {
  font-size: 0.9em;
  color: var(--color-text-muted, #333);
  margin: 0 0 5px;
}
.weather-location strong {
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-heading, #111);
}
.default-location-notice {
  font-size: 0.8em;
  color: var(--color-text-muted);
  font-style: italic;
  margin-left: 5px;
  display: inline-block;
}
.weather-details {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1em;
}
.weather-icon-emoji {
  font-size: 1.6em;
  line-height: 1;
}
.temperature {
  font-weight: var(--font-weight-bold, bold);
  color: var(--color-heading, #111);
}
.description {
  font-size: 0.9em;
  color: var(--color-text-soft, #444);
}
.temp-range {
  font-size: 0.8em;
  color: var(--color-text-muted, #555);
  margin: 3px 0 0;
}
@media (max-width: 767px) {
  .weather-zolve-widget {
    padding: 8px 10px;
    min-height: 60px;
  }
  .weather-content {
    gap: 10px;
  }
  .zolve-icon {
    width: 40px;
    height: 40px;
  }
  .weather-location {
    font-size: 0.8em;
    margin-bottom: 3px;
  }
  .weather-details {
    font-size: 1em;
    gap: 5px;
  }
  .weather-icon-emoji {
    font-size: 1.4em;
  }
  .description {
    font-size: 0.85em;
  }
  .temp-range {
    font-size: 0.75em;
  }
  .retry-button-small {
    align-self: center;
  }
}
@media (max-width: 480px) {
  .weather-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .zolve-icon {
    margin-bottom: 5px;
  }
  .weather-info {
    align-items: center;
    text-align: center;
  }
  .weather-details {
    justify-content: center;
  }
  .default-location-notice {
    display: block;
    text-align: center;
    margin-left: 0;
    margin-top: 3px;
  }
  .retry-button-small {
    align-self: center;
  }
}
</style>
