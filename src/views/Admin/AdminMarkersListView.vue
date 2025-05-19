<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';

const router = useRouter();
const markers = ref([]);
const loading = ref(true);
const errorMsg = ref('');
const deleting = ref(null);
const toast = useToast();

async function fetchMarkers() {
    loading.value = true; errorMsg.value = ''; markers.value = [];
    try {
        const { data, error } = await supabase
            .from('markers')
            .select(`id, created_at, name, mind_file_name, is_public, user_id, marker_contents(contents(id, name, type))`)
            .order('created_at', { ascending: false });
        if (error) { throw error; }
        else {
            markers.value = (data || []).map(marker => ({
                ...marker,
                associated_contents: marker.marker_contents.map(mc => mc.contents).filter(c => c !== null)
            }));
        }
    } catch (error) {
        const fetchErrorText = `Error al cargar marcadores: ${error.message || 'Error inesperado.'}`;
        errorMsg.value = fetchErrorText; toast.error(fetchErrorText);
    } finally { loading.value = false; }
}

async function deleteMarker(markerId) {
    if (!markerId || deleting.value) return;
    if (!confirm(`¿Seguro que quieres borrar el marcador ID: ${markerId}?`)) { return; }
    deleting.value = markerId; errorMsg.value = '';
    try {
        const { error } = await supabase.from('markers').delete().eq('id', markerId);
        if (error) throw error;
        markers.value = markers.value.filter(marker => marker.id !== markerId);
        toast.success(`Marcador ID: ${markerId} eliminado.`);
    } catch (error) {
        const deleteErrorText = `Error al borrar marcador: ${error.message}`;
        errorMsg.value = deleteErrorText; toast.error(deleteErrorText);
    } finally { deleting.value = null; }
}

function formatAssociatedContents(contents) {
    if (!contents || contents.length === 0) { return 'Ninguno'; }
    return contents.map(c => `${c.name || 'Sin Nombre'} (${c.type || 'N/A'})`).join(', ');
}

onMounted(() => { fetchMarkers(); });
</script>

<template>
    <div class="admin-marker-list">
        <h3>Gestión de Marcadores</h3>
        <div class="add-button-container">
             <router-link :to="{ name: 'admin-marker-new' }" class="btn btn-add">
                 + Añadir Nuevo Marcador
             </router-link>
        </div>
        <div v-if="errorMsg && !loading" class="error-message"> <p>{{ errorMsg }}</p> </div>
        <div v-if="loading" class="loading-indicator"> <p>Cargando...</p> </div>
        <div v-if="!loading">
            <p v-if="markers.length === 0">No hay marcadores creados todavía.</p>
            <table v-else class="markers-table">
                <thead>
                    <tr>
                        <th>Nombre Marcador</th>
                        <th>Archivo .mind (URL)</th>
                        <th>Contenidos Asociados</th>
                        <th>Público</th>
                        <th>Creado en</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="marker in markers" :key="marker.id">
                        <td>{{ marker.name || '-' }}</td>
                        <td class="url-cell" :title="marker.mind_file_name">
                             <a :href="marker.mind_file_name || '#'" target="_blank" rel="noopener noreferrer">
                                 {{ marker.mind_file_name ? '.../' + marker.mind_file_name.split('/').pop() : '-' }}
                             </a>
                        </td>
                         <td class="associated-contents-cell" :title="formatAssociatedContents(marker.associated_contents)">
                             {{ formatAssociatedContents(marker.associated_contents) }}
                         </td>
                        <td>{{ marker.is_public ? 'Sí' : 'No' }}</td>
                        <td>{{ marker.created_at ? new Date(marker.created_at).toLocaleString('es-CL') : '-' }}</td>
                        <td>
                             <router-link :to="{ name: 'admin-marker-edit', params: { id: marker.id } }" class="btn btn-edit">
                                 Editar
                             </router-link>
                             <button @click="deleteMarker(marker.id)" class="btn btn-delete" :disabled="deleting === marker.id">
                                 {{ deleting === marker.id ? 'Borrando...' : 'Borrar' }}
                             </button>
                             <router-link
                                 v-if="marker.mind_file_name"
                                 :to="{ name: 'ar-experience', params: { markerId: marker.id } }"
                                 class="btn btn-view-ar"
                                >
                                Ver AR
                             </router-link>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped>
.admin-marker-list { padding: 15px; font-family: var(--font-family-base); }
.add-button-container { margin-bottom: 15px; text-align: right; }
.loading-indicator p { font-style: italic; color: #555; }
.error-message { color: red; background-color: #ffebeb; border: 1px solid red; padding: 10px; margin-bottom: 15px; border-radius: 4px; font-size: 0.9em; }
.error-message p { margin: 0; }
.markers-table { width: 100%; border-collapse: collapse; margin-top: 15px; table-layout: fixed; }
.markers-table th,
.markers-table td { border: 1px solid var(--color-border); padding: 8px; text-align: left; font-size: 0.9em; overflow-wrap: break-word; color: var(--color-text); }
.markers-table th { background-color: var(--color-background-mute); font-weight: var(--font-weight-bold); color: var(--color-heading); }
.markers-table tr:nth-child(even) { background-color: var(--color-background-soft); }
.markers-table tr:hover { background-color: #e6f7ff; }
.btn { padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; font-size: 0.85em; margin-right: 5px; display: inline-block; font-family: var(--font-family-base); font-weight: var(--font-weight-medium); transition: background-color 0.2s ease, transform 0.1s ease; }
.btn:hover:not(:disabled){ transform: translateY(-1px); }
.btn-add { background-color: #28a745; color: white !important; }
.btn-add:hover { background-color: #218838; }
.btn-edit { background-color: #ffc107; color: var(--vt-c-black) !important; }
.btn-edit:hover { background-color: #e0a800; }
.btn-delete { background-color: #dc3545; color: white !important; }
.btn-delete:hover:not(:disabled) { background-color: #c82333; }
.btn-delete:disabled { background-color: #cccccc; cursor: not-allowed; opacity: 0.7; transform: none; }
.btn-view-ar { background-color: var(--brand-pink); color: var(--vt-c-white) !important; }
.btn-view-ar:hover { background-color: #e65c7a; }
.url-cell, .associated-contents-cell { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.url-cell a { color: var(--color-link); text-decoration: none; }
.url-cell a:hover { text-decoration: underline; color: var(--color-link-hover); }
</style>