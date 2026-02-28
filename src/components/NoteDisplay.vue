<script setup lang="ts">
import type { NoteSequence } from '@/types'

defineProps<{
  notes: NoteSequence
  activeIndex: number | null
}>()
</script>

<template>
  <div class="tags are-medium is-centered note-display">
    <span
      v-for="(note, i) in notes"
      :key="i"
      :class="['tag', 'is-medium', i === activeIndex ? 'is-primary' : 'is-dark']"
    >
      {{ note.name }}
    </span>
  </div>
</template>
