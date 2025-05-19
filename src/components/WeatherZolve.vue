<script setup>
import { ref, onMounted, computed } from 'vue'

const weatherData = ref(null)
const isLoading = ref(true)
const errorMsg = ref('')

const API_ENDPOINT = '/api/weather-by-ip' // O '/.netlify/functions/getWeatherByIp' si es Netlify Function

const fetchWeather = async () => {
  isLoading.value = true
  errorMsg.value = ''
  weatherData.value = null
  try {
    // Cambiado: fetch simple para GET, no necesita method: 'POST'
    const response = await fetch(API_ENDPOINT)
    if (!response.ok) {
      let errorDetail = `Error del servidor: ${response.status}`
      try {
        const errData = await response.json()
        errorDetail = errData.error || errorDetail
      } catch (e) {
        /* no se pudo parsear json */
      }
      throw new Error(errorDetail)
    }
    const data = await response.json()
    if (data.error) {
      throw new Error(data.error)
    }
    weatherData.value = data
  } catch (err) {
    console.error('Error fetching weather:', err)
    errorMsg.value = err.message || 'No se pudo cargar el clima.'
  } finally {
    isLoading.value = false
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

onMounted(() => {
  fetchWeather()
})
</script>

<template>
  <div class="weather-zolve-widget">
    <div v-if="isLoading" class="weather-loading">
      <p>Cargando clima...</p>
    </div>
    <div v-else-if="errorMsg" class="weather-error">
      <img src="/zolveClima.png" alt="Zolve Meteorólogo" class="zolve-icon-error" />
      <p>Zorry 🦊, no pude obtener el clima: {{ errorMsg }}</p>
    </div>
    <div v-else-if="weatherData" class="weather-content">
      <img src="/zolveClima.png" alt="Zolve Meteorólogo" class="zolve-icon" />
      <div class="weather-info">
        <p class="weather-location">
          Clima para hoy en <strong>{{ weatherData.city || 'tu ubicación' }}</strong
          >:
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
      </div>
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
}
.weather-loading p,
.weather-error p {
  margin: 0;
  font-style: italic;
  color: var(--color-text-muted, #555);
}
.weather-error {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-danger, red);
}
.zolve-icon-error {
  width: 30px;
  height: 30px;
  opacity: 0.7;
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
}
</style>
