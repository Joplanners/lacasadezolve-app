<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import Avatar from '@/components/Avatar.vue'
import regionesComunasData from '@/data/regiones_comunas.json'
import { isValidRut } from '@/utils/validation.js'

// --- Inicialización de Stores, Router y Toast ---
const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()

// --- Estado del Perfil ---
const profileData = ref(null)
const loadingProfile = ref(true)
const errorProfile = ref('')
const isEditing = ref(false)
const savingProfile = ref(false)
const saveError = ref('')

// --- Datos Editables del Perfil (Versión unificada) ---
const editableProfileData = reactive({
  first_name: '',
  last_name: '',
  city: '',
  phone: '',
  birth_date: '',
  gender: '',
  rut: '',
  shipping_region: '',
  shipping_commune: '',
  shipping_street: '',
  shipping_number: '',
  shipping_details: '',
})

// --- Estado para AR y Overlays ---
const userMarkers = ref([])
const loadingMarkers = ref(true)
const errorMarkers = ref('')
const availableOverlays = ref([])
const loadingOverlays = ref(true)
const errorOverlays = ref('')

// --- Estado para Historial de Pedidos ---
const userOrders = ref([])
const loadingOrders = ref(false)
const errorOrders = ref('')
const isDownloading = ref(false)

// --- Estado para Regiones y Comunas ---
const regions = ref(regionesComunasData)
const communes = ref([])

// --- Constantes ---
const R2_PUBLIC_BASE_URL = 'https://pub-48e6b80b718c43a99a9b98163de9920c.r2.dev'

// --- Funciones para obtener datos ---

async function fetchFullProfile(userId) {
  loadingProfile.value = true
  errorProfile.value = ''
  profileData.value = null
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('No se pudo obtener el usuario de Supabase.')
    const baseData = { email: user.email, id: user.id }

    const { data: profileDetails, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error // Ignora error si no hay perfil, pero no otros errores.

    profileData.value = { ...baseData, ...(profileDetails || {}) }
  } catch {
    errorProfile.value = 'Error al cargar el perfil.'
  } finally {
    loadingProfile.value = false
  }
}

async function fetchUserVisibleMarkers(userId) {
  loadingMarkers.value = true
  errorMarkers.value = ''
  userMarkers.value = []
  try {
    const { data, error } = await supabase
      .from('markers')
      .select(`id, name, mind_file_name`)
      .or(`is_public.eq.true,and(is_public.eq.false,user_id.eq.${userId})`)
      .order('name', { ascending: true })
    if (error) throw error
    userMarkers.value = (data || []).filter((marker) => marker.mind_file_name)
  } catch {
    errorMarkers.value = 'Error al cargar los marcadores disponibles.'
  } finally {
    loadingMarkers.value = false
  }
}

async function fetchAvailableOverlays(userId) {
  loadingOverlays.value = true
  errorOverlays.value = ''
  try {
    const { data, error } = await supabase.rpc(
      'get_available_overlay_images_for_user_or_admin_view',
      { p_user_id: userId },
    )
    if (error) throw error
    availableOverlays.value = data || []
  } catch (err) {
    errorOverlays.value = err.message || 'Error al cargar fotos mágicas disponibles.'
  } finally {
    loadingOverlays.value = false
  }
}

async function fetchUserOrders(userId) {
  if (!userId) return
  loadingOrders.value = true
  errorOrders.value = ''
  userOrders.value = []
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(
        `
                id,
                created_at,
                total_amount,
                status,
                order_items (
                    id,
                    quantity,
                    price_at_purchase,
                    product:products ( id, name, image_urls, is_downloadable )
                )
            `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    userOrders.value = data || []
  } catch {
    errorOrders.value = 'No se pudieron cargar tus pedidos.'
    toast.error(errorOrders.value)
  } finally {
    loadingOrders.value = false
  }
}

// --- Watcher principal para cambios en el usuario ---

watch(
  () => authStore.user,
  (currentUser) => {
    if (currentUser && currentUser.id) {
      fetchFullProfile(currentUser.id)
      fetchUserVisibleMarkers(currentUser.id)
      fetchAvailableOverlays(currentUser.id)
      fetchUserOrders(currentUser.id)
    } else {
      profileData.value = null
      userMarkers.value = []
      availableOverlays.value = []
      userOrders.value = []
      errorProfile.value = 'Debes iniciar sesión para ver tu perfil.'
      errorMarkers.value = 'Debes iniciar sesión para ver tus experiencias AR.'
      errorOverlays.value = 'Debes iniciar sesión para ver las fotos mágicas.'
      errorOrders.value = 'Debes iniciar sesión para ver tus pedidos.'
      loadingProfile.value = false
      loadingMarkers.value = false
      loadingOverlays.value = false
      loadingOrders.value = false
    }
  },
  { immediate: true },
)

// --- Watcher para actualizar comunas cuando cambia la región ---

watch(
  () => editableProfileData.shipping_region,
  (newRegionName) => {
    const region = regions.value.find((r) => r.region === newRegionName)
    if (region) {
      communes.value = region.comunas
      if (!communes.value.includes(editableProfileData.shipping_commune)) {
        editableProfileData.shipping_commune = ''
      }
    } else {
      communes.value = []
      editableProfileData.shipping_commune = ''
    }
  },
  { immediate: true },
)

// --- Funciones de Utilidad y Edición ---

function getOverlayImageUrl(r2Key) {
  if (!r2Key) return ''
  if (r2Key.startsWith('http://') || r2Key.startsWith('https://')) {
    return r2Key
  }
  return `${R2_PUBLIC_BASE_URL}/${r2Key}`
}

function startEditing() {
  if (!profileData.value) return

  // Carga de datos personales
  editableProfileData.first_name = profileData.value.first_name || ''
  editableProfileData.last_name = profileData.value.last_name || ''
  editableProfileData.city = profileData.value.city || ''
  editableProfileData.phone = profileData.value.phone || ''
  editableProfileData.birth_date = profileData.value.birth_date || ''
  editableProfileData.gender = profileData.value.gender || ''
  editableProfileData.rut = profileData.value.rut || ''

  // Carga de datos de dirección de envío
  const savedAddress = profileData.value.shipping_address
  if (savedAddress && typeof savedAddress === 'object') {
    editableProfileData.shipping_region = savedAddress.region || ''
    const regionObj = regions.value.find((r) => r.region === savedAddress.region)
    if (regionObj) communes.value = regionObj.comunas // Asegura que las comunas se carguen
    editableProfileData.shipping_commune = savedAddress.commune || ''
    editableProfileData.shipping_street = savedAddress.street || ''
    editableProfileData.shipping_number = savedAddress.number || ''
    editableProfileData.shipping_details = savedAddress.details || ''
  } else {
    // Resetea los campos si no hay dirección guardada
    editableProfileData.shipping_region = ''
    editableProfileData.shipping_commune = ''
    editableProfileData.shipping_street = ''
    editableProfileData.shipping_number = ''
    editableProfileData.shipping_details = ''
    communes.value = []
  }

  isEditing.value = true
  saveError.value = ''
}

function cancelEditing() {
  isEditing.value = false
  saveError.value = ''
}

async function saveProfile() {
  if (!profileData.value?.id) return

  if (!editableProfileData.first_name || !editableProfileData.last_name) {
    toast.error('El nombre y el apellido son requeridos.')
    return
  }

  // Validamos solo si el perfil NO tenía RUT antes Y el usuario ingresó uno ahora.
  if (!profileData.value.rut && editableProfileData.rut) {
    if (!isValidRut(editableProfileData.rut)) {
      toast.error('El RUT ingresado no es válido. Por favor, corrígelo.')
      saveError.value = 'RUT inválido.' // Opcional: mensaje de error en el form
      return // Detiene el guardado
    }
  }
  savingProfile.value = true
  saveError.value = ''
  try {
    const shippingAddressData = {
      region: editableProfileData.shipping_region || null,
      commune: editableProfileData.shipping_commune || null,
      street: editableProfileData.shipping_street || null,
      number: editableProfileData.shipping_number || null,
      details: editableProfileData.shipping_details || null,
    }
    const hasShippingData = Object.values(shippingAddressData).some(
      (val) => val !== null && val !== '',
    )

    const updates = {
      first_name: editableProfileData.first_name || null,
      last_name: editableProfileData.last_name || null,
      city: editableProfileData.city || null,
      phone: editableProfileData.phone || null,
      birth_date: editableProfileData.birth_date || null,
      gender: editableProfileData.gender || null,
      ...(!profileData.value.rut && editableProfileData.rut && { rut: editableProfileData.rut }),
      shipping_address: hasShippingData ? shippingAddressData : null,
      avatar_url: profileData.value.avatar_url,
    }

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profileData.value.id)
      .select()
      .single()

    if (error) throw error
    if (!updatedProfile)
      throw new Error('No se recibió el perfil actualizado desde la base de datos.')

    profileData.value = { ...profileData.value, ...updatedProfile }
    isEditing.value = false
    toast.success('Perfil actualizado con éxito')
  } catch (error) {
    saveError.value = `Error al guardar: ${error.message}`
    toast.error(saveError.value)
  } finally {
    savingProfile.value = false
  }
}

async function updateAvatarUrl(newPath) {
  if (!profileData.value?.id) return
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: newPath })
      .eq('id', profileData.value.id)
    if (error) throw error

    profileData.value.avatar_url = newPath
    toast.success('Foto de perfil actualizada con éxito')
  } catch (error) {
    toast.error(`Error al guardar la foto: ${error.message}`)
  }
}

function formatRut() {
  let rut = editableProfileData.rut.replace(/[^0-9kK]/g, '')
  if (rut.length > 1) {
    const body = rut.slice(0, -1)
    const dv = rut.slice(-1).toUpperCase()
    rut = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
  }
  editableProfileData.rut = rut
}

// --- Funciones de Navegación ---

function startArExperience(experienceId) {
  router.push({ name: 'ar-experience', params: { markerId: experienceId } })
}

function startOverlayPhotoCapture(overlay) {
  router.push({ name: 'overlay-photo-capture', params: { overlayId: overlay.id } })
}

// --- Propiedades Computadas ---

const userDisplayName = computed(() => {
  if (profileData.value?.first_name) {
    return profileData.value.first_name
  }
  if (authStore.user?.email) {
    return authStore.user.email.split('@')[0]
  }
  return 'Usuario'
})

const userDigitalItems = computed(() => {
  const items = []
  userOrders.value.forEach(order => {
    if (order.status === 'paid' || order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered') {
      order.order_items?.forEach(item => {
        if (item.product?.is_downloadable) {
          items.push({
            ...item,
            order_id: order.id,
            order_date: order.created_at
          })
        }
      })
    }
  })
  return items
})

async function downloadFile(orderItemId) {
  isDownloading.value = true
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sesión inválida o expirada.')
    
    const response = await fetch('/.netlify/functions/generate-download-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ order_item_id: orderItemId })
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(JSON.stringify(data.details || data.error))
    }
    
    window.open(data.url, '_blank')
    toast.success(`Descarga iniciada. Te quedan ${data.max_downloads - data.downloads_count} descargas.`)
  } catch (err) {
    console.error('Error al descargar:', err)
    alert('Error detallado del servidor: ' + err.message)
    toast.error('No se pudo descargar el archivo')
  } finally {
    isDownloading.value = false
  }
}
</script>

<template>
  <div class="profile-view">
    <!-- Encabezado dinámico -->
    <div v-if="!isEditing">
      <h2>Perfil de {{ userDisplayName }}</h2>
    </div>
    <div v-else>
      <h2>Editando Perfil</h2>
    </div>

    <!-- Indicadores de carga y error para el perfil -->
    <div v-if="loadingProfile" class="loading-indicator">Cargando perfil...</div>
    <div v-if="errorProfile && !loadingProfile" class="error-message">{{ errorProfile }}</div>

    <!-- Contenido principal del perfil (cuando ya hay datos) -->
    <div v-if="profileData && !loadingProfile" class="profile-content">
      <div class="profile-main-grid">
        <!-- Columna 1: Avatar -->
        <div class="profile-avatar-container">
          <Avatar
            v-model:path="profileData.avatar_url"
            @upload="updateAvatarUrl(profileData.avatar_url)"
            :disabled="isEditing"
          />
          <p v-if="!isEditing" class="avatar-helper-text">Sube o cambia tu foto de perfil.</p>
        </div>

        <!-- Columna 2: Detalles del perfil -->
        <div class="profile-details-container">
          <!-- VISTA NORMAL (MODO LECTURA) -->
          <div v-if="!isEditing">
            <p><strong>Email:</strong> {{ profileData.email || '-' }}</p>
            <p><strong>Nombre:</strong> {{ profileData.first_name || '(No especificado)' }}</p>
            <p><strong>Apellido:</strong> {{ profileData.last_name || '(No especificado)' }}</p>
            <p><strong>RUT:</strong> {{ profileData.rut || '(No especificado)' }}</p>
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

            <!-- Dirección de Envío Guardada -->
            <div class="address-display">
              <h4>Dirección de Envío Predeterminada:</h4>
              <div
                v-if="
                  profileData.shipping_address &&
                  typeof profileData.shipping_address === 'object' &&
                  Object.values(profileData.shipping_address).some((v) => v)
                "
              >
                <p>
                  {{ profileData.shipping_address.street || '' }}
                  {{ profileData.shipping_address.number || '' }}
                  {{
                    profileData.shipping_address.details
                      ? `, ${profileData.shipping_address.details}`
                      : ''
                  }}
                </p>
                <p>
                  {{ profileData.shipping_address.commune || '' }},
                  {{ profileData.shipping_address.region || '' }}
                </p>
              </div>
              <p v-else><em>(No has guardado una dirección de envío)</em></p>
            </div>

            <button @click="startEditing" class="btn btn-secondary btn-edit-profile">
              Editar Perfil y Dirección
            </button>
          </div>

          <!-- MODO EDICIÓN DEL PERFIL -->
          <div v-else>
            <form @submit.prevent="saveProfile" class="edit-profile-form">
              <p><strong>Email:</strong> {{ profileData.email }} (No editable)</p>

              <!-- Campos Personales Editables -->
              <div class="form-group">
                <label for="firstName">Nombre:</label>
                <input
                  type="text"
                  id="firstName"
                  v-model="editableProfileData.first_name"
                  required
                />
              </div>
              <div class="form-group">
                <label for="lastName">Apellido:</label>
                <input type="text" id="lastName" v-model="editableProfileData.last_name" required />
              </div>
              <div class="form-group">
                <label for="rut">RUT:</label>
                <input
                  v-if="profileData.rut"
                  type="text"
                  id="rut-display"
                  :value="profileData.rut"
                  disabled
                  class="disabled-input"
                />
                <input
                  v-else
                  type="text"
                  id="rut"
                  v-model="editableProfileData.rut"
                  @input="formatRut"
                  placeholder="Ej: 12.345.678-9"
                  pattern="\d{1,2}\.\d{3}\.\d{3}-[\dkK]"
                  title="Formato: XX.XXX.XXX-X"
                />
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
                <select id="gender" v-model="editableProfileData.gender">
                  <option value="">Prefiero no decirlo</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div class="form-group">
                <label for="city">Ciudad (General):</label>
                <input type="text" id="city" v-model="editableProfileData.city" />
              </div>

              <hr class="form-divider" />

              <!-- Campos de Dirección Editables -->
              <h4>Dirección de Envío Predeterminada</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label for="shipping_region">Región</label>
                  <select id="shipping_region" v-model="editableProfileData.shipping_region">
                    <option value="">Selecciona una región</option>
                    <option
                      v-for="regionData in regions"
                      :key="regionData.region"
                      :value="regionData.region"
                    >
                      {{ regionData.region }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="shipping_commune">Comuna</label>
                  <select
                    id="shipping_commune"
                    v-model="editableProfileData.shipping_commune"
                    :disabled="!editableProfileData.shipping_region"
                  >
                    <option value="">Selecciona una comuna</option>
                    <option v-for="communeName in communes" :key="communeName" :value="communeName">
                      {{ communeName }}
                    </option>
                  </select>
                </div>
                <div class="form-group span-2">
                  <label for="shipping_street">Calle</label>
                  <input
                    type="text"
                    id="shipping_street"
                    v-model="editableProfileData.shipping_street"
                  />
                </div>
                <div class="form-group">
                  <label for="shipping_number">Número</label>
                  <input
                    type="text"
                    id="shipping_number"
                    v-model="editableProfileData.shipping_number"
                  />
                </div>
                <div class="form-group">
                  <label for="shipping_details">Depto / Casa (Opcional)</label>
                  <input
                    type="text"
                    id="shipping_details"
                    v-model="editableProfileData.shipping_details"
                  />
                </div>
              </div>

              <!-- Botones Guardar/Cancelar -->
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
      </div>
    </div>

    <!-- SECCIONES ADICIONALES (solo visibles si no se está editando) -->
    <div v-if="!isEditing">
      <hr class="section-divider" />

      <!-- SECCIÓN MIS DESCARGAS -->
      <section class="downloads-section" v-if="userDigitalItems.length > 0">
        <h3>📥 Mis Descargas Digitales</h3>
        <p style="text-align: center; margin-bottom: 20px; color: var(--color-text-mute);">Aquí tienes acceso a los archivos digitales que has comprado.</p>
        <div class="items-grid downloads-grid">
          <div v-for="item in userDigitalItems" :key="item.id" class="item-card download-card" style="border: 1px dashed #ce93d8; background: #f3e5f5;">
            <div class="card-icon-placeholder" style="background: #9c27b0;">📄</div>
            <h4 class="card-title" style="color: #4a148c;">{{ item.product.name }}</h4>
            <p class="card-description" style="color: #6a1b9a;">Comprado el: {{ new Date(item.order_date).toLocaleDateString('es-CL') }}</p>
            <button @click="downloadFile(item.id)" class="btn btn-primary" :disabled="isDownloading" style="background: #8e24aa;">
              {{ isDownloading ? 'Cargando...' : 'Descargar Archivo' }}
            </button>
          </div>
        </div>
      </section>

      <hr class="section-divider" v-if="userDigitalItems.length > 0" />

      <!-- --- SECCIÓN "MIS COMPRAS" CON BOTÓN DE DETALLE --- -->
      <section class="purchases-section">
        <h3>Mis Compras</h3>
        <div v-if="loadingOrders" class="loading-indicator">Cargando historial de compras...</div>
        <div v-if="errorOrders && !loadingOrders" class="error-message">{{ errorOrders }}</div>
        <div v-if="!loadingOrders && userOrders.length === 0 && !errorOrders" class="no-items">
          Aún no has realizado ninguna compra. ¡Anímate a explorar la
          <router-link :to="{ name: 'store' }">tienda</router-link>!
        </div>

        <div v-if="!loadingOrders && userOrders.length > 0" class="orders-list">
          <div v-for="order in userOrders" :key="order.id" class="order-item">
            <!-- Información principal del pedido -->
            <div class="order-main-info">
              <div class="order-details-grid">
                <p>
                  <strong>Pedido:</strong>
                  <span class="order-id">#{{ order.id.substring(0, 8) }}...</span>
                </p>
                <p>
                  <strong>Total:</strong>
                  {{
                    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                      order.total_amount,
                    )
                  }}
                </p>
                <p>
                  <strong>Fecha:</strong>
                  {{
                    new Date(order.created_at).toLocaleDateString('es-CL', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  }}
                </p>
                <p>
                  <strong>Estado:</strong>
                  <span
                    :class="`status-${order.status?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`"
                    >{{ order.status || 'Desconocido' }}</span
                  >
                </p>
              </div>
            </div>

            <!-- Bloque de Acciones con el botón -->
            <div class="order-actions">
              <router-link
                :to="{ name: 'order-detail', params: { orderId: order.id } }"
                class="btn btn-tertiary btn-sm"
              >
                Ver Detalle
              </router-link>
            </div>
          </div>
        </div>
      </section>
      <!-- --- FIN DE LA SECCIÓN ACTUALIZADA --- -->

      <hr class="section-divider" />

      <!-- SECCIÓN MIS EXPERIENCIAS AR TEMPORALMENTE DESHABILITADA -->
      <!--
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
      -->

      <hr class="section-divider" />


      <!-- SECCIÓN MIS FOTOS MÁGICAS - TEMPORALMENTE DESHABILITADA -->
      <!--
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
      -->
    </div>
  </div>
</template>

<style scoped>
/* Estilos generales del componente */
.profile-view {
  max-width: 700px;
  margin: 30px auto;
  padding: 25px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  font-family: var(--font-family-base);
  background-color: var(--color-background-soft);
}
.profile-view h2 {
  text-align: center;
  margin-bottom: 30px;
  color: var(--color-heading);
  font-size: 1.8rem;
  font-weight: var(--font-weight-semibold);
}

/* Grid Principal (Avatar | Detalles) */
.profile-main-grid {
  display: block; /* Por defecto en móvil, una columna */
}
.profile-avatar-container {
  margin-bottom: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.avatar-helper-text {
  margin-top: 10px;
  font-size: 0.85em;
  color: var(--color-text-mute);
  font-style: italic;
}

/* Vista Normal (Modo Lectura) */
.profile-details-container p {
  margin-bottom: 10px;
  line-height: 1.7;
  color: var(--color-text);
  font-size: 0.95rem;
}
.profile-details-container strong {
  color: var(--color-text-soft);
  margin-right: 8px;
  display: inline-block;
  min-width: 110px;
  font-weight: var(--font-weight-medium);
}
.address-display {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px dashed var(--color-border);
}
.address-display h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 10px;
}
.address-display p {
  margin-bottom: 5px;
  font-size: 0.9rem;
}
.address-display em {
  color: var(--color-text-mute);
  font-size: 0.9rem;
}
.btn-edit-profile {
  margin-top: 20px;
}

/* Modo Edición - Formulario */
.edit-profile-form .form-group {
  margin-bottom: 18px;
}
.edit-profile-form .form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: var(--font-weight-medium);
  font-size: 0.9rem;
  color: var(--color-text-soft);
}
.edit-profile-form .form-group input,
.edit-profile-form .form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-sizing: border-box;
  font-family: var(--font-family-base);
  font-size: 0.95rem;
  background-color: var(--color-background);
  color: var(--color-text);
}
.disabled-input {
  background-color: var(--color-background-mute) !important;
  color: var(--color-text-mute) !important;
  cursor: not-allowed;
}
.edit-profile-form .form-actions {
  margin-top: 30px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.form-divider {
  border: none;
  border-top: 1px dashed var(--color-border-hover);
  margin: 30px 0;
}
.edit-profile-form h4 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 15px;
  color: var(--color-heading);
}
.edit-profile-form .form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}
.edit-profile-form .form-grid .form-group {
  margin-bottom: 0;
}
.edit-profile-form .form-grid .span-2 {
  grid-column: 1 / -1;
}

/* Indicadores de Carga, Error y Sin Contenido */
.loading-indicator,
.error-message,
.no-items {
  padding: 15px;
  text-align: center;
  border-radius: 5px;
  margin: 20px auto;
  font-size: 0.95rem;
}
.loading-indicator {
  color: var(--color-text-mute);
  font-style: italic;
}
.error-message {
  background-color: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
}
.no-items {
  background-color: var(--color-background-mute);
  color: var(--color-text-soft);
  border: 1px solid var(--color-border-hover);
  font-style: italic;
}
.no-items a {
  color: var(--brand-turquoise);
  text-decoration: underline;
  font-weight: 500;
}
.no-items a:hover {
  color: var(--brand-pink);
}
.form-save-error {
  margin-bottom: 20px;
}

/* Separador entre secciones */
.section-divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 35px 0;
}

/* --- ESTILOS "MIS COMPRAS" ACTUALIZADOS PARA LA LISTA SIMPLE --- */
.purchases-section h3,
.experiences-section h3 {
  font-size: 1.5rem;
  color: var(--color-heading);
  margin-bottom: 20px;
  text-align: center;
  font-weight: var(--font-weight-medium);
}
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.order-item {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 15px;
  background-color: var(--color-background);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}
.order-main-info {
  flex-grow: 1;
}
.order-details-grid {
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 5px 25px;
  align-items: center;
  justify-content: start;
}
.order-details-grid p {
  margin: 0;
  font-size: 0.9rem;
}
.order-details-grid strong {
  color: var(--color-text-soft);
  min-width: 60px;
  display: inline-block;
  font-weight: 500;
}
.order-id {
  font-family: monospace;
  background-color: var(--color-background-mute);
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 0.9em;
  color: var(--color-text-soft);
}
/* Estilos de Estado */
span[class^='status-'] {
  font-weight: bold;
  text-transform: capitalize;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.85em;
  display: inline-block;
}
.status-pending,
.status-pending_verification {
  color: #856404;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
}
.status-paid,
.status-processing,
.status-preparing_shipment {
  color: #0c5460;
  background-color: #d1ecf1;
  border: 1px solid #bee5eb;
}
.status-shipped {
  color: #155724;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}
.status-delivered {
  color: #383d41;
  background-color: #e2e3e5;
  border: 1px solid #d6d8db;
}
.status-cancelled,
.status-failed,
.status-unknown {
  color: #721c24;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}
.status-cancelled,
.status-failed {
  text-decoration: line-through;
}

/* Contenedor del botón "Ver Detalle" */
.order-actions {
  flex-shrink: 0;
}

/* Estilos para Secciones AR y Fotos Mágicas */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}
.item-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background-color: var(--color-background);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  min-height: 280px;
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
  border: 1px solid var(--color-border-hover);
  background-color: var(--color-background-mute);
}
.card-icon-placeholder {
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.8em;
  color: var(--color-text-mute);
  background-color: var(--color-background-mute);
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid var(--color-border-hover);
}
.card-title {
  font-size: 1.05em;
  margin: 0 0 8px 0;
  color: var(--color-heading);
  font-weight: var(--font-weight-medium);
  word-break: break-word;
}
.card-description {
  font-size: 0.85em;
  color: var(--color-text-soft);
  margin-bottom: 15px;
  line-height: 1.4;
  flex-grow: 1;
}
.item-card .btn {
  margin-top: auto;
  width: 100%;
}

/* Botones Generales */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.95em;
  transition:
    background-color 0.2s ease,
    transform 0.1s ease;
  font-weight: var(--font-weight-medium);
  gap: 8px;
  text-decoration: none; /* Asegura que el router-link no esté subrayado */
}
.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.btn-primary {
  background-color: var(--brand-pink);
  color: white !important;
}
.btn-secondary {
  background-color: var(--brand-turquoise);
  color: white !important;
}
.btn-primary:hover:not(:disabled) {
  background-color: #e65c7a;
}
.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-link-hover);
}
.btn-save {
  background-color: var(--brand-pink);
  color: white !important;
}
.btn-save:hover:not(:disabled) {
  background-color: #e65c7a;
}
.btn-cancel {
  background-color: var(--brand-orange);
  color: white !important;
}
.btn-cancel:hover:not(:disabled) {
  background-color: #d04315;
}
.btn-tertiary {
  background-color: transparent;
  color: var(--color-link);
  border: 1px solid var(--color-border);
}
.btn-tertiary:hover {
  background-color: var(--color-background-mute);
}
.btn-sm {
  padding: 6px 14px;
  font-size: 0.85rem;
}
.btn:disabled {
  background-color: #cccccc;
  color: #666666 !important;
  cursor: not-allowed;
  opacity: 0.7;
}

/* --- Media Queries para Diseño Responsivo --- */

/* Escritorio */
@media (min-width: 768px) {
  .profile-main-grid {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 30px;
    align-items: start;
  }
  .profile-avatar-container {
    margin-bottom: 0;
  }
}

/* Tablet y Móvil Grande */
@media (max-width: 767px) {
  .profile-view {
    padding: 15px;
    border: none;
    box-shadow: none;
  }
  .profile-view h2 {
    font-size: 1.5rem;
  }
  .purchases-section h3,
  .experiences-section h3 {
    font-size: 1.25rem;
  }
  .profile-details-container strong {
    min-width: unset;
    display: block;
    margin-bottom: 2px;
  }
  .edit-profile-form .form-grid {
    grid-template-columns: 1fr;
  }
  .edit-profile-form .form-grid .span-2 {
    grid-column: auto;
  }
  .edit-profile-form .form-actions {
    flex-direction: column;
    gap: 10px;
  }
  .edit-profile-form .form-actions .btn {
    width: 100%;
    margin: 0;
  }
  .order-item {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  .order-details-grid {
    display: block;
  }
  .order-details-grid p {
    margin-bottom: 8px;
  }
  .order-actions {
    align-self: flex-end; /* Alinea el botón a la derecha en móvil */
  }
}

/* Móvil Pequeño */
@media (max-width: 480px) {
  .items-grid {
    grid-template-columns: 1fr;
  }
  .profile-view h2 {
    font-size: 1.3rem;
  }
  .purchases-section h3,
  .experiences-section h3 {
    font-size: 1.1rem;
  }
}
</style>
