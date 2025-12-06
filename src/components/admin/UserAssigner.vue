<script setup>
import { ref, watch } from 'vue';
import { useUserSearch } from '@/composables/useUserSearch';
import { debounce } from 'lodash-es';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: null
  },
  initialUser: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'user-selected']);

const { searchResults, loading, searchUsers, clearResults } = useUserSearch();
const searchTerm = ref('');
const showDropdown = ref(false);
const assignedUser = ref(props.initialUser || null);

// Sincronizar assignedUser si cambia initialUser externamente
watch(() => props.initialUser, (newVal) => {
  if (newVal) {
    assignedUser.value = newVal;
    searchTerm.value = newVal.email || newVal.id;
  }
}, { immediate: true });

const handleSearch = debounce(async () => {
  if (searchTerm.value.length >= 2) {
    // Si el término coincide con el usuario ya asignado, no buscar
    if (assignedUser.value && (searchTerm.value === assignedUser.value.email || searchTerm.value === assignedUser.value.id)) {
      return;
    }
    await searchUsers(searchTerm.value);
    showDropdown.value = true;
  } else {
    clearResults();
    showDropdown.value = false;
  }
}, 400);

const selectUser = (user) => {
  const userData = {
    id: user.user_id,
    email: user.user_email,
    name: `${user.user_first_name || ''} ${user.user_last_name || ''}`.trim() || user.user_email
  };
  
  assignedUser.value = userData;
  searchTerm.value = userData.email;
  showDropdown.value = false;
  clearResults();
  
  emit('update:modelValue', user.user_id);
  emit('user-selected', userData);
};

const clearSelection = () => {
  assignedUser.value = null;
  searchTerm.value = '';
  emit('update:modelValue', null);
  emit('user-selected', null);
};
</script>

<template>
  <div class="user-assigner">
    <label for="userSearch">Asignar a Usuario Específico (Opcional):</label>
    <div class="search-container">
      <input 
        type="search" 
        id="userSearch" 
        v-model="searchTerm" 
        @input="handleSearch" 
        @focus="showDropdown = true" 
        placeholder="Buscar email o nombre..." 
        autocomplete="off"
      >
      
      <!-- Dropdown de resultados -->
      <ul v-if="showDropdown && (searchResults.length > 0 || (searchTerm.length >= 2 && !loading))" class="user-dropdown">
        <li v-if="loading" class="loading-item">Buscando...</li>
        <li 
          v-for="user in searchResults" 
          :key="user.user_id" 
          @click="selectUser(user)"
        >
          {{ user.user_first_name || '' }} {{ user.user_last_name || '' }} ({{ user.user_email }})
        </li>
        <li v-if="!loading && searchResults.length === 0 && searchTerm.length >= 2" class="no-results">
          No encontrado.
        </li>
      </ul>
    </div>

    <small class="helper-text">Si no seleccionas, se asigna a tu cuenta (Admin).</small>

    <p v-if="assignedUser" class="assigned-user-info">
      <strong>Asignado a:</strong> {{ assignedUser.name }} ({{ assignedUser.email }})
      <button type="button" @click="clearSelection" class="btn-clear-user" title="Quitar">✕</button>
    </p>
  </div>
</template>

<style scoped>
.user-assigner {
  margin-bottom: 15px;
}
.search-container {
  position: relative;
}
input[type="search"] {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
.user-dropdown {
  position: absolute;
  background-color: white;
  border: 1px solid #ccc;
  border-top: none;
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  max-height: 150px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.user-dropdown li {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.9em;
  border-bottom: 1px solid #eee;
}
.user-dropdown li:last-child {
  border-bottom: none;
}
.user-dropdown li:hover {
  background-color: #f0f0f0;
}
.loading-item, .no-results {
  color: #666;
  font-style: italic;
  cursor: default !important;
}
.helper-text {
  font-size: 0.8em;
  color: #666;
  display: block;
  margin-top: 3px;
}
.assigned-user-info {
  background-color: #e9ecef;
  padding: 8px 10px;
  margin-top: 8px;
  border-radius: 4px;
  font-size: 0.9em;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.btn-clear-user {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-weight: bold;
  font-size: 1.1em;
  padding: 0 5px;
}
.btn-clear-user:hover {
  color: #a71d2a;
}
</style>
