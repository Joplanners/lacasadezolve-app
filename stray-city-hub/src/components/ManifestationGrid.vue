<template>
  <section id="mural" class="section mural-section">
    <div class="container">
      <div class="mural-header">
        <div>
          <h2 class="section-title">📌 Mural Chile</h2>
          <p class="mural-desc">Manifestation Grid — Deja tu mensaje para que SKZ llegue a Chile</p>
        </div>
        <button class="add-btn" @click="$emit('open-modal')">
          <span class="add-icon">+</span>
          <span>Agregar mensaje</span>
        </button>
      </div>

      <div class="masonry-grid" ref="gridRef">
        <div
          v-for="(msg, index) in messages"
          :key="msg.id"
          class="mural-card torn-edge"
          :class="[`rotation-${(index % 5) + 1}`, `delay-${(index % 4) + 1}`]"
        >
          <div class="tape" :style="tapeStyle(index)"></div>

          <!-- Tag -->
          <span class="msg-tag" :class="tagClass(msg.tag)">{{ msg.tag }}</span>

          <!-- Content -->
          <p class="msg-content">{{ msg.message }}</p>

          <!-- Footer -->
          <div class="msg-footer">
            <span class="msg-author">— {{ msg.author }}</span>
            <span class="msg-date">{{ formatDate(msg.created_at || msg.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import gsap from 'gsap'

const props = defineProps({
  messages: {
    type: Array,
    required: true,
  },
})

defineEmits(['open-modal'])

const gridRef = ref(null)

function tagClass(tag) {
  const map = {
    manifestación: 'tag-manifest',
    energía: 'tag-energy',
    decreto: 'tag-decree',
    mensaje: 'tag-message',
  }
  return map[tag] || 'tag-message'
}

function tapeStyle(index) {
  const rotations = [-5, 2, -1, 4, -3]
  const positions = [15, 30, 50, 10, 40]
  return {
    transform: `rotate(${rotations[index % 5]}deg)`,
    right: `${positions[index % 5]}px`,
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

onMounted(() => {
  if (gridRef.value) {
    const cards = gridRef.value.querySelectorAll('.mural-card')
    gsap.from(cards, {
      y: 30,
      opacity: 0,
      duration: 0.5,
      stagger: 0.08,
      ease: 'power2.out',
    })
  }
})
</script>

<style scoped>
.mural-section {
  position: relative;
}

.mural-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
  margin-bottom: var(--space-xl);
}

.mural-desc {
  font-family: var(--font-grunge);
  color: var(--text-muted);
  margin-top: -0.8rem;
  font-size: 0.95rem;
}

/* Add button */
.add-btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  background: transparent;
  border: 2px solid var(--accent-blood);
  color: var(--accent-blood);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all var(--transition-base);
  white-space: nowrap;
}

.add-btn:hover {
  background: var(--accent-blood);
  color: white;
  box-shadow: 0 0 20px rgba(211, 0, 0, 0.3);
}

.add-icon {
  font-size: 1.3rem;
  font-weight: 300;
}

/* Masonry Grid */
.masonry-grid {
  columns: 3;
  column-gap: var(--space-lg);
}

/* Cards */
.mural-card {
  break-inside: avoid;
  margin-bottom: var(--space-lg);
  padding: var(--space-lg);
  background: var(--bg-carbon);
  border: 1px solid var(--border-grunge);
  border-radius: var(--radius-sm);
  position: relative;
  overflow: visible;
  transition: all var(--transition-base);
}

.mural-card:hover {
  border-color: var(--accent-blood);
  box-shadow: 0 4px 24px rgba(211, 0, 0, 0.1);
}

/* Slight rotations for grunge feel */
.rotation-1 { transform: rotate(-0.8deg); }
.rotation-2 { transform: rotate(0.5deg); }
.rotation-3 { transform: rotate(-0.3deg); }
.rotation-4 { transform: rotate(1deg); }
.rotation-5 { transform: rotate(-0.6deg); }

.mural-card:hover {
  transform: rotate(0deg) scale(1.02);
}

/* Tag */
.msg-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-sm);
}

.tag-manifest {
  background: rgba(211, 0, 0, 0.15);
  color: var(--accent-ember);
  border: 1px solid rgba(211, 0, 0, 0.3);
}

.tag-energy {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.tag-decree {
  background: rgba(168, 85, 247, 0.12);
  color: #a855f7;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.tag-message {
  background: rgba(160, 160, 160, 0.12);
  color: var(--text-secondary);
  border: 1px solid rgba(160, 160, 160, 0.3);
}

/* Content */
.msg-content {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: var(--space-md);
  font-family: var(--font-grunge);
}

/* Footer */
.msg-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-sm);
}

.msg-author {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent-blood);
}

.msg-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Responsive */
@media (max-width: 900px) {
  .masonry-grid {
    columns: 2;
  }
}

@media (max-width: 600px) {
  .masonry-grid {
    columns: 1;
  }

  .mural-header {
    flex-direction: column;
  }

  .add-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
