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
      class="button is-primary is-large play-btn"
      @click="emit('play')"
    >
      Play
    </button>

    <button
      v-else-if="appState === 'playing'"
      class="button is-primary is-large play-btn"
      disabled
    >
      <span class="playing-dots">Playing</span>
    </button>

    <button
      v-else-if="appState === 'listening'"
      class="button is-primary is-large play-btn"
      disabled
    >
      Listening…
    </button>

    <div v-else-if="appState === 'results'" class="buttons is-centered results-buttons">
      <button class="button is-primary is-large result-btn" @click="emit('tryAgain')">
        Try Again
      </button>
      <button class="button is-info is-large result-btn" @click="emit('newSequence')">
        New Sequence
      </button>
    </div>
  </div>
</template>

<style scoped>
.play-btn {
  width: 100%;
  max-width: 280px;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  height: 56px;
  border-radius: 28px;
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.play-btn:active:not(:disabled) {
  transform: scale(0.97);
}

/* "Playing" animated dots */
.playing-dots::after {
  content: '';
  animation: dots 1.2s steps(4, end) infinite;
}

@keyframes dots {
  0%   { content: ''; }
  25%  { content: '.'; }
  50%  { content: '..'; }
  75%  { content: '...'; }
}

/* Results buttons */
.results-buttons {
  gap: 0.75rem;
  flex-wrap: wrap;
}

.result-btn {
  flex: 1;
  min-width: 130px;
  max-width: 200px;
  height: 52px;
  border-radius: 26px;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.result-btn:active {
  transform: scale(0.97);
}
</style>
