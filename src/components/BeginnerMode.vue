<script setup lang="ts">
import { ref, computed } from 'vue'
import { Note } from 'tonal'
import type { Settings } from '@/types'
import type { Note as NoteType } from '@/types'
import { useAudioPlayer } from '@/composables/useAudioPlayer'
import { usePitchDetector } from '@/composables/usePitchDetector'
import LivePitchMeter from './LivePitchMeter.vue'

const props = defineProps<{ settings: Settings }>()

type BeginnerState = 'idle' | 'playing' | 'listening'

const state = ref<BeginnerState>('idle')
const micError = ref<string | null>(null)

const { play, isPlaying } = useAudioPlayer()
const { startContinuous, livePitch, error: detectorError } = usePitchDetector()

let stopDetection: (() => void) | null = null

const targetNote = computed<NoteType>(() => {
  const name = `${props.settings.rootNote}${props.settings.lowOctave}`
  const freq = Note.freq(name) ?? 261.63
  return { name, frequency: freq }
})

async function handleStart() {
  state.value = 'playing'
  micError.value = null

  await play([targetNote.value], props.settings.synthVoice)

  stopDetection = await startContinuous(targetNote.value.frequency)

  if (detectorError.value) {
    micError.value = detectorError.value
    state.value = 'idle'
    return
  }

  state.value = 'listening'
}

function handlePlayAgain() {
  // Replay tone while mic stays open
  play([targetNote.value], props.settings.synthVoice)
}

function handleStop() {
  stopDetection?.()
  stopDetection = null
  state.value = 'idle'
}
</script>

<template>
  <div class="beginner-mode">

    <!-- Idle state -->
    <transition name="slide-up" mode="out-in">

      <div v-if="state === 'idle'" key="idle" class="has-text-centered">
        <div class="target-note-display mb-2">
          {{ targetNote.name }}
        </div>
        <p class="subtitle-text mb-5">Sing this note</p>
        <button
          class="button is-primary is-rounded beginner-play-btn"
          @click="handleStart"
        >
          Play
        </button>
      </div>

      <div v-else-if="state === 'playing'" key="playing" class="has-text-centered">
        <div class="target-note-display mb-2">
          {{ targetNote.name }}
        </div>
        <p class="subtitle-text">
          Playing<span class="animated-dots"><span>.</span><span>.</span><span>.</span></span>
        </p>
      </div>

      <div v-else-if="state === 'listening'" key="listening">
        <LivePitchMeter
          :targetNote="targetNote"
          :livePitch="livePitch"
          class="mb-4"
        />
        <div class="beginner-actions">
          <button
            class="button is-info is-rounded"
            :disabled="isPlaying"
            @click="handlePlayAgain"
          >
            Play again
          </button>
          <button
            class="button is-danger is-outlined is-rounded"
            @click="handleStop"
          >
            Stop
          </button>
        </div>
      </div>

    </transition>

    <!-- Mic error -->
    <transition name="fade">
      <div v-if="micError" class="notification is-danger is-light mt-4">
        <p><strong>Microphone access required</strong></p>
        <p class="mt-1" style="font-size: 0.9rem;">
          {{ micError }}. To fix this, open your device Settings → Safari (or your browser) →
          Microphone and allow access, then reload the page.
        </p>
      </div>
    </transition>

  </div>
</template>

<style scoped>
.beginner-mode {
  width: 100%;
}

.target-note-display {
  font-size: 4rem;
  font-weight: 800;
  line-height: 1;
  color: var(--bulma-text, #eaeaea);
  letter-spacing: -0.02em;
}

.subtitle-text {
  font-size: 1rem;
  color: var(--bulma-text-light, #8892a0);
}

.beginner-play-btn {
  font-size: 1.1rem;
  height: 3.2rem;
  padding: 0 2.5rem;
  border-radius: 28px;
  min-width: 160px;
}

.beginner-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.beginner-actions .button {
  min-width: 120px;
  border-radius: 28px;
  font-size: 0.95rem;
  height: 2.8rem;
}

/* Animated dots for "Playing..." */
.animated-dots {
  display: inline-block;
}

.animated-dots span {
  animation: dot-blink 1.2s infinite;
  animation-fill-mode: both;
}
.animated-dots span:nth-child(2) { animation-delay: 0.2s; }
.animated-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-blink {
  0%, 80%, 100% { opacity: 0; }
  40% { opacity: 1; }
}
</style>
