<script setup lang="ts">
import type { AppState } from '@/types'

defineProps<{
  appState: AppState
}>()

const emit = defineEmits<{
  play: []
  tryAgain: []
  newSequence: []
}>()
</script>

<template>
  <div class="play-button-group">
    <button
      v-if="appState === 'idle'"
      class="button is-primary is-large"
      @click="emit('play')"
    >
      Play
    </button>

    <button
      v-else-if="appState === 'playing'"
      class="button is-primary is-large"
      disabled
    >
      Playing…
    </button>

    <button
      v-else-if="appState === 'listening'"
      class="button is-primary is-large"
      disabled
    >
      Listening…
    </button>

    <div v-else-if="appState === 'results'" class="buttons is-centered">
      <button class="button is-primary is-large" @click="emit('tryAgain')">
        Try Again
      </button>
      <button class="button is-info is-large" @click="emit('newSequence')">
        New Sequence
      </button>
    </div>
  </div>
</template>
