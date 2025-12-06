<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Set,
    required: true
  },
  availableContents: {
    type: Array,
    default: () => []
  },
  loading: Boolean,
  error: String
});

const emit = defineEmits(['update:modelValue']);

const toggleContent = (contentId) => {
  const newSet = new Set(props.modelValue);
  if (newSet.has(contentId)) {
    newSet.delete(contentId);
  } else {
    newSet.add(contentId);
  }
  emit('update:modelValue', newSet);
};
</script>

<template>
  <div class="content-selector">
    <label>Contenidos Asociados:</label>
    
    <div v-if="loading" class="loading-msg">Cargando contenidos...</div>
    <div v-if="error" class="error-msg">{{ error }}</div>
    
    <div v-if="!loading && availableContents.length === 0" class="empty-msg">
      <small>No hay contenidos creados.</small>
    </div>

    <div v-if="!loading && availableContents.length > 0" class="content-checkbox-list">
      <div v-for="content in availableContents" :key="content.id" class="checkbox-item">
        <input
          type="checkbox"
          :id="'content_' + content.id"
          :checked="modelValue.has(content.id)"
          @change="toggleContent(content.id)"
        >
        <label :for="'content_' + content.id">
          {{ content.name || content.id }} <span class="content-type">({{ content.type }})</span>
        </label>
      </div>
    </div>
    <small class="helper-text">Selecciona uno o más contenidos para mostrar cuando se detecte el marcador.</small>
  </div>
</template>

<style scoped>
.content-selector {
  margin-bottom: 15px;
}
.loading-msg, .empty-msg {
  font-style: italic;
  color: #666;
  font-size: 0.9em;
  padding: 5px 0;
}
.error-msg {
  color: #dc3545;
  font-size: 0.9em;
}
.content-checkbox-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ccc;
  padding: 10px;
  margin-top: 5px;
  border-radius: 4px;
  background-color: #fff;
}
.checkbox-item {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}
.checkbox-item:last-child {
  margin-bottom: 0;
}
.checkbox-item input[type="checkbox"] {
  margin-right: 8px;
}
.checkbox-item label {
  font-weight: normal;
  font-size: 0.95em;
  cursor: pointer;
}
.content-type {
  color: #888;
  font-size: 0.85em;
}
.helper-text {
  font-size: 0.8em;
  color: #666;
  display: block;
  margin-top: 5px;
}
</style>
