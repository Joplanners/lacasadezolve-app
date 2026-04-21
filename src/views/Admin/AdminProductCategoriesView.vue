<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from 'vue-toastification'

const toast = useToast()

// Estados reactivos del componente
const categories = ref([])
const newCategoryName = ref('')
const loading = ref(true)
const errorMsg = ref('')
const saving = ref(false)
const deleting = ref(null) // Guardará el ID de la categoría que se está borrando

// --- FUNCIONES ---

// Obtiene todas las categorías de la base de datos
async function fetchCategories() {
  loading.value = true
  errorMsg.value = ''
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name', { ascending: true }) // Las ordenamos alfabéticamente

    if (error) throw error
    categories.value = data || []
  } catch (error) {
    const fetchErrText = `Error al cargar categorías: ${error.message}`
    errorMsg.value = fetchErrText
    toast.error(fetchErrText)
  } finally {
    loading.value = false
  }
}

// Añade una nueva categoría
async function addCategory() {
  if (!newCategoryName.value.trim()) {
    toast.warning('El nombre de la categoría no puede estar vacío.')
    return
  }
  saving.value = true
  try {
    // Usamos .select().single() para que nos devuelva la fila recién creada
    const { data: newCategory, error } = await supabase
      .from('product_categories')
      .insert({ name: newCategoryName.value.trim() })
      .select()
      .single()

    if (error) throw error

    // Añadimos la nueva categoría a nuestra lista local para actualizar la UI al instante
    categories.value.push(newCategory)
    categories.value.sort((a, b) => a.name.localeCompare(b.name)) // Reordenamos
    toast.success(`Categoría "${newCategory.name}" creada con éxito.`)
    newCategoryName.value = '' // Limpiamos el input
  } catch (error) {
    // Manejamos el caso de que la categoría ya exista (error de unicidad)
    if (error.code === '23505') {
      toast.error(`La categoría "${newCategoryName.value.trim()}" ya existe.`)
    } else {
      toast.error(`Error al crear la categoría: ${error.message}`)
    }
  } finally {
    saving.value = false
  }
}

// Borra una categoría existente
async function deleteCategory(category) {
  if (!confirm(`¿Estás seguro de que quieres borrar la categoría "${category.name}"?`)) {
    return
  }
  deleting.value = category.id // Indicamos que esta categoría se está borrando
  try {
    const { error } = await supabase.from('product_categories').delete().eq('id', category.id)

    if (error) throw error

    // Filtramos la categoría de nuestra lista local para actualizar la UI
    categories.value = categories.value.filter((c) => c.id !== category.id)
    toast.success(`Categoría "${category.name}" eliminada.`)
  } catch (error) {
    // Este es un error importante: si una categoría está en uso por un producto, la BD no nos dejará borrarla.
    if (error.code === '23503') {
      toast.error(
        'Error: No se puede borrar esta categoría porque está siendo usada por uno o más productos.',
      )
    } else {
      toast.error(`Error al borrar la categoría: ${error.message}`)
    }
  } finally {
    deleting.value = null // Reseteamos el estado de borrado
  }
}

// Edita una categoría existente
async function editCategory(category) {
  const newName = prompt('Ingrese el nuevo nombre para la categoría:', category.name)
  if (newName === null) return // El usuario canceló
  
  const trimmedName = newName.trim()
  if (!trimmedName || trimmedName === category.name) return // No cambió nada o está vacío

  try {
    const { error } = await supabase
      .from('product_categories')
      .update({ name: trimmedName })
      .eq('id', category.id)

    if (error) throw error

    // Actualizamos la categoría en nuestra lista local
    const index = categories.value.findIndex(c => c.id === category.id)
    if (index !== -1) {
      categories.value[index].name = trimmedName
      categories.value.sort((a, b) => a.name.localeCompare(b.name)) // Reordenamos
    }
    toast.success(`Categoría actualizada a "${trimmedName}".`)
  } catch (error) {
    if (error.code === '23505') {
      toast.error(`La categoría "${trimmedName}" ya existe en el sistema.`)
    } else {
      toast.error(`Error al editar la categoría: ${error.message}`)
    }
  }
}

// Cuando el componente se monta, cargamos las categorías
onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <div class="admin-categories-view">
    <h3>Gestión de Categorías</h3>

    <form @submit.prevent="addCategory" class="add-category-form">
      <input
        type="text"
        v-model="newCategoryName"
        placeholder="Nombre de la nueva categoría"
        :disabled="saving"
      />
      <button type="submit" class="btn btn-add" :disabled="saving">
        {{ saving ? 'Creando...' : '+ Añadir Categoría' }}
      </button>
    </form>

    <div v-if="loading" class="loading-indicator"><p>Cargando categorías...</p></div>

    <div v-if="errorMsg && !loading" class="error-message">
      <p>{{ errorMsg }}</p>
    </div>

    <div v-if="!loading && !errorMsg">
      <p v-if="categories.length === 0" class="no-items-message">
        Aún no has creado ninguna categoría.
      </p>
      <table v-else class="categories-table">
        <thead>
          <tr>
            <th>Nombre Categoría</th>
            <th>ID</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="category in categories" :key="category.id">
            <td>{{ category.name }}</td>
            <td>{{ category.id }}</td>
            <td class="action-buttons">
              <button
                @click="editCategory(category)"
                class="btn btn-edit"
              >
                Editar
              </button>
              <button
                @click="deleteCategory(category)"
                class="btn btn-delete"
                :disabled="deleting === category.id"
              >
                {{ deleting === category.id ? 'Borrando...' : 'Borrar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.admin-categories-view {
  padding: 15px;
  max-width: 800px;
  margin: 0 auto;
}
.admin-categories-view h3 {
  text-align: center;
  margin-bottom: 25px;
}

.add-category-form {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
}

.add-category-form input {
  flex-grow: 1;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.loading-indicator p,
.no-items-message {
  font-style: italic;
  color: #555;
  padding: 10px;
  text-align: center;
}
.error-message {
  color: red;
  font-weight: bold;
  border: 1px solid red;
  background-color: #ffebeb;
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 4px;
}
.error-message p {
  margin: 0;
}

.categories-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}
.categories-table th,
.categories-table td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
  vertical-align: middle;
}
.categories-table th {
  background-color: #f2f2f2;
}

.btn {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.9em;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}
.btn-add {
  background-color: #28a745;
  color: white !important;
}
.btn-add:hover:not(:disabled) {
  background-color: #218838;
}
.btn-edit {
  background-color: #ffc107;
  color: #212529 !important;
}
.btn-edit:hover:not(:disabled) {
  background-color: #e0a800;
}
.btn-delete {
  background-color: #dc3545;
  color: white !important;
}
.btn-delete:hover:not(:disabled) {
  background-color: #c82333;
}
.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}
.btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
