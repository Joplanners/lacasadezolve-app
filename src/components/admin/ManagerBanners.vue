<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useBannersStore } from '@/stores/storeBanners'
import { useToast } from 'vue-toastification'

const bannersStore = useBannersStore()
const toast = useToast()

const banners = computed(() => bannersStore.banners)
const loading = computed(() => bannersStore.loading)
const error = computed(() => bannersStore.error)

// Estado para el formulario de nuevo banner
const newBannerFile = ref(null)
const newBannerAltText = ref('')
const newBannerLinkUrl = ref('')
const fileInputKey = ref(Date.now()) // Para poder resetear el input de archivo

// Lógica para sugerir el siguiente número de orden
const newBannerSortOrder = ref(0)
const suggestedSortOrder = computed(() => {
  if (!banners.value || banners.value.length === 0) return 0
  const maxOrder = Math.max(...banners.value.map((b) => b.sort_order))
  return maxOrder + 1
})
watch(suggestedSortOrder, (newValue) => {
  newBannerSortOrder.value = newValue
})

onMounted(() => {
  bannersStore.fetchAllBanners()
})

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file && file.type.startsWith('image/')) {
    newBannerFile.value = file
  } else {
    newBannerFile.value = null
    toast.error('Por favor, selecciona un archivo de imagen válido.')
  }
}

const handleSubmit = async () => {
  if (!newBannerFile.value) {
    toast.error('Debes seleccionar una imagen para el banner.')
    return
  }

  const bannerData = {
    alt_text: newBannerAltText.value,
    link_url: newBannerLinkUrl.value || null,
    sort_order: newBannerSortOrder.value,
    is_active: true,
  }

  const result = await bannersStore.createBanner(bannerData, newBannerFile.value)

  if (result.success) {
    toast.success('¡Nuevo banner subido y guardado con éxito!')
    newBannerFile.value = null
    newBannerAltText.value = ''
    newBannerLinkUrl.value = ''
    newBannerSortOrder.value = suggestedSortOrder.value // Se actualiza al nuevo sugerido
    fileInputKey.value = Date.now()
  } else {
    toast.error(result.error || 'Ocurrió un error al crear el banner.')
  }
}

const handleToggleActive = async (banner) => {
  const newStatus = !banner.is_active
  const result = await bannersStore.updateBanner(banner.id, { is_active: newStatus })
  if (result.success) {
    toast.success(`Banner ${newStatus ? 'activado' : 'desactivado'}.`)
  } else {
    toast.error('No se pudo actualizar el estado del banner.')
  }
}

const handleDelete = async (banner) => {
  if (
    confirm(`¿Estás segura de que quieres eliminar el banner "${banner.alt_text || 'sin nombre'}"?`)
  ) {
    const result = await bannersStore.deleteBanner(banner.id)
    if (result.success) {
      toast.success('Banner eliminado.')
    } else {
      toast.error('No se pudo eliminar el banner.')
    }
  }
}
</script>

<template>
  <div class="manager-banners">
    <div class="manager-header">
      <h2>Gestionar Banners del Home</h2>
      <p class="subtitle">
        Sube, ordena y activa los banners que aparecen en el carrusel principal.
      </p>
    </div>

    <div class="card add-banner-form">
      <h3>Añadir Nuevo Banner</h3>
      <form @submit.prevent="handleSubmit">
        <div class="form-grid">
          <div class="form-group">
            <label for="bannerFile">Imagen del Banner</label>
            <input
              type="file"
              id="bannerFile"
              @change="handleFileChange"
              accept="image/*"
              required
              :key="fileInputKey"
            />
          </div>
          <div class="form-group">
            <label for="altText">Texto Alternativo (para SEO y accesibilidad)</label>
            <input
              type="text"
              id="altText"
              v-model="newBannerAltText"
              placeholder="Ej: Promoción agendas 2025"
            />
          </div>
          <div class="form-group">
            <label for="linkUrl">URL de Destino (opcional)</label>
            <input
              type="url"
              id="linkUrl"
              v-model="newBannerLinkUrl"
              placeholder="Ej: https://lacasadezolve.com/tienda"
            />
          </div>
          <div class="form-group">
            <label for="sortOrder">Orden de Aparición</label>
            <input type="number" id="sortOrder" v-model.number="newBannerSortOrder" min="0" />
            <small
              >Un número menor aparece primero. Se sugiere automáticamente el siguiente
              número.</small
            >
          </div>
        </div>
        <button type="submit" :disabled="loading" class="btn-primary">
          {{ loading ? 'Subiendo...' : 'Añadir Banner' }}
        </button>
      </form>
    </div>

    <div class="card banners-list">
      <h3>Banners Actuales</h3>
      <div v-if="loading && banners.length === 0" class="feedback-state">Cargando banners...</div>
      <div v-else-if="error" class="feedback-state error">{{ error }}</div>
      <div v-else-if="banners.length === 0" class="feedback-state">No hay banners creados.</div>
      <div v-else class="banner-items-container">
        <div v-for="banner in banners" :key="banner.id" class="banner-item">
          <img :src="banner.image_url" :alt="banner.alt_text" class="thumbnail" />
          <div class="banner-info">
            <p><strong>Texto Alt:</strong> {{ banner.alt_text || '-' }}</p>
            <p><strong>Link:</strong> {{ banner.link_url || '-' }}</p>
            <p><strong>Orden:</strong> {{ banner.sort_order }}</p>
          </div>
          <div class="banner-actions">
            <button
              @click="handleToggleActive(banner)"
              :class="banner.is_active ? 'btn-deactivate' : 'btn-activate'"
            >
              {{ banner.is_active ? 'Desactivar' : 'Activar' }}
            </button>
            <button @click="handleDelete(banner)" class="btn-delete">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Estilos generales (similares a ManagerFeaturedProducts) */
.manager-banners {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
.manager-header {
  margin-bottom: 30px;
}
h2 {
  font-size: 2rem;
}
.subtitle {
  color: var(--color-text);
}
.card {
  background-color: var(--color-background-soft);
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 20px;
}
h3 {
  margin-top: 0;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group label {
  margin-bottom: 8px;
  font-weight: 500;
}
.form-group input {
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
}
.form-group small {
  font-size: 0.8em;
  color: #666;
  margin-top: 4px;
}
.btn-primary {
  background-color: var(--brand-turquoise);
  color: white;
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}
.btn-primary:disabled {
  background-color: #ccc;
}

/* Lista de Banners */
.feedback-state {
  text-align: center;
  padding: 20px;
  font-style: italic;
}
.banner-items-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.banner-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  padding: 15px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}
.thumbnail {
  width: 150px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
}
.banner-info {
  flex-grow: 1;
  min-width: 200px;
}
.banner-info p {
  margin: 4px 0;
  font-size: 0.9rem;
  word-break: break-all;
}
.banner-actions {
  display: flex;
  gap: 10px;
}
.banner-actions button {
  padding: 8px 15px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-activate {
  background-color: #28a745;
  color: white;
}
.btn-deactivate {
  background-color: #ffc107;
  color: #333;
}
.btn-delete {
  background-color: #dc3545;
  color: white;
}

@media (max-width: 600px) {
  .banner-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
