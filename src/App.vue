<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AppState, NoteSequence, PitchResult } from './types'
import { useNoteGenerator } from './composables/useNoteGenerator'
import { useAudioPlayer } from './composables/useAudioPlayer'
import { usePitchDetector } from './composables/usePitchDetector'
import { useSettings } from './composables/useSettings'
import PlayButton from './components/PlayButton.vue'
import NoteDisplay from './components/NoteDisplay.vue'
import ListeningIndicator from './components/ListeningIndicator.vue'
import ResultsPanel from './components/ResultsPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'

// Timing constants must match useAudioPlayer internals
const NOTE_INTERVAL_MS = 1100 // 0.8s duration + 0.3s gap

const { settings } = useSettings()
const showSettings = ref(false)

const state = ref<AppState>('idle')
const currentSequence = ref<NoteSequence>([])
const activeNoteIndex = ref<number | null>(null)
const pitchResults = ref<PitchResult[]>([])
const micError = ref<string | null>(null)

const { generate } = useNoteGenerator()
const { play } = useAudioPlayer()
const { listen, error: detectorError } = usePitchDetector()

const generatorConfig = computed(() => ({
  rootNote: settings.rootNote,
  lowOctave: settings.lowOctave,
  highOctave: settings.highOctave,
}))

/**
 * Core flow: play a sequence then listen for the user to sing it back.
 */
async function runFlow(sequence: NoteSequence) {
  // --- PLAYING phase ---
  state.value = 'playing'
  activeNoteIndex.value = 0

  // Schedule visual note highlighting in sync with audio playback
  for (let i = 1; i < sequence.length; i++) {
    setTimeout(() => {
      activeNoteIndex.value = i
    }, i * NOTE_INTERVAL_MS)
  }

  await play(sequence, settings.synthVoice)
  activeNoteIndex.value = null

  // --- LISTENING phase ---
  state.value = 'listening'
  micError.value = null

  const results = await listen(sequence)
  pitchResults.value = results

  if (detectorError.value) {
    micError.value = detectorError.value
  }

  state.value = 'results'
}

async function handlePlay() {
  const seq = generate(settings.sequenceLength, generatorConfig.value)
  currentSequence.value = seq
  await runFlow(seq)
}

async function handleTryAgain() {
  await runFlow(currentSequence.value)
}

async function handleNewSequence() {
  await handlePlay()
}

const settingsAvailable = computed(
  () => state.value === 'idle' || state.value === 'results'
)
</script>

<template>
  <section class="section py-5">
    <div class="container" style="max-width: 480px">

      <!-- Header -->
      <div class="is-flex is-justify-content-space-between is-align-items-center mb-5">
        <div>
          <div class="app-title">
            Pitch<span class="app-title-accent">Doctor</span>
          </div>
          <div class="app-subtitle">Sing it back</div>
        </div>
        <button
          class="settings-btn"
          :disabled="!settingsAvailable"
          @click="showSettings = !showSettings"
          :aria-label="showSettings ? 'Close settings' : 'Open settings'"
          :aria-expanded="showSettings"
        >
          {{ showSettings ? '✕' : '⚙' }}
        </button>
      </div>

      <!-- Settings panel (fade transition) -->
      <transition name="fade">
        <div v-if="showSettings" class="mb-5">
          <SettingsPanel :settings="settings" @close="showSettings = false" />
        </div>
      </transition>

      <!-- Main content area (slide-up transition on state changes) -->
      <transition name="slide-up" mode="out-in">

        <!-- Listening phase -->
        <div v-if="state === 'listening'" key="listening" class="mb-5">
          <ListeningIndicator />
        </div>

        <!-- Playing / idle / results: show note display -->
        <div v-else key="display" class="mb-5">
          <NoteDisplay :notes="currentSequence" :activeIndex="activeNoteIndex" />
        </div>

      </transition>

      <!-- Results panel (fade in when results arrive) -->
      <transition name="fade">
        <div v-if="state === 'results'" class="mb-5">
          <ResultsPanel :results="pitchResults" />
        </div>
      </transition>

      <!-- Mic error message -->
      <transition name="fade">
        <div v-if="micError" class="notification is-danger is-light mb-4">
          <p><strong>Microphone access required</strong></p>
          <p class="mt-1" style="font-size: 0.9rem;">
            {{ micError }}. To fix this, open your device Settings → Safari (or your
            browser) → Microphone and allow access, then reload the page.
          </p>
        </div>
      </transition>

      <!-- Action buttons -->
      <div class="has-text-centered mt-4">
        <PlayButton
          :appState="state"
          @play="handlePlay"
          @tryAgain="handleTryAgain"
          @newSequence="handleNewSequence"
        />
      </div>

    </div>
  </section>
</template>
