<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import { RouterLink, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()

const profileData = ref(null)
const loadingProfile = ref(true)
const errorProfile = ref('')
const isEditing = ref(false)
const editableProfileData = reactive({
  first_name: '',
  last_name: '',
  city: '',
  phone: '',
  birth_date: '',
  gender: '',
})
const savingProfile = ref(false)
const saveError = ref('')

const userMarkers = ref([])
const loadingMarkers = ref(true)
const errorMarkers = ref('')

const availableOverlays = ref([])
const loadingOverlays = ref(true)
const errorOverlays = ref('')

const R2_PUBLIC_BASE_URL = 'https://pub-48e6b80b718c43a99a9b98163de9920c.r2.dev'

function getOverlayImageUrl(r2Key) {
  if (!r2Key) return ''
  if (r2Key.startsWith('http://') || r2Key.startsWith('https://')) {
    return r2Key
  }
  return `${R2_PUBLIC_BASE_URL}/${r2Key}`
}

async function fetchFullProfile() {
  loadingProfile.value = true
  errorProfile.value = ''
  profileData.value = null
  if (!authStore.user?.id) {
    errorProfile.value = 'No se pudo obtener la información del usuario.'
    loadingProfile.value = false
    return
  }
  try {
    const baseData = { email: authStore.user.email, id: authStore.user.id }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authStore.user.id)
      .maybeSingle()
    if (error) throw error
    if (data) {
      profileData.value = { ...baseData, ...data }
    } else {
      profileData.value = baseData
    }
  } catch (error) {
    errorProfile.value = 'Error al cargar el perfil.'
  } finally {
    loadingProfile.value = false
  }
}

function startEditing() {
  if (!profileData.value) return
  Object.assign(editableProfileData, {
    first_name: profileData.value.first_name || '',
    last_name: profileData.value.last_name || '',
    city: profileData.value.city || '',
    phone: profileData.value.phone || '',
    birth_date: profileData.value.birth_date || '',
    gender: profileData.value.gender || '',
  })
  isEditing.value = true
  saveError.value = ''
}

function cancelEditing() {
  isEditing.value = false
  saveError.value = ''
}

async function saveProfile() {
  if (!profileData.value?.id) return
  savingProfile.value = true
  saveError.value = ''
  try {
    const updates = {
      first_name: editableProfileData.first_name || null,
      last_name: editableProfileData.last_name || null,
      city: editableProfileData.city || null,
      phone: editableProfileData.phone || null,
      birth_date: editableProfileData.birth_date || null,
      gender: editableProfileData.gender || null,
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', profileData.value.id)
    if (error) throw error
    profileData.value = { ...profileData.value, ...updates }
    isEditing.value = false
    toast.success('Perfil actualizado con éxito')
  } catch (error) {
    saveError.value = `Error al guardar: ${error.message}`
    toast.error(saveError.value)
  } finally {
    savingProfile.value = false
  }
}

async function fetchUserVisibleMarkers() {
  loadingMarkers.value = true
  errorMarkers.value = ''
  userMarkers.value = []
  const userId = authStore.user?.id
  if (!userId) {
    errorMarkers.value = 'No se pudo identificar al usuario para buscar marcadores.'
    loadingMarkers.value = false
    return
  }
  try {
    const { data, error } = await supabase
      .from('markers')
      .select(`id, name, mind_file_name`)
      .or(`is_public.eq.true,and(is_public.eq.false,user_id.eq.${userId})`)
      .order('name', { ascending: true })
    if (error) throw error
    userMarkers.value = (data || []).filter((marker) => marker.mind_file_name)
  } catch (error) {
    errorMarkers.value = 'Error al cargar los marcadores disponibles.'
    toast.error(errorMarkers.value)
  } finally {
    loadingMarkers.value = false
  }
}

async function fetchAvailableOverlays() {
  if (!authStore.user || !authStore.user.id) {
    errorOverlays.value = 'Usuario no autenticado.'
    loadingOverlays.value = false
    return
  }
  loadingOverlays.value = true
  errorOverlays.value = ''
  try {
    const { data, error } = await supabase.rpc(
      'get_available_overlay_images_for_user_or_admin_view',
      {
        p_user_id: authStore.user.id,
      },
    )
    if (error) throw error
    availableOverlays.value = data || []
  } catch (err) {
    errorOverlays.value = err.message || 'Error al cargar fotos mágicas disponibles.'
    toast.error(errorOverlays.value)
  } finally {
    loadingOverlays.value = false
  }
}

function startArExperience(experienceId) {
  router.push({ name: 'ar-experience', params: { markerId: experienceId } })
}

function startOverlayPhotoCapture(overlay) {
  router.push({ name: 'overlay-photo-capture', params: { overlayId: overlay.id } })
}

onMounted(() => {
  authStore
    .waitForAuthReady()
    .then(() => {
      if (authStore.isLoggedIn && authStore.user) {
        fetchFullProfile()
        fetchUserVisibleMarkers()
        fetchAvailableOverlays()
      } else {
        errorProfile.value = 'Debes iniciar sesión para ver tu perfil.'
        errorMarkers.value = 'Debes iniciar sesión para ver tus experiencias AR.'
        errorOverlays.value = 'Debes iniciar sesión para ver las fotos mágicas.'
        loadingProfile.value = false
        loadingMarkers.value = false
        loadingOverlays.value = false
      }
    })
    .catch((err) => {
      errorProfile.value = 'Error de autenticación.'
      errorMarkers.value = 'Error de autenticación.'
      errorOverlays.value = 'Error de autenticación.'
      loadingProfile.value = false
      loadingMarkers.value = false
      loadingOverlays.value = false
    })
})

const userDisplayName = computed(() => {
  if (profileData.value?.first_name) {
    return profileData.value.first_name
  }
  if (authStore.user?.email) {
    return authStore.user.email.split('@')[0]
  }
  return 'Usuario'
})
</script>

<template>
  <div class="profile-view">
    <div v-if="!isEditing">
      <h2>Perfil de {{ userDisplayName }}</h2>
    </div>
    <div v-else>
      <h2>Editando Perfil</h2>
    </div>

    <div v-if="loadingProfile" class="loading-indicator">Cargando perfil...</div>
    <div v-if="errorProfile && !loadingProfile" class="error-message">{{ errorProfile }}</div>

    <div v-if="profileData && !loadingProfile" class="profile-info">
      <div v-if="!isEditing">
        <p><strong>Email:</strong> {{ profileData.email || '-' }}</p>
        <p><strong>Nombre:</strong> {{ profileData.first_name || '(No especificado)' }}</p>
        <p><strong>Apellido:</strong> {{ profileData.last_name || '(No especificado)' }}</p>
        <p><strong>Ciudad:</strong> {{ profileData.city || '(No especificado)' }}</p>
        <p><strong>Teléfono:</strong> {{ profileData.phone || '(No especificado)' }}</p>
        <p>
          <strong>F. Nacimiento:</strong>
          {{
            profileData.birth_date
              ? new Date(profileData.birth_date + 'T00:00:00').toLocaleDateString('es-CL')
              : '(No especificada)'
          }}
        </p>
        <p><strong>Género:</strong> {{ profileData.gender || '(No especificado)' }}</p>
        <button @click="startEditing" class="btn btn-secondary btn-edit-profile">
          Editar Perfil
        </button>
      </div>
      <div v-else>
        <form @submit.prevent="saveProfile" class="edit-profile-form">
          <p><strong>Email:</strong> {{ profileData.email }} (No editable)</p>
          <div class="form-group">
            <label for="firstName">Nombre:</label>
            <input type="text" id="firstName" v-model="editableProfileData.first_name" />
          </div>
          <div class="form-group">
            <label for="lastName">Apellido:</label>
            <input type="text" id="lastName" v-model="editableProfileData.last_name" />
          </div>
          <div class="form-group">
            <label for="city">Ciudad:</label>
            <input type="text" id="city" v-model="editableProfileData.city" />
          </div>
          <div class="form-group">
            <label for="phone">Teléfono:</label>
            <input type="tel" id="phone" v-model="editableProfileData.phone" />
          </div>
          <div class="form-group">
            <label for="birthDate">Fecha Nacimiento:</label>
            <input type="date" id="birthDate" v-model="editableProfileData.birth_date" />
          </div>
          <div class="form-group">
            <label for="gender">Género:</label>
            <input type="text" id="gender" v-model="editableProfileData.gender" />
          </div>
          <p v-if="saveError" class="error-message form-save-error">{{ saveError }}</p>
          <div class="form-actions">
            <button type="submit" class="btn btn-save" :disabled="savingProfile">
              {{ savingProfile ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
            <button
              type="button"
              @click="cancelEditing"
              class="btn btn-cancel"
              :disabled="savingProfile"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>

    <hr v-if="(profileData || !loadingProfile) && !isEditing" class="section-divider" />

    <div v-if="!isEditing">
      <section class="experiences-section ar-experiences-section">
        <h3>Mis Experiencias AR</h3>
        <div v-if="loadingMarkers" class="loading-indicator">Buscando marcadores...</div>
        <div v-if="errorMarkers && !loadingMarkers" class="error-message">{{ errorMarkers }}</div>
        <div v-if="!loadingMarkers && userMarkers.length === 0 && !errorMarkers" class="no-items">
          No tienes experiencias AR disponibles.
        </div>
        <div v-if="!loadingMarkers && userMarkers.length > 0" class="items-grid ar-grid">
          <div v-for="marker in userMarkers" :key="marker.id" class="item-card ar-card">
            <div class="card-icon-placeholder">AR</div>
            <h4 class="card-title">{{ marker.name || 'Marcador sin nombre' }}</h4>
            <button @click="startArExperience(marker.id)" class="btn btn-primary">
              👁️ Iniciar AR
            </button>
          </div>
        </div>
      </section>

      <hr class="section-divider" />

      <section class="experiences-section overlay-experiences-section">
        <h3>Mis Fotos Mágicas</h3>
        <div v-if="loadingOverlays" class="loading-indicator">Cargando fotos mágicas...</div>
        <div v-if="errorOverlays" class="error-message">{{ errorOverlays }}</div>
        <div
          v-if="!loadingOverlays && !errorOverlays && availableOverlays.length === 0"
          class="no-items"
        >
          No hay fotos mágicas disponibles para ti.
        </div>
        <div
          v-if="!loadingOverlays && !errorOverlays && availableOverlays.length > 0"
          class="items-grid overlay-grid"
        >
          <div
            v-for="overlay in availableOverlays"
            :key="overlay.id"
            class="item-card overlay-card"
          >
            <img
              v-if="overlay.r2_key"
              :src="getOverlayImageUrl(overlay.r2_key)"
              :alt="overlay.image_name"
              class="card-thumbnail"
              @error="
                (e) => {
                  e.target.style.display = 'none'
                  const placeholder = e.target.nextElementSibling
                  if (placeholder) placeholder.style.display = 'flex'
                }
              "
            />
            <div
              v-if="overlay.r2_key"
              class="card-icon-placeholder thumbnail-error-placeholder"
              style="display: none"
              title="No se pudo cargar la vista previa"
            >
              🖼️?
            </div>
            <div v-else class="card-icon-placeholder">🖼️</div>
            <h4 class="card-title">{{ overlay.image_name }}</h4>
            <p v-if="overlay.description" class="card-description">{{ overlay.description }}</p>
            <button @click="startOverlayPhotoCapture(overlay)" class="btn btn-secondary">
              📸 Iniciar Foto
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-view {
  max-width: 700px;
  margin: 30px auto;
  padding: 25px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  font-family: var(--font-family-base);
  background-color: var(--vt-c-white);
}

.profile-view h2 {
  text-align: center;
  margin-bottom: 30px;
  color: var(--color-heading);
  font-size: 1.8rem;
  font-weight: var(--font-weight-semibold);
}
.edit-profile-form h2 {
  margin-bottom: 15px;
}

.profile-info {
  margin-bottom: 25px;
}
.profile-info p {
  margin-bottom: 10px;
  line-height: 1.7;
  color: var(--color-text);
  font-size: 0.95rem;
}
.profile-info strong {
  color: var(--color-text-muted);
  margin-right: 8px;
  display: inline-block;
  min-width: 110px;
  font-weight: var(--font-weight-medium);
}

.btn-edit-profile {
  margin-top: 15px;
}

.edit-profile-form .form-group {
  margin-bottom: 18px;
}
.edit-profile-form .form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: var(--font-weight-medium);
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
.edit-profile-form .form-group input[type='text'],
.edit-profile-form .form-group input[type='tel'],
.edit-profile-form .form-group input[type='date'] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-sizing: border-box;
  font-family: var(--font-family-base);
  font-size: 0.95rem;
}
.edit-profile-form .form-actions {
  margin-top: 30px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.edit-profile-form .form-save-error {
  margin-bottom: 20px; /* Para que no esté pegado a los botones */
}

.section-divider {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 35px 0;
}

.experiences-section {
  margin-bottom: 30px;
}
.experiences-section h3 {
  font-size: 1.5rem;
  color: var(--color-heading);
  margin-bottom: 20px;
  text-align: center;
  border-top: none;
  padding-top: 0;
  font-weight: var(--font-weight-medium);
}

.loading-indicator,
.error-message,
.no-items {
  padding: 15px;
  text-align: center;
  border-radius: 5px;
  margin: 20px auto;
  max-width: 90%;
  font-size: 0.95rem;
}
.loading-indicator {
  color: #555;
  font-style: italic;
}
.error-message {
  background-color: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
}
.no-items {
  background-color: #f1f8e9; /* Un verde claro para "no items" */
  color: #33691e;
  border: 1px solid #c5e1a5;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}
.item-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background-color: var(--vt-c-white);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition:
    transform 0.2s ease-in-out,
    box-shadow 0.2s ease-in-out;
  min-height: 280px; /* Para asegurar altura mínima de cards */
}
.item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-thumbnail {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid #eee;
  background-color: #f9f9f9;
}
.card-icon-placeholder {
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.8em;
  color: #d0d0d0;
  background-color: #f0f0f0;
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid #e5e5e5;
}
.thumbnail-error-placeholder {
  color: #e57373;
  background-color: #fff5f5;
  border-color: #ffcdd2;
}

.card-title {
  font-size: 1.05em;
  margin-top: 0;
  margin-bottom: 8px;
  color: var(--color-heading);
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
  overflow-wrap: break-word;
  word-break: break-word; /* Para nombres largos */
  hyphens: auto;
}
.card-description {
  font-size: 0.85em;
  color: #555;
  margin-bottom: 15px;
  line-height: 1.4;
  flex-grow: 1; /* Para que ocupe espacio y empuje botón hacia abajo */
  max-height: 4.2em; /* aprox 3 líneas */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}
.item-card .btn {
  margin-top: auto;
  width: calc(100% - 10px); /* Un poco menos del 100% para padding visual */
  padding: 9px 15px;
  font-size: 0.9em;
}

.btn {
  display: inline-flex; /* Para alinear icono y texto */
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.95em;
  transition:
    background-color 0.2s ease,
    transform 0.1s ease;
  margin: 5px;
  font-family: var(--font-family-base);
  font-weight: var(--font-weight-medium);
  gap: 8px; /* Espacio entre icono y texto del botón */
}
.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.btn-secondary {
  /* Para Editar Perfil y "Iniciar Foto" */
  background-color: var(--brand-turquoise);
  color: var(--vt-c-white) !important;
}
.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-link-hover);
}
.btn-primary {
  /* Para "Iniciar AR" */
  background-color: var(--brand-pink);
  color: var(--vt-c-white) !important;
}
.btn-primary:hover:not(:disabled) {
  background-color: #e65c7a;
}

.profile-view .btn-save {
  background-color: var(--brand-green);
  color: var(--vt-c-white) !important;
}
.profile-view .btn-save:hover:not(:disabled) {
  background-color: #388e3c;
}
.profile-view .btn-cancel {
  background-color: var(--brand-orange);
  color: var(--vt-c-white) !important;
}
.profile-view .btn-cancel:hover:not(:disabled) {
  background-color: #d04315;
}
.btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}

/* Estilos de tu ProfileView original para marker-list (si los quieres mantener o adaptar) */
.marker-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.marker-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}
.marker-list li:last-child {
  border-bottom: none;
}
.marker-list li span {
  color: var(--color-text);
  flex-grow: 1;
  margin-right: 15px;
}
/* Ya tenemos estilos generales para .btn, así que .btn-view-ar-small se puede simplificar o unificar */

@media (max-width: 640px) {
  .profile-view {
    width: 95%;
    margin: 20px auto;
    padding: 15px;
    border: none;
    box-shadow: none;
  }
  .profile-view h2 {
    font-size: 1.5rem;
    margin-bottom: 20px;
  }
  .experiences-section h3 {
    font-size: 1.25rem;
    margin-bottom: 15px;
  }

  .profile-info p {
    font-size: 0.9rem;
    flex-direction: column;
    align-items: flex-start;
  }
  .profile-info strong {
    min-width: unset;
    margin-bottom: 2px;
  }

  .edit-profile-form .form-group input[type='text'],
  .edit-profile-form .form-group input[type='tel'],
  .edit-profile-form .form-group input[type='date'] {
    padding: 10px;
    font-size: 0.9rem;
  }
  .edit-profile-form .form-actions {
    flex-direction: column;
    gap: 10px;
  }
  .edit-profile-form .form-actions .btn {
    width: 100%;
    margin: 0;
    padding: 10px;
    font-size: 0.95rem;
  }

  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); /* Más pequeñas en móvil */
    gap: 15px;
  }
  .item-card {
    min-height: auto;
    padding: 12px;
  } /* Altura automática y menos padding */
  .card-thumbnail,
  .card-icon-placeholder {
    height: 100px;
    margin-bottom: 8px;
  }
  .card-title {
    font-size: 0.95em;
    margin-bottom: 5px;
  }
  .card-description {
    font-size: 0.8em;
    margin-bottom: 10px;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    max-height: 2.8em;
  }
  .item-card .btn {
    font-size: 0.85em;
    padding: 8px 12px;
  }
}

@media (max-width: 400px) {
  .items-grid {
    grid-template-columns: 1fr; /* Una columna en pantallas muy pequeñas */
  }
  .profile-view h2 {
    font-size: 1.3rem;
  }
  .experiences-section h3 {
    font-size: 1.1rem;
  }
}
</style>
