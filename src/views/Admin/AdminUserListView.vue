<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
// --- NUEVA IMPORTACIÓN ---
import { useToast } from 'vue-toastification'

const users = ref([])
const loading = ref(true)
const fetchError = ref('') // Error persistente para carga
// const updateError = ref(''); // Ya no necesitamos error persistente para update/delete
// const deleteError = ref(''); // Usaremos toasts para feedback inmediato
// const updateSuccess = ref(''); // Usaremos toasts para feedback inmediato
const searchTerm = ref('')
let searchTimeout = null
const availableRoles = ref(['admin', 'user'])
const savingRole = ref(null)
const deleting = ref(null)
const authStore = useAuthStore()
// --- NUEVA INSTANCIA ---
const toast = useToast()

async function fetchUsers(searchText = '') {
  console.log(`AdminUserListView: Fetching users (Search: '${searchText}')...`)
  loading.value = true
  fetchError.value = '' // Limpiar error de carga
  savingRole.value = null
  deleting.value = null
  users.value = []

  try {
    const { data, error } = await supabase.rpc('get_all_users_with_profiles', {
      search_term: searchText,
    })
    if (error) throw error
    users.value = data || []
  } catch (error) {
    const fetchErrText = error.message || 'Error inesperado al cargar usuarios.'
    fetchError.value = fetchErrText // Mostrar error persistente
    toast.error(fetchErrText) // Notificar error de carga
    users.value = []
  } finally {
    loading.value = false
  }
}

async function updateRole(userId, newRole) {
  if (!userId || savingRole.value || deleting) return // Evitar concurrencia

  // Opcional: Confirmación extra si se desea, pero el select ya es bastante explícito
  // if (!confirm(`¿Cambiar el rol del usuario ${userId} a ${newRole}?`)) return;

  savingRole.value = userId // Marcar inicio
  // updateError.value = ''; deleteError.value = ''; updateSuccess.value = ''; // Limpiar estados viejos
  try {
    console.log(`AdminUserListView: Updating role for ${userId} to ${newRole}`)
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)

    if (error) throw error // Lanzar error de Supabase

    // Actualizar rol en la UI local inmediatamente
    const userIndex = users.value.findIndex((u) => u.id === userId)
    if (userIndex !== -1) {
      users.value[userIndex].role = newRole
    }
    // --- ÉXITO: USAR TOAST ---
    toast.success(`Rol del usuario ${userId} actualizado a ${newRole}.`)
    // updateSuccess.value = `Rol actualizado para ${userId}.`; // Reemplazado
  } catch (error) {
    // --- ERROR: USAR TOAST ---
    const updateErrText = `Error al actualizar rol: ${error.message}`
    toast.error(updateErrText)
    // updateError.value = updateErrText; // Reemplazado
    console.error('AdminUserListView: Update role error:', error)
    // Podríamos recargar la lista para revertir visualmente
    // fetchUsers(searchTerm.value);
  } finally {
    savingRole.value = null // Marcar fin
  }
}

async function deleteUser(userId, userEmail) {
  if (!userId || userId === authStore.user?.id || deleting.value || savingRole) {
    if (userId === authStore.user?.id) toast.warning('No puedes borrar tu propia cuenta.')
    return
  }

  // --- MANTENER prompt() PARA CONFIRMACIÓN (más seguro que confirm) ---
  const confirmationEmail = prompt(
    `¡ACCIÓN IRREVERSIBLE! Para confirmar borrado de ${userEmail || userId}, escribe su email:`,
  )
  if (confirmationEmail === null) {
    console.log('DeleteUser: Prompt cancelado.')
    return // Usuario canceló
  }
  if (confirmationEmail.toLowerCase() !== userEmail?.toLowerCase()) {
    toast.error('El email ingresado no coincide. Borrado cancelado.') // <<<--- Notificar error
    // alert("El email ingresado no coincide. Borrado cancelado."); // Reemplazado
    return
  }
  // --- FIN prompt() ---

  deleting.value = userId
  // deleteError.value = ''; updateError.value = ''; updateSuccess.value = ''; // Limpiar estados viejos
  try {
    console.log(`AdminUserListView: Calling RPC delete_user_admin for ${userId}`)
    const { error } = await supabase.rpc('delete_user_admin', { user_id_to_delete: userId })
    if (error) throw error // Lanzar error de RPC

    // --- ÉXITO: USAR TOAST ---
    console.log(`AdminUserListView: User deleted successfully.`)
    users.value = users.value.filter((user) => user.id !== userId)
    toast.success(`Usuario ${userEmail || userId} eliminado.`)
    // updateSuccess.value = `Usuario ${userEmail || userId} eliminado.`; // Reemplazado
    // setTimeout(() => { updateSuccess.value = ''; }, 4000); // Ya no necesario
  } catch (error) {
    // --- ERROR: USAR TOAST ---
    const deleteErrText = error.message || 'Error inesperado al borrar.'
    toast.error(`Error al borrar: ${deleteErrText}`)
    // deleteError.value = deleteErrText; // Reemplazado
    console.error('AdminUserListView: Delete user catch error:', error)
    // alert(`Error al borrar: ${deleteError.value}`); // Reemplazado
  } finally {
    deleting.value = null
  }
}

// Funciones de búsqueda sin cambios (handleSearchInput, triggerSearch, clearSearch)
function handleSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchUsers(searchTerm.value)
  }, 500) // Espera 500ms después de dejar de escribir
}
function triggerSearch() {
  clearTimeout(searchTimeout) // Cancelar timeout si se fuerza búsqueda
  fetchUsers(searchTerm.value)
}
function clearSearch() {
  searchTerm.value = ''
  clearTimeout(searchTimeout)
  fetchUsers() // Cargar todos los usuarios
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="admin-user-list">
    <h3>Gestión de Usuarios</h3>

    <div class="search-container">
      <input
        type="search"
        placeholder="Buscar por email..."
        v-model="searchTerm"
        @input="handleSearchInput"
      />
      <button @click="triggerSearch" :disabled="loading || !searchTerm">Buscar</button>
      <button @click="clearSearch" :disabled="loading || !searchTerm" class="btn-clear">
        Limpiar
      </button>
    </div>

    <!-- Mostrar error persistente de CARGA -->
    <div v-if="fetchError" class="error-message">
      <p>{{ fetchError }}</p>
    </div>
    <!-- Ya no mostramos errores de update/delete aquí, usamos toasts -->
    <!-- <div v-if="updateError" class="error-message"> <p>Error al actualizar rol: {{ updateError }}</p> </div> -->
    <!-- <div v-if="deleteError" class="error-message"> <p>Error al borrar: {{ deleteError }}</p> </div> -->
    <!-- <div v-if="updateSuccess" class="success-message"> <p>{{ updateSuccess }}</p> </div> -->

    <div v-if="loading" class="loading-indicator"><p>Cargando...</p></div>

    <div v-if="!loading && !fetchError">
      <p v-if="users.length === 0 && !searchTerm">No hay usuarios registrados.</p>
      <p v-if="users.length === 0 && searchTerm">
        No se encontraron usuarios para "{{ searchTerm }}".
      </p>
      <table v-else class="users-table">
        <thead>
          <tr>
            <th>ID (UUID)</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Creado en</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.email || '-' }}</td>
            <td>
              <select
                :value="user.role || 'user'"
                @change="updateRole(user.id, $event.target.value)"
                :disabled="
                  savingRole === user.id || deleting === user.id || user.id === authStore.user?.id
                "
                class="role-select"
                aria-label="Seleccionar rol para usuario"
                :title="user.id === authStore.user?.id ? 'No puedes cambiar tu propio rol' : ''"
              >
                <option v-for="roleOption in availableRoles" :key="roleOption" :value="roleOption">
                  {{ roleOption }}
                </option>
              </select>
              <span v-if="savingRole === user.id" class="saving-indicator">Guardando...</span>
            </td>
            <td>{{ user.first_name || '-' }}</td>
            <td>{{ user.last_name || '-' }}</td>
            <td>
              {{
                user.created_at
                  ? new Date(user.created_at).toLocaleDateString('es-CL', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })
                  : '-'
              }}
            </td>
            <td>
              <button
                @click="deleteUser(user.id, user.email)"
                class="btn btn-delete"
                :disabled="
                  deleting === user.id || savingRole === user.id || user.id === authStore.user?.id
                "
                :title="
                  user.id === authStore.user?.id
                    ? 'No puedes borrar tu propia cuenta'
                    : 'Borrar Usuario (¡Irreversible!)'
                "
              >
                {{ deleting === user.id ? 'Borrando...' : 'Borrar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* Estilos sin cambios, pero quitamos los de .success-message si no se usa */
.admin-user-list {
  padding: 15px;
}
.search-container {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
}
.search-container input[type='search'] {
  flex-grow: 1;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.search-container button {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #007bff;
  color: white;
  white-space: nowrap;
}
.search-container button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
.search-container button.btn-clear {
  background-color: #6c757d;
}
.search-container button.btn-clear:hover:not(:disabled) {
  background-color: #5a6268;
}
.search-container button:hover:not(:disabled) {
  background-color: #0056b3;
}
.loading-indicator p {
  font-style: italic;
  color: #555;
}
.error-message {
  font-weight: bold;
  border: 1px solid;
  padding: 10px;
  margin-bottom: 15px;
  color: red;
  border-color: red;
  background-color: #ffebeb;
}
.error-message p {
  margin: 0;
}
/* .success-message p { color: green; border-color: green; background-color: #e6ffe6; } */
.users-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}
.users-table th,
.users-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
  font-size: 0.9em;
  overflow-wrap: break-word;
  word-break: break-all;
  vertical-align: middle;
}
.users-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}
.users-table tr:nth-child(even) {
  background-color: #f9f9f9;
}
.users-table tr:hover {
  background-color: #e6f7ff;
}
.users-table td:first-child {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
}
.users-table td:nth-child(2) {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.role-select {
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  font-size: 0.9em;
  min-width: 80px;
  vertical-align: middle;
}
.role-select:disabled {
  background-color: #eee;
  cursor: not-allowed;
  opacity: 0.7;
}
.saving-indicator {
  margin-left: 5px;
  font-size: 0.8em;
  font-style: italic;
  color: #555;
}
.btn {
  display: inline-block;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.85em;
  margin-right: 5px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}
.btn-delete {
  background-color: #dc3545;
  color: white !important;
}
.btn-delete:hover:not(:disabled) {
  background-color: #c82333;
}
.btn-delete:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
