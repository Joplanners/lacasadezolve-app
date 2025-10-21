<template>
  <div class="admin-dashboard">
    <h3>Dashboard Principal</h3>

    <p class="welcome-message">
      ¡Bienvenida al panel, <strong>{{ authStore.user?.email || 'Admin' }}</strong
      >!
    </p>

    <h4>Resumen Rápido:</h4>
    <div v-if="loadingStats" class="loading-indicator"><p>Cargando estadísticas...</p></div>
    <div v-if="errorStats" class="error-message">
      <p>Error al cargar estadísticas: {{ errorStats }}</p>
    </div>
    <div v-if="!loadingStats && !errorStats" class="stats-container">
      <div class="stat-card">
        <h2>{{ userCount }}</h2>
        <p>Usuarios</p>
        <router-link :to="{ name: 'admin-users' }" class="btn-view">Gestionar</router-link>
      </div>
      <div class="stat-card">
        <h2>{{ markerCount }}</h2>
        <p>Marcadores</p>
        <router-link :to="{ name: 'admin-markers' }" class="btn-view">Gestionar</router-link>
      </div>
      <div class="stat-card">
        <h2>{{ contentCount }}</h2>
        <p>Contenidos</p>
        <router-link :to="{ name: 'admin-contents' }" class="btn-view">Gestionar</router-link>
      </div>
      <!-- NUEVA TARJETA PARA FOTOS MÁGICAS -->
      <div class="stat-card">
        <h2>{{ overlayImageCount }}</h2>
        <p>Fotos Mágicas</p>
        <router-link :to="{ name: 'admin-overlay-images' }" class="btn-view">Gestionar</router-link>
      </div>
    </div>

    <h4 class="latest-title">Actividad Reciente:</h4>
    <div v-if="loadingLatest" class="loading-indicator"><p>Cargando últimos registros...</p></div>
    <div v-if="errorLatest" class="error-message">
      <p>Error al cargar actividad reciente: {{ errorLatest }}</p>
    </div>

    <div v-if="!loadingLatest && !errorLatest" class="latest-container">
      <div class="latest-section">
        <h5>Últimos Usuarios Registrados</h5>
        <p v-if="latestUsers.length === 0">Ninguno.</p>
        <ul v-else class="latest-list">
          <li v-for="user in latestUsers" :key="user.id">
            <span class="email" :title="user.email">{{ user.email || 'N/A' }}</span>
            <span class="date">{{
              user.created_at ? new Date(user.created_at).toLocaleDateString('es-CL') : '-'
            }}</span>
            <span class="role">({{ user.role || 'user' }})</span>
          </li>
        </ul>
        <router-link :to="{ name: 'admin-users' }" class="btn-view-all"
          >Ver todos los usuarios</router-link
        >
      </div>

      <div class="latest-section">
        <h5>Últimos Marcadores Creados</h5>
        <p v-if="latestMarkers.length === 0">Ninguno.</p>
        <ul v-else class="latest-list">
          <li v-for="marker in latestMarkers" :key="marker.id">
            <span class="name" :title="marker.name">{{ marker.name || 'Sin Nombre' }}</span>
            <span class="date">{{
              marker.created_at ? new Date(marker.created_at).toLocaleDateString('es-CL') : '-'
            }}</span>
            <span class="extra" :title="marker.mind_file_name"
              >({{
                marker.mind_file_name ? '...' + marker.mind_file_name.split('/').pop() : '?'
              }})</span
            >
            <router-link
              :to="{ name: 'admin-marker-edit', params: { id: marker.id } }"
              class="btn-edit-inline"
              title="Editar Marcador"
              >Editar</router-link
            >
          </li>
        </ul>
        <router-link :to="{ name: 'admin-markers' }" class="btn-view-all"
          >Ver todos los marcadores</router-link
        >
      </div>

      <div class="latest-section">
        <h5>Últimos Contenidos Añadidos</h5>
        <p v-if="latestContents.length === 0">Ninguno.</p>
        <ul v-else class="latest-list">
          <li v-for="content in latestContents" :key="content.id">
            <span class="name" :title="content.name">{{ content.name || 'Sin Nombre' }}</span>
            <span class="date">{{
              content.created_at ? new Date(content.created_at).toLocaleDateString('es-CL') : '-'
            }}</span>
            <span class="extra">({{ content.type || '?' }})</span>
            <router-link
              :to="{ name: 'admin-content-edit', params: { id: content.id } }"
              class="btn-edit-inline"
              title="Editar Contenido"
              >Editar</router-link
            >
          </li>
        </ul>
        <router-link :to="{ name: 'admin-contents' }" class="btn-view-all"
          >Ver todos los contenidos</router-link
        >
      </div>
      <!-- NUEVA SECCIÓN PARA ÚLTIMAS FOTOS MÁGICAS -->
      <div class="latest-section">
        <h5>Últimas Fotos Mágicas Añadidas</h5>
        <p v-if="latestOverlayImages.length === 0">Ninguna.</p>
        <ul v-else class="latest-list">
          <li v-for="overlay in latestOverlayImages" :key="overlay.id">
            <span class="name" :title="overlay.image_name">{{
              overlay.image_name || 'Sin Nombre'
            }}</span>
            <span class="date">{{
              overlay.created_at ? new Date(overlay.created_at).toLocaleDateString('es-CL') : '-'
            }}</span>
            <span class="extra">({{ overlay.is_public ? 'Pública' : 'Privada' }})</span>
            <router-link
              :to="{ name: 'admin-overlay-image-edit', params: { id: overlay.id } }"
              class="btn-edit-inline"
              title="Editar Foto Mágica"
              >Editar</router-link
            >
          </li>
        </ul>
        <router-link :to="{ name: 'admin-overlay-images' }" class="btn-view-all"
          >Ver todas las Fotos Mágicas</router-link
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import { RouterLink } from 'vue-router'

const authStore = useAuthStore()

const userCount = ref(0)
const markerCount = ref(0)
const contentCount = ref(0)
const overlayImageCount = ref(0) // Nuevo contador
const loadingStats = ref(true)
const errorStats = ref('')

const latestUsers = ref([])
const latestMarkers = ref([])
const latestContents = ref([])
const latestOverlayImages = ref([]) // Nueva lista
const loadingLatest = ref(true)
const errorLatest = ref('')

async function fetchData() {
  loadingStats.value = true
  loadingLatest.value = true
  errorStats.value = ''
  errorLatest.value = ''
  try {
    const [statsRes, latestUsersRes, latestMarkersRes, latestContentsRes, latestOverlayImagesRes] =
      await Promise.all([
        Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('markers').select('id', { count: 'exact', head: true }),
          supabase.from('contents').select('id', { count: 'exact', head: true }),
          supabase.from('overlay_images').select('id', { count: 'exact', head: true }), // Conteo de overlay_images
        ]).catch((err) => ({ error: err })),
        supabase.rpc('get_all_users_with_profiles', { search_term: '' }), // Asegúrate que este RPC exista y funcione
        supabase
          .from('markers')
          .select('id, name, mind_file_name, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('contents')
          .select('id, name, type, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('overlay_images')
          .select('id, image_name, created_at, is_public')
          .order('created_at', { ascending: false })
          .limit(5), // Fetch últimas overlay_images
      ])

    if (statsRes.error) {
      errorStats.value = statsRes.error.message || 'Error contando.'
    } else {
      const [userRes, markerRes, contentRes, overlayImgRes] = statsRes // Desestructurar el nuevo resultado
      userCount.value = userRes.count ?? 0
      markerCount.value = markerRes.count ?? 0
      contentCount.value = contentRes.count ?? 0
      overlayImageCount.value = overlayImgRes.count ?? 0 // Asignar conteo
    }
    loadingStats.value = false

    let latestErrorMsg = ''
    if (latestUsersRes.error) latestErrorMsg += `Usuarios: ${latestUsersRes.error.message}. `
    if (latestMarkersRes.error) latestErrorMsg += `Marcadores: ${latestMarkersRes.error.message}. `
    if (latestContentsRes.error) latestErrorMsg += `Contenidos: ${latestContentsRes.error.message}.`
    if (latestOverlayImagesRes.error)
      latestErrorMsg += `Fotos Mágicas: ${latestOverlayImagesRes.error.message}.` // Error para overlay_images

    if (latestErrorMsg) {
      errorLatest.value = latestErrorMsg
    } else {
      latestUsers.value = latestUsersRes.data || []
      latestMarkers.value = latestMarkersRes.data || []
      latestContents.value = latestContentsRes.data || []
      latestOverlayImages.value = latestOverlayImagesRes.data || [] // Asignar datos
    }
    loadingLatest.value = false
  } catch {
    const errorText = 'Error inesperado cargando dashboard.'
    if (!errorStats.value) errorStats.value = errorText
    if (!errorLatest.value) errorLatest.value = errorText
    loadingStats.value = false
    loadingLatest.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.admin-dashboard {
  padding: 15px;
}
.welcome-message {
  font-size: 1.1em;
  margin-bottom: 25px;
  color: #333;
}
.welcome-message strong {
  color: #0056b3;
}
h4 {
  margin-top: 30px;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}
.loading-indicator p,
.error-message p {
  font-style: italic;
  color: #555;
  padding: 10px;
}
.error-message p {
  color: red;
  font-weight: bold;
  border: 1px solid red;
  background-color: #ffebeb;
  margin-bottom: 15px;
}
.stats-container {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}
.stat-card {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  min-width: 150px;
  flex: 1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.stat-card h2 {
  font-size: 2.5em;
  margin: 0 0 5px 0;
  color: #007bff;
}
.stat-card p {
  margin: 0 0 15px 0;
  color: #6c757d;
  font-size: 0.95em;
}
.btn-view {
  display: inline-block;
  padding: 6px 12px;
  background-color: #17a2b8;
  color: white !important;
  border-radius: 4px;
  text-decoration: none;
  font-size: 0.9em;
  transition: background-color 0.2s ease;
}
.btn-view:hover {
  background-color: #138496;
}
.latest-title {
  margin-top: 40px;
}
.latest-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
  margin-top: 15px;
}
.latest-section {
  background-color: #fff;
  border: 1px solid #eee;
  padding: 15px;
  border-radius: 5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
}
.latest-section h5 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #444;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}
.latest-list {
  list-style: none;
  padding: 0;
  margin: 0 0 15px 0;
  flex-grow: 1;
}
.latest-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 0.9em;
  gap: 5px;
}
.latest-list li:last-child {
  border-bottom: none;
}
.latest-list .name,
.latest-list .email {
  font-weight: normal;
  color: #333;
  flex-shrink: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 5px;
}
.latest-list .name {
  font-weight: bold;
}
.latest-list .date {
  font-size: 0.85em;
  color: #777;
  white-space: nowrap;
  margin-left: auto;
}
.latest-list .role,
.latest-list .extra {
  font-size: 0.8em;
  color: #999;
  margin-left: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
} /* Aumentar un poco max-width para 'Pública/Privada' */
.btn-edit-inline {
  font-size: 0.8em !important;
  padding: 2px 6px !important;
  background-color: #ffc107;
  color: #333 !important;
  border-radius: 3px;
  text-decoration: none;
  margin-left: 8px;
}
.btn-edit-inline:hover {
  background-color: #e0a800;
}
.btn-view-all {
  display: block;
  margin-top: auto;
  padding-top: 10px;
  text-align: center;
  font-size: 0.85em;
  color: #007bff;
  text-decoration: none;
}
.btn-view-all:hover {
  text-decoration: underline;
}
</style>
