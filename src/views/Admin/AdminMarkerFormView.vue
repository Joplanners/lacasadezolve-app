// Archivo: src/views/Admin/AdminMarkerFormView.vue
// v2: handleClickOutside DESACTIVADO temporalmente para depurar dropdown

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'; // Asegúrate que onUnmounted esté aquí
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from 'vue-toastification';
import { debounce } from 'lodash-es';

// Props, Route, Router, Toast
const props = defineProps({ isEditMode: { type: Boolean, default: false } });
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

// --- Estado del formulario ---
const formData = ref({
    id: null, name: '', mind_file_name: '', preview_image_url: '', // Guardará URL R2
    is_public: true, user_id: null
});
const selectedMindFile = ref(null);
const mindFileInputKey = ref(Date.now());

// --- Estado para Búsqueda de Usuario ---
const userSearchTerm = ref('');
const userSearchResults = ref([]);
const loadingUsers = ref(false);
const assignedUser = ref(null);
const showUserDropdown = ref(false);

// --- Estado para Selección Múltiple de Contenidos ---
const availableContents = ref([]);
const selectedContentIds = ref(new Set()); // Usamos un Set para IDs únicos
const loadingContents = ref(false);
const errorContents = ref('');

// Estado UI
const loadingData = ref(false);
const saving = ref(false);
const errorMsg = ref('');
const formTitle = computed(() => props.isEditMode ? 'Editar Marcador' : 'Añadir Nuevo Marcador');

// --- Funciones ---

const handleMindFileChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
        if (files[0].name.endsWith('.mind')) {
            selectedMindFile.value = files[0];
            console.log("Archivo .mind seleccionado:", selectedMindFile.value);
            // Mostrar nombre local mientras no se sube
            formData.value.mind_file_name = `Local: ${selectedMindFile.value.name}`;
        } else {
            toast.error('Por favor, selecciona un archivo con extensión .mind');
            selectedMindFile.value = null;
            mindFileInputKey.value = Date.now(); // Resetear input
             // Limpiar si no estamos editando o si no había URL previa
            if (!props.isEditMode || !formData.value.id) { // O revisa si había URL antes
               formData.value.mind_file_name = '';
            } else {
                // Si editamos y había URL, NO la borramos aún, sólo limpiamos el archivo local
            }
        }
    } else {
        selectedMindFile.value = null;
        // No borrar la URL existente si estamos editando y el usuario cancela la selección
        if (!props.isEditMode || !formData.value.id) {
            formData.value.mind_file_name = '';
        }
    }
};


async function fetchAvailableContents() {
    console.log("Fetching ALL available contents for selection...");
    loadingContents.value = true;
    errorContents.value = '';
    availableContents.value = [];
    try {
        // Obtener todos los contenidos disponibles para mostrarlos en los checkboxes
        const { data, error } = await supabase
            .from('contents')
            .select('id, name, type') // Campos necesarios para mostrar
            .order('name'); // Ordenar alfabéticamente por nombre

        if (error) throw error;
        availableContents.value = data || [];
        console.log("Available contents loaded:", availableContents.value.length);
    } catch (error) {
        console.error("Error fetching available contents:", error);
        errorContents.value = 'Error al cargar la lista de contenidos disponibles.';
        toast.error(errorContents.value);
    } finally {
        loadingContents.value = false;
    }
}


async function fetchMarkerDataAndAssociations(markerId) {
    console.log(`Fetching data for marker ID: ${markerId}`);
    loadingData.value = true;
    errorMsg.value = '';
    assignedUser.value = null;
    userSearchTerm.value = '';
    selectedContentIds.value.clear(); // Limpiar selecciones previas
    showUserDropdown.value = false;

    try {
        // 1. Obtener datos del marcador
        const { data: markerData, error: markerError } = await supabase
            .from('markers')
            .select('id, name, mind_file_name, preview_image_url, is_public, user_id')
            .eq('id', markerId)
            .single();

        if (markerError) throw markerError;
        if (!markerData) throw new Error("Marcador no encontrado");

        console.log("Marker data received:", markerData);
        // Poblar formulario con datos del marcador
        formData.value.id = markerData.id;
        formData.value.name = markerData.name;
        formData.value.mind_file_name = markerData.mind_file_name; // URL R2 existente
        formData.value.preview_image_url = markerData.preview_image_url;
        formData.value.is_public = markerData.is_public;
        formData.value.user_id = markerData.user_id;

        // 2. Obtener asociaciones existentes
        const { data: associations, error: assocError } = await supabase
            .from('marker_contents')
            .select('content_id') // Solo necesitamos el ID del contenido asociado
            .eq('marker_id', markerId);

        if (assocError) throw assocError;

        // Poblar el Set con los IDs de contenido ya asociados
        if (associations) {
            console.log("Existing associations found:", associations);
            associations.forEach(assoc => selectedContentIds.value.add(assoc.content_id));
            // Forzar reactividad inicial del Set (por si acaso)
             selectedContentIds.value = new Set(selectedContentIds.value);
             console.log("Initial selectedContentIds Set:", selectedContentIds.value);
        } else {
            console.log("No existing associations found for this marker.");
        }

        // 3. Obtener detalles del dueño si es privado (usando la lógica corregida)
        if (!formData.value.is_public && formData.value.user_id) {
             console.log('Editing private marker, fetching owner ID:', formData.value.user_id);
             // Usar la misma lógica corregida que en AdminContentFormView
             const { data: ownerResults, error: ownerError } = await supabase
                 .rpc('search_users_for_admin', { search_term: formData.value.user_id });

             if (ownerError) {
                 console.error('Error RPC fetching owner details (MarkerForm):', ownerError);
                 toast.error(`Error buscando dueño del marcador: ${ownerError.message}`);
                 userSearchTerm.value = `ID Dueño: ${formData.value.user_id} (Error al buscar)`;
             } else if (ownerResults && ownerResults.length === 1) {
                 const ownerData = ownerResults[0];
                 assignedUser.value = { id: ownerData.user_id, email: ownerData.user_email, name: `${ownerData.user_first_name || ''} ${ownerData.user_last_name || ''}`.trim() || ownerData.user_email };
                 userSearchTerm.value = assignedUser.value.email || assignedUser.value.id;
                 console.log('Marker owner details loaded:', assignedUser.value);
             } else if (ownerResults && ownerResults.length > 1) {
                 console.warn(`Owner search for ID ${formData.value.user_id} returned ${ownerResults.length} results. Using first.`);
                 const ownerData = ownerResults[0];
                 assignedUser.value = { id: ownerData.user_id, email: ownerData.user_email, name: `${ownerData.user_first_name || ''} ${ownerData.user_last_name || ''}`.trim() || ownerData.user_email };
                 userSearchTerm.value = assignedUser.value.email || assignedUser.value.id;
                 toast.warning("Múltiples dueños posibles encontrados, se usó el primero.");
             } else {
                 console.warn(`No user found with ID ${formData.value.user_id} via RPC (MarkerForm).`);
                 userSearchTerm.value = `ID Dueño: ${formData.value.user_id} (No encontrado)`;
                 toast.warning("No se pudieron obtener los detalles del dueño del marcador.");
             }
        }

    } catch (error) {
        console.error("Error fetching marker data and associations:", error);
        const fetchErrorMsg = 'Error al cargar los datos del marcador.';
        errorMsg.value = fetchErrorMsg;
        toast.error(fetchErrorMsg);
    } finally {
        loadingData.value = false;
    }
}

// --- Lógica de Búsqueda de Usuarios (Refinada, igual que en AdminContentFormView) ---
const searchUsers = async () => {
    if (assignedUser.value && userSearchTerm.value === (assignedUser.value.email || assignedUser.value.id)) { userSearchResults.value = []; showUserDropdown.value = false; return; }
    if (!userSearchTerm.value || userSearchTerm.value.length < 2) { userSearchResults.value = []; showUserDropdown.value = false; if (assignedUser.value) { assignedUser.value = null; formData.value.user_id = null; } return; }
    console.log(`Buscando usuarios (MarkerForm): "${userSearchTerm.value}"`); loadingUsers.value = true;
    try {
        const { data, error } = await supabase.rpc('search_users_for_admin', { search_term: userSearchTerm.value });
        if (error) throw error; userSearchResults.value = data || []; console.log('Resultados MarkerForm:', userSearchResults.value);
        showUserDropdown.value = true; // Mostrar área de resultados
    } catch (error) { console.error('Error buscando usuarios (MarkerForm):', error); toast.error('Error al buscar usuarios.'); userSearchResults.value = []; showUserDropdown.value = true; }
    finally { loadingUsers.value = false; console.log('Estado final búsqueda MarkerForm:', { show: showUserDropdown.value, count: userSearchResults.value.length }); }
};
const debouncedSearchUsers = debounce(searchUsers, 400);

// --- Seleccionar Usuario (igual que en AdminContentFormView) ---
const selectUser = (user) => {
    console.log('Usuario seleccionado (MarkerForm):', user);
    assignedUser.value = { id: user.user_id, email: user.user_email, name: `${user.user_first_name || ''} ${user.user_last_name || ''}`.trim() || user.user_email };
    formData.value.user_id = user.user_id; // Guardar el ID en el form data del marcador
    userSearchTerm.value = assignedUser.value.email || assignedUser.value.id;
    userSearchResults.value = []; showUserDropdown.value = false;
    console.log('Estado tras selección MarkerForm:', { show: showUserDropdown.value, assigned: assignedUser.value });
};

// --- handleClickOutside (Considera reactivarlo si es necesario) ---
// const handleClickOutside = (event) => {
//  const searchContainer = document.getElementById('user-search-container-marker'); // ID diferente!
//  if (showUserDropdown.value && searchContainer && !searchContainer.contains(event.target)) {
//    console.log("Click fuera detectado (MarkerForm), ocultando dropdown.");
//    showUserDropdown.value = false;
//  }
// }

// --- Función saveMarker CON LOGS DE DEPURACIÓN ---
async function saveMarker() {
    saving.value = true;
    errorMsg.value = '';

    // Validaciones iniciales
    if (!formData.value.name) { toast.error('Nombre del marcador es obligatorio.'); saving.value = false; return; }
    // Requerir archivo .mind si es nuevo O si estamos editando y no hay URL previa Y no se seleccionó archivo
    if (!props.isEditMode && !selectedMindFile.value) { toast.error('Archivo .mind obligatorio para nuevos marcadores.'); saving.value = false; return; }
    if (props.isEditMode && !selectedMindFile.value && !formData.value.mind_file_name) { toast.error('Archivo .mind obligatorio si no existe uno previamente asociado.'); saving.value = false; return; }

    // Determinar User ID final
    let finalUserId = null;
    if (!formData.value.is_public) {
        if (assignedUser.value) {
            finalUserId = assignedUser.value.id;
        } else if (props.isEditMode && formData.value.user_id) {
            finalUserId = formData.value.user_id; // Mantener el original si no se cambió
        } else {
            finalUserId = authStore.user?.id || null; // Asignar al admin por defecto si es nuevo privado
            if (!finalUserId && !props.isEditMode) {
                 toast.error('No se pudo determinar el usuario admin para asignar marcador privado.');
                 saving.value = false;
                 return;
             }
        }
    } else {
        finalUserId = null; // Público -> user_id es NULL
    }

    let finalMindFileUrl = props.isEditMode ? formData.value.mind_file_name : null; // URL .mind existente

    try {
        // 1. Subir archivo .mind si se seleccionó uno nuevo
        if (selectedMindFile.value) {
            console.log(`Subiendo nuevo archivo .mind: ${selectedMindFile.value.name}`);
            errorMsg.value = `Subiendo ${selectedMindFile.value.name}...`; // Mensaje temporal
            const workerUrl = 'https://r2-presigner-worker.jodiabunos.workers.dev';
            const formDataBody = new FormData();
            formDataBody.append('file', selectedMindFile.value, selectedMindFile.value.name);

            if (selectedMindFile.value.size === 0) throw new Error("Archivo .mind vacío o inválido.");

            console.log(`Enviando POST a Worker para .mind: ${workerUrl}`);
            const response = await fetch(workerUrl, { method: 'POST', body: formDataBody });
            console.log(`Respuesta del Worker para .mind: Status=${response.status}`);

            if (!response.ok) {
                let workerErrorMsg = `Error del Worker (${response.status}) al subir .mind`;
                try { const errJson = await response.json(); workerErrorMsg += `: ${errJson.error || response.statusText}`; } catch (e) { workerErrorMsg += `: ${response.statusText}`; }
                throw new Error(workerErrorMsg);
            }
            const result = await response.json();
            if (!result || !result.publicUrl) throw new Error('El Worker no devolvió una URL pública para el archivo .mind.');

            finalMindFileUrl = result.publicUrl; // Actualizar con la nueva URL
            console.log("Archivo .mind subido con éxito. Nueva URL:", finalMindFileUrl);
            toast.info(`Archivo .mind ${selectedMindFile.value.name} subido.`);
            errorMsg.value = ''; // Limpiar mensaje de subida
        }

        // Validar que tengamos URL para el .mind
        if (!finalMindFileUrl) {
            throw new Error("No hay archivo .mind asociado ni nuevo para guardar.");
        }

        // 2. Guardar/Actualizar datos del marcador en la tabla 'markers'
        console.log(`Guardando datos del Marcador en DB: URL=${finalMindFileUrl}, UserID=${finalUserId}, Public=${formData.value.is_public}`);
        const markerDataToSave = {
            name: formData.value.name,
            mind_file_name: finalMindFileUrl, // Guardar la URL R2 aquí
            preview_image_url: formData.value.preview_image_url,
            is_public: formData.value.is_public,
            user_id: finalUserId
        };

        let markerId = formData.value.id; // ID si estamos editando
        let dbError = null;

        if (props.isEditMode) {
            console.log('Actualizando marcador con ID:', markerId);
            const { error } = await supabase.from('markers').update(markerDataToSave).eq('id', markerId);
            dbError = error;
        } else {
            console.log('Insertando nuevo marcador...');
            const { data: newMarker, error } = await supabase.from('markers').insert(markerDataToSave).select('id').single();
            dbError = error;
            if (newMarker) {
                 markerId = newMarker.id; // Obtener ID del nuevo marcador
                 console.log('Nuevo marcador insertado con ID:', markerId);
            } else if (!dbError) {
                 // Si no hubo error pero no obtuvimos ID (inesperado)
                 throw new Error("Error: No se pudo obtener el ID del nuevo marcador creado.");
            }
        }

        if (dbError) {
            console.error("Error al guardar datos del marcador:", dbError);
            throw dbError; // Lanzar error para el catch principal
        }

        // Asegurarnos de tener un ID de marcador para las asociaciones
        if (!markerId) {
            throw new Error("No se pudo determinar el ID del marcador para gestionar las asociaciones.");
        }

        // 3. Gestionar asociaciones en 'marker_contents' (¡CON LOGS!)
        console.log("--- Iniciando gestión de asociaciones ---");
        // ***** LOG AÑADIDO *****
        console.log(`Marcador ID: ${markerId}`);
        console.log('IDs en selectedContentIds ANTES de borrar/insertar:', Array.from(selectedContentIds.value));

        console.log("Borrando TODAS las asociaciones antiguas para este marcador...");
        const { error: deleteAssocError } = await supabase
            .from('marker_contents')
            .delete()
            .eq('marker_id', markerId);

        // ***** LOG AÑADIDO *****
        if (deleteAssocError) {
            console.error("ERROR al borrar asociaciones antiguas:", deleteAssocError);
            // Considerar si continuar o no. Quizás mostrar warning y continuar?
            toast.warning("Hubo un error al limpiar las asociaciones de contenido anteriores. Se intentará añadir las nuevas.");
            // No lanzamos error aquí para intentar insertar las nuevas
        } else {
             console.log("Borrado de asociaciones antiguas completado (o no había).");
        }

        // Insertar nuevas asociaciones si hay contenidos seleccionados
        if (selectedContentIds.value.size > 0) {
            // Crear array de objetos para insertar
            // Usar un índice real para display_order
            const associationsToInsert = Array.from(selectedContentIds.value).map((contentId, index) => ({
                marker_id: markerId,
                content_id: contentId,
                display_order: index // Orden basado en cómo se itera el Set (puede no ser estable)
            }));

            console.log("Intentando insertar NUEVAS asociaciones:", associationsToInsert);
            const { error: insertAssocError } = await supabase
                .from('marker_contents')
                .insert(associationsToInsert);

            // ***** LOG AÑADIDO *****
            if (insertAssocError) {
                 console.error("ERROR al insertar nuevas asociaciones:", insertAssocError);
                 // Lanzar error porque esto es crítico
                 throw new Error(`Error guardando asociaciones: ${insertAssocError.message}`);
            } else {
                 console.log("NUEVAS asociaciones insertadas con éxito.");
            }
        } else {
             console.log("No hay contenidos seleccionados en la UI, no se insertarán asociaciones.");
        }
        console.log("--- Fin gestión de asociaciones ---");


        // 4. Éxito final
        toast.success(`Marcador ${props.isEditMode ? 'actualizado' : 'creado'} con éxito!`);
        router.push({ name: 'admin-markers' }); // Redirigir a la lista

    } catch (error) {
        console.error("Error completo en saveMarker:", error);
        const saveErrorText = `Error al guardar marcador: ${error.message}`;
        errorMsg.value = saveErrorText; // Mostrar error
        toast.error(saveErrorText); // Notificar
    } finally {
        saving.value = false; // Terminar estado de guardado
        // Limpiar input de archivo si se subió uno
        if (selectedMindFile.value) {
             selectedMindFile.value = null;
             mindFileInputKey.value = Date.now();
         }
    }
}


// --- Ciclo de Vida ---
onMounted(() => {
    // Cargar lista de contenidos disponibles para seleccionar
    fetchAvailableContents();

    // Si estamos editando, cargar datos del marcador y sus asociaciones
    if (props.isEditMode) {
        const markerId = route.params.id;
        if (markerId) {
            fetchMarkerDataAndAssociations(markerId);
        } else {
            const idError = "Modo edición activado pero no se encontró ID de marcador.";
            errorMsg.value = idError;
            toast.error(idError);
        }
    }
    // --- Listener click outside DESACTIVADO TEMPORALMENTE ---
    // document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    // --- Listener click outside DESACTIVADO TEMPORALMENTE ---
    // document.removeEventListener('click', handleClickOutside);
});

</script>

<template>
    <div class="admin-marker-form">
        <h3>{{ formTitle }}</h3>

        <div v-if="loadingData || loadingContents" class="loading-indicator">
             <p>{{ loadingData ? 'Cargando marcador...' : 'Cargando contenidos...' }}</p>
        </div>
        <div v-if="errorMsg && !saving || errorMsg && saving && !errorMsg.startsWith('Subiendo')" class="error-message"><p>{{ errorMsg }}</p></div>
        <div v-if="saving && errorMsg.startsWith('Subiendo')" class="saving-message"><p>{{ errorMsg }}</p></div>

        <form v-if="!loadingData" @submit.prevent="saveMarker">

            <div class="form-group">
                <label for="markerName">Nombre del Marcador:</label>
                <input type="text" id="markerName" v-model="formData.name" required>
            </div>

            <div class="form-group">
                 <label for="mindFile">Archivo Marcador (.mind):</label>
                 <input type="file" id="mindFile" @change="handleMindFileChange" accept=".mind" :key="mindFileInputKey" :required="!props.isEditMode || !formData.mind_file_name">
                 <small v-if="!props.isEditMode">Selecciona el archivo .mind.</small>
                 <small v-if="props.isEditMode && formData.mind_file_name && !selectedMindFile">URL actual: {{ formData.mind_file_name }}. Selecciona nuevo para reemplazar.</small>
                 <small v-if="props.isEditMode && !formData.mind_file_name && !selectedMindFile">No hay archivo .mind asociado. Selecciona uno.</small>
                 <p v-if="selectedMindFile" class="file-info">Nuevo archivo .mind seleccionado: {{ selectedMindFile.name }}</p>
            </div>

            <div class="form-group checkbox-group">
                 <input type="checkbox" id="isPublic" v-model="formData.is_public">
                 <label for="isPublic">¿Es Público?</label>
             </div>

            <div class="form-group" id="user-search-container-marker" v-if="!formData.is_public">
                 <label for="userSearchMarker">Asignar a Usuario Específico (Opcional):</label>
                 <input type="search" id="userSearchMarker" v-model="userSearchTerm" @input="debouncedSearchUsers" @focus="showUserDropdown = true" placeholder="Buscar email o nombre..." autocomplete="off">
                 <small>Si no seleccionas, se asigna a tu cuenta.</small>
                  <ul v-if="showUserDropdown && (userSearchResults.length > 0 || (userSearchTerm.length >= 2 && !loadingUsers))" class="user-dropdown">
                     <li v-if="loadingUsers">Buscando...</li>
                     <li v-for="user in userSearchResults" :key="user.user_id" @click="selectUser(user)">
                         {{ user.user_first_name || '' }} {{ user.user_last_name || '' }} ({{ user.user_email }})
                     </li>
                     <li v-if="!loadingUsers && userSearchResults.length === 0 && userSearchTerm.length >= 2">No encontrado.</li>
                 </ul>
                 <p v-if="assignedUser" class="assigned-user-info">
                     Asignado a: {{ assignedUser.name }} ({{ assignedUser.email }})
                     <button type="button" @click="assignedUser = null; formData.user_id = null; userSearchTerm = ''" class="btn-clear-user" title="Quitar">X</button>
                 </p>
            </div>

            <div class="form-group">
                 <label>Contenidos Asociados:</label>
                 <p v-if="loadingContents">Cargando contenidos...</p>
                 <p v-if="errorContents" class="error-message-small">{{ errorContents }}</p>
                 <div v-if="!loadingContents && availableContents.length === 0">
                     <small>No hay contenidos creados.</small>
                 </div>
                  <div v-if="!loadingContents && availableContents.length > 0" class="content-checkbox-list">
                      <div v-for="content in availableContents" :key="content.id" class="checkbox-item">
                          <input
                              type="checkbox"
                              :id="'content_' + content.id"
                              :value="content.id"
                              :checked="selectedContentIds.has(content.id)"
                              @change="() => {
                                  if (selectedContentIds.has(content.id)) {
                                      selectedContentIds.delete(content.id);
                                  } else {
                                      selectedContentIds.add(content.id);
                                  }
                                  selectedContentIds = new Set(selectedContentIds); // Forzar reactividad
                                  console.log('Contenidos seleccionados:', Array.from(selectedContentIds));
                              }"
                          >
                          <label :for="'content_' + content.id">
                              {{ content.name || content.id }} ({{ content.type }})
                          </label>
                      </div>
                  </div>
                 <small>Selecciona uno o más contenidos.</small>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn btn-save" :disabled="saving">
                    {{ saving ? 'Guardando...' : 'Guardar Marcador' }}
                </button>
                <router-link :to="{ name: 'admin-markers' }" class="btn btn-cancel" :class="{ disabled: saving }">
                    Cancelar
                </router-link>
            </div>
        </form>
    </div>
</template>

<style scoped>
/* Estilos igual que en AdminContentFormView + content-checkbox-list */
.admin-marker-form { max-width: 600px; margin: 20px auto; padding: 25px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; }
h3 { text-align: center; margin-bottom: 20px; }
.loading-indicator p { font-style: italic; color: #555; padding: 10px; }
.error-message { color: red; background-color: #ffebeb; border: 1px solid red; padding: 10px; margin-bottom: 15px; border-radius: 4px; font-size: 0.9em; }
.error-message p { margin: 0; }
.saving-message { color: #007bff; background-color: #e7f3ff; border: 1px solid #007bff; padding: 10px; margin: 15px 0; border-radius: 4px; font-size: 0.9em; text-align: center; font-style: italic; }
.saving-message p { margin: 0; }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
.form-group input[type="text"], .form-group input[type="file"], .form-group input[type="search"], .form-group select { width: 100%; padding: 8px 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
.form-group input[type="file"] { padding: 5px; }
.form-group small { font-size: 0.8em; color: #666; display: block; margin-top: 3px; }
.form-actions { margin-top: 25px; text-align: right; }
.error-message-small { color: red; font-size: 0.8em; margin-top: 3px; }
.file-info { font-size: 0.85em; color: #333; margin-top: 5px; font-style: italic; background-color: #f0f0f0; padding: 5px; border-radius: 3px; }
.btn { display: inline-block; padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; font-size: 0.9em; margin-left: 10px; vertical-align: middle; white-space: nowrap; transition: background-color 0.2s ease; }
.btn-save { background-color: #007bff; color: white !important; }
.btn-save:hover:not(:disabled) { background-color: #0056b3; }
.btn-save:disabled { background-color: #cccccc; cursor: not-allowed; opacity: 0.7; }
.btn-cancel { background-color: #6c757d; color: white !important; }
.btn-cancel:hover:not(.disabled) { background-color: #5a6268; }
.btn-cancel.disabled { background-color: #cccccc; opacity: 0.7; cursor: not-allowed; pointer-events: none; }
#user-search-container-marker { /* ID específico */ position: relative; }
.user-dropdown { position: absolute; background-color: white; border: 1px solid #ccc; border-top: none; list-style: none; margin: 0; padding: 0; width: 100%; max-height: 150px; overflow-y: auto; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.user-dropdown li { padding: 8px 12px; cursor: pointer; font-size: 0.9em; }
.user-dropdown li:hover { background-color: #f0f0f0; }
.user-dropdown li:last-child { color: #666; font-style: italic; cursor: default; }
.user-dropdown li:last-child:hover { background-color: white; }
.loading-text { font-style: italic; font-size: 0.9em; color: #666; margin-top: 5px; padding: 8px 12px; }
.assigned-user-info { background-color: #e9ecef; padding: 5px 10px; margin-top: 8px; border-radius: 4px; font-size: 0.9em; display: flex; justify-content: space-between; align-items: center; }
.btn-clear-user { background: none; border: none; color: red; cursor: pointer; font-size: 1.1em; padding: 0 5px; line-height: 1; }
.checkbox-group label { display: inline-block; margin-left: 5px; font-weight: normal; vertical-align: middle; }
.checkbox-group input[type="checkbox"] { vertical-align: middle; }
.content-checkbox-list { max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-top: 5px; border-radius: 4px; background-color: #fff; }
.checkbox-item { display: block; margin-bottom: 5px; }
.checkbox-item label { margin-left: 8px; font-weight: normal; font-size: 0.9em; vertical-align: middle; }
.checkbox-item input[type="checkbox"] { vertical-align: middle; }
</style>