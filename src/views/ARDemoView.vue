<template>
  <div class="demo-container">
    <header class="demo-header">
      <h1>Demo de Realidad Aumentada</h1>
      <p class="demo-subtitle">
        Prueba nuestras experiencias AR sin necesidad de registrarte
      </p>
    </header>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando marcadores...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p>⚠️ {{ error }}</p>
      <button @click="loadPublicMarkers" class="retry-button">Reintentar</button>
    </div>

    <!-- Markers Grid -->
    <div v-else-if="publicMarkers.length > 0" class="markers-grid">
      <div
        v-for="marker in publicMarkers"
        :key="marker.id"
        class="marker-card"
        @click="goToARExperience(marker.id)"
      >
        <div class="marker-image-container">
          <img
            v-if="marker.preview_image_url"
            :src="marker.preview_image_url"
            :alt="marker.name || 'Marcador AR'"
            class="marker-image"
          />
          <div v-else class="marker-placeholder">
            <span>🎯</span>
            <p class="marker-file-name">{{ marker.mind_file_name || 'Marcador AR' }}</p>
          </div>
        </div>
        <div class="marker-info">
          <h3>{{ marker.name || 'Marcador sin nombre' }}</h3>
          <p class="content-count">
            <span class="badge">{{ marker.contentCount || 0 }}</span>
            {{ marker.contentCount === 1 ? 'contenido' : 'contenidos' }}
          </p>
          <button class="try-button">Probar Ahora</button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <p>No hay marcadores públicos disponibles en este momento.</p>
      <p class="empty-hint">Vuelve pronto para ver nuevas experiencias AR.</p>
    </div>

    <!-- Instructions -->
    <section class="instructions">
      <h2>¿Cómo funciona?</h2>
      <ol>
        <li>Selecciona un marcador de la galería</li>
        <li>Permite el acceso a tu cámara cuando se solicite</li>
        <li>Apunta tu cámara al marcador impreso o en pantalla</li>
        <li>¡Disfruta de la experiencia AR!</li>
      </ol>
      <p class="compatibility-note">
        💡 <strong>Compatibilidad:</strong> Funciona mejor en dispositivos desde 2019 en adelante con navegadores modernos (Chrome, Safari).
      </p>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'

const router = useRouter()
const publicMarkers = ref([])
const isLoading = ref(true)
const error = ref(null)

async function loadPublicMarkers() {
  isLoading.value = true
  error.value = null

  try {
    console.log('[Demo] Fetching public markers...')
    
    // First, get public markers
    const { data: markersData, error: markersError } = await supabase
      .from('markers')
      .select(`
        id,
        name,
        mind_file_name,
        preview_image_url,
        created_at,
        marker_contents (
          content_id,
          contents (
            id,
            name,
            type
          )
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    console.log('[Demo] Query result:', { markersData, markersError })

    if (markersError) throw markersError

    // Transform data to include content count
    publicMarkers.value = (markersData || []).map(marker => ({
      ...marker,
      contentCount: marker.marker_contents?.length || 0
    }))
    
    console.log('[Demo] Public markers loaded:', publicMarkers.value.length)
  } catch (err) {
    console.error('[Demo] Error loading public markers:', err)
    error.value = 'No se pudieron cargar los marcadores. Intenta de nuevo.'
  } finally {
    isLoading.value = false
  }
}

function goToARExperience(markerId) {
  router.push({ name: 'ar-experience-demo', params: { markerId } })
}

onMounted(() => {
  loadPublicMarkers()
})
</script>

<style scoped>
.demo-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.demo-header {
  text-align: center;
  margin-bottom: 3rem;
}

.demo-header h1 {
  font-size: 2.5rem;
  color: var(--color-heading);
  margin-bottom: 0.5rem;
}

.demo-subtitle {
  font-size: 1.2rem;
  color: var(--color-text);
  opacity: 0.8;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--brand-pink);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state p {
  color: #d32f2f;
  margin-bottom: 1rem;
}

.retry-button {
  padding: 0.75rem 1.5rem;
  background-color: var(--brand-pink);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s;
}

.retry-button:hover {
  background-color: #e65c7a;
}

.markers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.marker-card {
  background: var(--color-background-soft);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  border: 1px solid var(--color-border);
}

.marker-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.marker-image-container {
  width: 100%;
  height: 200px;
  background: var(--color-background-mute);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.marker-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.marker-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.marker-card:hover .marker-image {
  transform: scale(1.05);
}

.marker-placeholder {
  font-size: 4rem;
  opacity: 0.3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.marker-file-name {
  font-size: 0.75rem;
  opacity: 0.6;
  margin: 0;
  text-align: center;
  padding: 0 1rem;
}

.marker-info {
  padding: 1.5rem;
}

.marker-info h3 {
  font-size: 1.25rem;
  color: var(--color-heading);
  margin-bottom: 0.5rem;
}

.marker-info p {
  font-size: 0.95rem;
  color: var(--color-text);
  opacity: 0.8;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.content-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.badge {
  background: linear-gradient(135deg, var(--brand-pink) 0%, var(--brand-turquoise) 100%);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.85rem;
}

.try-button {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, var(--brand-pink) 0%, var(--brand-turquoise) 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.3s;
}

.try-button:hover {
  opacity: 0.9;
}

.empty-state {
  color: var(--color-text);
}

.empty-hint {
  opacity: 0.6;
  margin-top: 0.5rem;
}

.instructions {
  background: var(--color-background-soft);
  border-radius: 12px;
  padding: 2rem;
  margin-top: 3rem;
}

.instructions h2 {
  color: var(--color-heading);
  margin-bottom: 1rem;
}

.instructions ol {
  margin-left: 1.5rem;
  margin-bottom: 1.5rem;
}

.instructions li {
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

.compatibility-note {
  background: rgba(255, 193, 7, 0.1);
  border-left: 4px solid #ffc107;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

@media (max-width: 767px) {
  .demo-container {
    padding: 1rem;
  }

  .demo-header h1 {
    font-size: 2rem;
  }

  .markers-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}
</style>
