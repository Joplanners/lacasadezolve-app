<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
        <div class="modal-content">
          <!-- Close -->
          <button class="modal-close" @click="$emit('close')" aria-label="Cerrar">✕</button>

          <!-- Header -->
          <div class="modal-header">
            <h3 class="modal-title glow-text">📝 Nuevo Mensaje</h3>
            <p class="modal-subtitle">Agrega tu manifestación al mural de Chile</p>
          </div>

          <!-- Form -->
          <form @submit.prevent="submitMessage" class="modal-form">
            <!-- Author -->
            <div class="form-group">
              <label for="msg-author" class="form-label">Tu nombre / alias</label>
              <input
                id="msg-author"
                v-model="form.author"
                type="text"
                class="form-input"
                placeholder="Ej: StayChile_2026"
                maxlength="30"
                required
              />
            </div>

            <!-- Tag -->
            <div class="form-group">
              <label class="form-label">Tipo de mensaje</label>
              <div class="tag-options">
                <button
                  v-for="tag in tags"
                  :key="tag.value"
                  type="button"
                  class="tag-option"
                  :class="{ active: form.tag === tag.value, [tag.class]: true }"
                  @click="form.tag = tag.value"
                >
                  {{ tag.icon }} {{ tag.label }}
                </button>
              </div>
            </div>

            <!-- Message -->
            <div class="form-group">
              <label for="msg-content" class="form-label">Tu mensaje</label>
              <textarea
                id="msg-content"
                v-model="form.message"
                class="form-textarea"
                placeholder="Tu manifestación en 50 caracteres ✨🔥🕯️"
                rows="2"
                maxlength="50"
                required
              ></textarea>
              <span class="char-count">{{ form.message.length }}/50</span>
            </div>

            <!-- Submit -->
            <button type="submit" class="submit-btn" :disabled="!isValid">
              <span>🔥</span> Publicar en el mural
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, computed } from 'vue'

defineProps({
  show: Boolean,
})

const emit = defineEmits(['close', 'submit'])

const tags = [
  { value: 'manifestación', label: 'Manifestación', icon: '✨', class: 'opt-manifest' },
  { value: 'energía', label: 'Energía', icon: '⚡', class: 'opt-energy' },
  { value: 'decreto', label: 'Decreto', icon: '🕯️', class: 'opt-decree' },
  { value: 'mensaje', label: 'Mensaje', icon: '💌', class: 'opt-message' },
]

const form = reactive({
  author: '',
  message: '',
  tag: 'manifestación',
})

const isValid = computed(() => {
  return form.author.trim().length > 0 && form.message.trim().length > 0
})

function submitMessage() {
  if (!isValid.value) return

  emit('submit', {
    id: Date.now(),
    author: form.author.trim(),
    message: form.message.trim(),
    tag: form.tag,
    timestamp: new Date().toISOString(),
  })

  // Reset
  form.author = ''
  form.message = ''
  form.tag = 'manifestación'

  emit('close')
}
</script>

<style scoped>
/* Backdrop */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(6px);
  padding: var(--space-md);
}

/* Content */
.modal-content {
  background: var(--bg-carbon);
  border: 1px solid var(--border-grunge);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  padding: var(--space-2xl);
  position: relative;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(211, 0, 0, 0.08);
}

/* Close */
.modal-close {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: rgba(211, 0, 0, 0.15);
  color: var(--accent-blood);
}

/* Header */
.modal-header {
  margin-bottom: var(--space-xl);
}

.modal-title {
  font-family: var(--font-display);
  font-size: 1.8rem;
  letter-spacing: 0.05em;
  color: var(--accent-blood);
}

.modal-subtitle {
  font-family: var(--font-grunge);
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: var(--space-xs);
}

/* Form */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  position: relative;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: var(--space-md);
  background: var(--bg-asphalt);
  border: 1px solid var(--border-dark);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 0.95rem;
  transition: border-color var(--transition-fast);
  outline: none;
}

.form-input:focus,
.form-textarea:focus {
  border-color: var(--accent-blood);
  box-shadow: 0 0 0 3px rgba(211, 0, 0, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.char-count {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* Tag options */
.tag-options {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.tag-option {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  border: 1px solid var(--border-dark);
  background: transparent;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.tag-option:hover {
  border-color: var(--text-muted);
}

.tag-option.active.opt-manifest {
  background: rgba(211, 0, 0, 0.15);
  border-color: var(--accent-blood);
  color: var(--accent-ember);
}

.tag-option.active.opt-energy {
  background: rgba(245, 158, 11, 0.12);
  border-color: #f59e0b;
  color: #f59e0b;
}

.tag-option.active.opt-decree {
  background: rgba(168, 85, 247, 0.12);
  border-color: #a855f7;
  color: #a855f7;
}

.tag-option.active.opt-message {
  background: rgba(160, 160, 160, 0.12);
  border-color: var(--text-secondary);
  color: var(--text-secondary);
}

/* Submit */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-xl);
  background: linear-gradient(135deg, var(--accent-blood), #a00000);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all var(--transition-base);
}

.submit-btn:hover:not(:disabled) {
  box-shadow: 0 0 30px rgba(211, 0, 0, 0.4);
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Transition */
.modal-enter-active {
  transition: all 0.3s ease;
}

.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from {
  opacity: 0;
}

.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}

.modal-enter-active .modal-content {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-to .modal-content {
  transform: scale(0.95);
  opacity: 0;
}
</style>
