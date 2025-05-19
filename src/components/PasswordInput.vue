<script setup>
import { ref, computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
// Si no tienes faEye y faEyeSlash registrados globalmente, deberías importarlos
// import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

// --- PROPS ---
// modelValue es el estándar para v-model
const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    default: 'password-field', // Un id por defecto
  },
  label: {
    type: String,
    default: 'Contraseña:', // Label por defecto
  },
  placeholder: {
    type: String,
    default: 'Tu contraseña',
  },
  autocomplete: {
    type: String,
    default: 'current-password',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
  // Puedes añadir más props si las necesitas (e.g., para mensajes de error específicos del campo)
})

// --- EMITS ---
// 'update:modelValue' es el estándar para v-model
const emit = defineEmits(['update:modelValue'])

// --- ESTADO LOCAL ---
const showPassword = ref(false)

// --- COMPUTADAS ---
const inputType = computed(() => (showPassword.value ? 'text' : 'password'))
const iconName = computed(() => (showPassword.value ? 'eye' : 'eye-slash'))
const ariaLabelForToggle = computed(() =>
  showPassword.value ? 'Ocultar contraseña' : 'Mostrar contraseña',
)

// Para que v-model funcione bidireccionalmente con el componente padre
const internalValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// --- MÉTODOS ---
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}
</script>

<template>
  <div class="custom-form-group">
    <label :for="props.id" class="custom-label">{{ props.label }}</label>
    <div class="password-input-wrapper-component">
      <input
        :type="inputType"
        :id="props.id"
        v-model="internalValue"
        :required="props.required"
        :autocomplete="props.autocomplete"
        :disabled="props.disabled"
        :placeholder="props.placeholder"
        class="password-field-component"
      />
      <button
        type="button"
        @click="togglePasswordVisibility"
        class="password-toggle-btn-component"
        :aria-label="ariaLabelForToggle"
        :disabled="props.disabled"
        :title="ariaLabelForToggle"
      >
        <font-awesome-icon :icon="['fas', iconName]" />
      </button>
    </div>
    <!-- Aquí podrías añadir un slot para mensajes de error específicos del campo si quisieras -->
    <!-- <div v-if="errorMessage" class="field-error-message">{{ errorMessage }}</div> -->
  </div>
</template>

<style scoped>
/* Estilos ESPECÍFICOS y AISLADOS para PasswordInput.vue */
/* Usamos nombres de clase ligeramente diferentes para evitar cualquier confusión con AuthView */

.custom-form-group {
  margin-bottom: 20px;
  text-align: left;
}

.custom-label {
  display: block;
  margin-bottom: 8px;
  color: var(--color-text); /* Asume que estas variables CSS están disponibles globalmente */
  font-weight: var(--font-weight-medium);
}

.password-input-wrapper-component {
  position: relative;
  display: flex;
  align-items: center;
}

.password-field-component {
  width: 100%;
  padding: 12px 48px 12px 15px; /* TOP | RIGHT (para el ojo) | BOTTOM | LEFT */
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-sizing: border-box;
  font-family: var(--font-family-base);
  font-size: 1rem;
  color: var(--color-text);
  background-color: var(--color-background); /* O el color de fondo de tus inputs */
}

.password-field-component:focus {
  outline: none;
  border-color: var(--brand-pink);
  box-shadow: 0 0 0 2px rgba(255, 107, 135, 0.2);
}

.password-field-component::placeholder {
  color: var(--vt-c-text-dark-2); /* O un color de placeholder adecuado */
  opacity: 0.7;
}

.password-toggle-btn-component {
  position: absolute;
  right: 1px; /* Distancia desde el borde derecho del wrapper. Ajusta si es necesario (e.g., 5px, 8px) */
  top: 50%;
  transform: translateY(-50%); /* Centrado vertical del botón */

  background: transparent;
  border: none;
  padding: 10px; /* Área clickeable. Si el icono es ~16px, el botón será ~36x36. */
  /* Este padding y el 'right' deben coordinarse con el padding-right del input. */
  margin: 0;
  cursor: pointer;
  color: var(--vt-c-indigo); /* Color del icono */

  display: flex; /* Para centrar el <font-awesome-icon> dentro del <button> */
  align-items: center;
  justify-content: center;

  line-height: 0; /* Ayuda a un mejor centrado vertical del SVG */
  z-index: 2;
  transition: color 0.2s ease; /* Transición suave para el color del icono */
}

/* Para el icono SVG dentro del botón */
.password-toggle-btn-component > svg {
  display: block; /* Elimina espacio extra bajo el icono si es inline */
  /* Puedes forzar un tamaño si el icono no se ve bien, e.g.: */
  /* width: 1em; height: 1em; */
}

/* CRUCIAL: Evita el movimiento ("salto") del botón del ojo en hover/focus */
.password-toggle-btn-component:hover:not(:disabled),
.password-toggle-btn-component:focus-visible:not(:disabled) {
  transform: translateY(-50%) !important; /* Mantiene el centrado vertical */
  /* Opcional: cambio de color en hover/focus para feedback */
  /* color: var(--brand-pink); */
}

.password-toggle-btn-component:focus-visible:not(:disabled) {
  outline: 2px solid var(--brand-pink); /* Estilo de foco accesible */
  outline-offset: 1px;
}
.password-toggle-btn-component:focus {
  /* Fallback para quitar outline por defecto */
  outline: none;
}

.password-toggle-btn-component:disabled {
  color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
  transform: translateY(-50%) !important; /* Mantiene centrado incluso deshabilitado */
}
</style>
