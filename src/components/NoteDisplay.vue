<script setup lang="ts">
import type { NoteSequence } from '@/types'

defineProps<{
  notes: NoteSequence
  activeIndex: number | null
}>()
</script>

<template>
  <div class="note-display">
    <!-- Placeholder when no sequence loaded yet -->
    <div v-if="notes.length === 0" class="note-display-empty">
      <p class="has-text-light">Tap Play to start</p>
    </div>

    <!-- Sequence of note tags -->
    <div v-else class="tags are-large is-centered note-tags">
      <span
        v-for="(note, i) in notes"
        :key="i"
        :class="['tag', 'is-large', 'note-tag', i === activeIndex ? 'is-primary' : '']"
      >
        {{ note.name }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.note-display {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.note-display-empty {
  padding: 1rem 0;
  font-size: 0.9rem;
  opacity: 0.6;
}

.note-tags {
  gap: 0.5rem;
  flex-wrap: wrap;
}

.note-tag {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  min-width: 56px;
  height: 48px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.07);
  color: #eaeaea;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease,
    transform 0.15s ease, box-shadow 0.15s ease;
}

.note-tag.is-primary {
  background-color: #e94560;
  color: #fff;
  border-color: #e94560;
  transform: scale(1.08);
  box-shadow: 0 0 16px rgba(233, 69, 96, 0.45);
}
</style>
