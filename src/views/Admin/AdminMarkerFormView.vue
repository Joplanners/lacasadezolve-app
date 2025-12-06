<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from 'vue-toastification';
import QRCode from 'qrcode'; // Importar librería QR

// Nuevos Componentes
import UserAssigner from '@/components/admin/UserAssigner.vue';
import ContentSelector from '@/components/admin/ContentSelector.vue';
import MarkerFileUploader from '@/components/admin/MarkerFileUploader.vue';

const props = defineProps({ isEditMode: { type: Boolean, default: false } });
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

// --- Estado del Formulario ---
const formData = ref({
  id: null,
  name: '',
  mind_file_name: '', // URL del archivo .mind (R2)
  preview_image_url: '', // URL de la imagen de vista previa (R2)
  is_public: true,
  is_listed: true, // Nuevo campo: Visibilidad en galería
  user_id: null
});

// --- Estado de Componentes Hijos ---
const assignedUser = ref(null); // Objeto completo del usuario asignado
const selectedContentIds = ref(new Set()); // Set de IDs de contenidos seleccionados

// --- Estado UI ---
const loadingData = ref(false);
const saving = ref(false);
const errorMsg = ref('');
const availableContents = ref([]);
const loadingContents = ref(false);
const errorContents = ref('');

// --- Estado QR ---
const showQRModal = ref(false);
const qrCodeUrl = ref('');

const formTitle = computed(() => props.isEditMode ? 'Editar Marcador' : 'Añadir Nuevo Marcador');

// --- Funciones QR ---
const generateQRCode = async () => {
  if (!formData.value.id) return;
  
  // URL de destino: La experiencia AR directa
  // Ajustar según tu dominio real o localhost en desarrollo
  const baseUrl = window.location.origin;
  const targetUrl = `${baseUrl}/experiencia-ar/demo/${formData.value.id}`;
  
  try {
    qrCodeUrl.value = await QRCode.toDataURL(targetUrl, { width: 300, margin: 2 });
    showQRModal.value = true;
  } catch (err) {
    console.error('Error generando QR:', err);
    toast.error('No se pudo generar el código QR.');
  }
};

const downloadQR = () => {
  const link = document.createElement('a');
  link.download = `qr-${formData.value.name || 'marcador'}.png`;
  link.href = qrCodeUrl.value;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- Carga de Datos Iniciales ---

async function fetchAvailableContents() {
  loadingContents.value = true;
  errorContents.value = '';
  try {
    const { data, error } = await supabase
      .from('contents')
      .select('id, name, type')
      .order('name');

    if (error) throw error;
    availableContents.value = data || [];
  } catch (err) {
    console.error("Error fetching contents:", err);
    errorContents.value = 'Error al cargar contenidos.';
  } finally {
    loadingContents.value = false;
  }
}

async function fetchMarkerData(markerId) {
  loadingData.value = true;
  errorMsg.value = '';
  
  try {
    // 1. Obtener datos del marcador
    const { data: marker, error } = await supabase
      .from('markers')
      .select('*')
      .eq('id', markerId)
      .single();

    if (error) throw error;
    if (!marker) throw new Error("Marcador no encontrado");

    // Poblar formData
    formData.value = {
      id: marker.id,
      name: marker.name,
      mind_file_name: marker.mind_file_name,
      preview_image_url: marker.preview_image_url,
      is_public: marker.is_public,
      is_listed: marker.is_listed === null ? true : marker.is_listed, // Manejar null como true por defecto
      user_id: marker.user_id
    };

    // 2. Obtener asociaciones de contenido
    const { data: associations, error: assocError } = await supabase
      .from('marker_contents')
      .select('content_id')
      .eq('marker_id', markerId);

    if (assocError) throw assocError;

    if (associations) {
      associations.forEach(a => selectedContentIds.value.add(a.content_id));
      // Forzar reactividad
      selectedContentIds.value = new Set(selectedContentIds.value);
    }

    // 3. Obtener detalles del usuario si es privado y tiene dueño
    if (!marker.is_public && marker.user_id) {
      const { data: users, error: userError } = await supabase
        .rpc('search_users_for_admin', { search_term: marker.user_id });
      
      if (!userError && users && users.length > 0) {
        const u = users[0];
        assignedUser.value = {
          id: u.user_id,
          email: u.user_email,
          name: `${u.user_first_name || ''} ${u.user_last_name || ''}`.trim() || u.user_email
        };
      }
    }

  } catch (err) {
    console.error("Error fetching marker data:", err);
    errorMsg.value = 'Error al cargar los datos del marcador.';
    toast.error(errorMsg.value);
  } finally {
    loadingData.value = false;
  }
}

// --- Guardado ---

async function saveMarker() {
  saving.value = true;
  errorMsg.value = '';

  // Validaciones
  if (!formData.value.name) {
    toast.error('El nombre es obligatorio.');
    saving.value = false;
    return;
  }
  if (!formData.value.mind_file_name) {
    toast.error('El archivo .mind es obligatorio.');
    saving.value = false;
    return;
  }

  // Determinar User ID
  let finalUserId = null;
  if (!formData.value.is_public) {
    finalUserId = formData.value.user_id || authStore.user?.id;
  }

  try {
    const markerDataToSave = {
      name: formData.value.name,
      mind_file_name: formData.value.mind_file_name,
      preview_image_url: formData.value.preview_image_url || null,
      is_public: formData.value.is_public,
      is_listed: formData.value.is_listed,
      user_id: finalUserId
    };

    let markerId = formData.value.id;

    // 1. Insertar o Actualizar Marcador
    if (props.isEditMode) {
      const { error } = await supabase
        .from('markers')
        .update(markerDataToSave)
        .eq('id', markerId);
      if (error) throw error;
    } else {
      const { data: newMarker, error } = await supabase
        .from('markers')
        .insert(markerDataToSave)
        .select('id')
        .single();
      if (error) throw error;
      markerId = newMarker.id;
    }

    // 2. Actualizar Asociaciones (Borrar y Recrear)
    // Primero borrar existentes
    const { error: deleteError } = await supabase
      .from('marker_contents')
      .delete()
      .eq('marker_id', markerId);
    
    if (deleteError) throw deleteError;

    // Insertar nuevas
    if (selectedContentIds.value.size > 0) {
      const associations = Array.from(selectedContentIds.value).map((contentId, index) => ({
        marker_id: markerId,
        content_id: contentId,
        display_order: index
      }));
      
      const { error: insertError } = await supabase
        .from('marker_contents')
        .insert(associations);
      
      if (insertError) throw insertError;
    }

    toast.success(`Marcador ${props.isEditMode ? 'actualizado' : 'creado'} con éxito!`);
    router.push({ name: 'admin-markers' });

  } catch (err) {
    console.error("Error saving marker:", err);
    errorMsg.value = `Error al guardar: ${err.message}`;
    toast.error(errorMsg.value);
  } finally {
    saving.value = false;
  }
}

// --- Ciclo de Vida ---
onMounted(() => {
  fetchAvailableContents();
  if (props.isEditMode) {
    const id = route.params.id;
    if (id) {
      fetchMarkerData(id);
    } else {
      errorMsg.value = "ID de marcador no encontrado.";
    }
  }
});
</script>

<template>
  <div class="admin-marker-form">
    <div class="header-actions">
      <h3>{{ formTitle }}</h3>
      <button 
        v-if="props.isEditMode && formData.id" 
        type="button" 
        class="btn btn-qr" 
        @click="generateQRCode"
      >
        📷 Generar QR
      </button>
    </div>

    <div v-if="loadingData" class="loading-indicator">Cargando datos...</div>
    <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>

    <form v-if="!loadingData" @submit.prevent="saveMarker">
      
      <!-- Nombre -->
      <div class="form-group">
        <label for="markerName">Nombre del Marcador:</label>
        <input type="text" id="markerName" v-model="formData.name" required placeholder="Ej: Logo Empresa">
      </div>

      <!-- Uploads (.mind y preview) -->
      <div class="form-group">
        <MarkerFileUploader
          v-model:mindFileUrl="formData.mind_file_name"
          v-model:previewImageUrl="formData.preview_image_url"
          :isEditMode="isEditMode"
        />
      </div>

      <!-- Visibilidad y Listado -->
      <div class="form-row">
        <div class="form-group checkbox-group">
          <input type="checkbox" id="isPublic" v-model="formData.is_public">
          <label for="isPublic" title="Si es público, cualquiera puede acceder">¿Es Público?</label>
        </div>
        
        <div class="form-group checkbox-group">
          <input type="checkbox" id="isListed" v-model="formData.is_listed">
          <label for="isListed" title="Si está desmarcado, solo se accede con link/QR (Oculto)">¿Mostrar en Galería?</label>
        </div>
      </div>
      <small class="helper-text" v-if="formData.is_public && !formData.is_listed">
        ℹ️ <strong>Modo Oculto (Unlisted):</strong> El marcador es público pero NO aparecerá en la página de demos. Ideal para compartir solo vía QR/Link.
      </small>

      <!-- Asignación de Usuario (Solo si es privado) -->
      <div v-if="!formData.is_public" class="form-group">
        <UserAssigner
          v-model="formData.user_id"
          :initialUser="assignedUser"
          @user-selected="(u) => assignedUser = u"
        />
      </div>

      <!-- Selector de Contenidos -->
      <div class="form-group">
        <ContentSelector
          v-model="selectedContentIds"
          :availableContents="availableContents"
          :loading="loadingContents"
          :error="errorContents"
        />
      </div>

      <!-- Botones -->
      <div class="form-actions">
        <button type="submit" class="btn btn-save" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar Marcador' }}
        </button>
        <router-link :to="{ name: 'admin-markers' }" class="btn btn-cancel" :class="{ disabled: saving }">
          Cancelar
        </router-link>
      </div>

    </form>

    <!-- Modal QR -->
    <div v-if="showQRModal" class="modal-overlay" @click.self="showQRModal = false">
      <div class="modal-content">
        <h4>Código QR para "{{ formData.name }}"</h4>
        <p>Escanea para acceder directamente a la experiencia AR.</p>
        <div class="qr-container">
          <img :src="qrCodeUrl" alt="Código QR" />
        </div>
        <div class="modal-actions">
          <button @click="downloadQR" class="btn btn-save">Descargar PNG</button>
          <button @click="showQRModal = false" class="btn btn-cancel">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-marker-form {
  max-width: 700px;
  margin: 30px auto;
  padding: 30px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  position: relative;
}
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}
h3 {
  margin: 0;
  color: #333;
}
.form-group {
  margin-bottom: 20px;
}
.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #444;
}
input[type="text"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}
.checkbox-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 0;
}
.checkbox-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
}
.checkbox-group label {
  margin-bottom: 0;
  cursor: pointer;
}
.helper-text {
  display: block;
  margin-bottom: 20px;
  color: #666;
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  border-left: 3px solid #17a2b8;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.2s;
}
.btn-save {
  background-color: #007bff;
  color: white;
}
.btn-save:hover:not(:disabled) {
  background-color: #0056b3;
}
.btn-save:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}
.btn-cancel {
  background-color: #6c757d;
  color: white;
}
.btn-cancel:hover {
  background-color: #5a6268;
}
.btn-qr {
  background-color: #28a745;
  color: white;
  font-size: 0.9em;
  padding: 8px 15px;
}
.btn-qr:hover {
  background-color: #218838;
}
.loading-indicator, .error-message {
  text-align: center;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 4px;
}
.loading-indicator {
  background-color: #f8f9fa;
  color: #666;
  font-style: italic;
}
.error-message {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  text-align: center;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}
.qr-container {
  margin: 20px 0;
}
.qr-container img {
  max-width: 100%;
  border: 1px solid #eee;
}
.modal-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}
</style>