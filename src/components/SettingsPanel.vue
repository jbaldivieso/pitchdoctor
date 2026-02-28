<script setup lang="ts">
import { watch } from 'vue'
import type { Settings } from '../types'

const props = defineProps<{ settings: Settings }>()
const emit = defineEmits<{
  change: [settings: Settings]
  close: []
}>()

const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const OCTAVES = [1, 2, 3, 4, 5, 6, 7, 8]

watch(
  () => ({ ...props.settings }),
  (newValue) => { emit('change', newValue) },
  { deep: true },
)
</script>

<template>
  <div class="box settings-panel">
    <div class="settings-header">
      <h2 class="title is-5 mb-0">Settings</h2>
      <button
        class="settings-close-btn"
        aria-label="Close settings"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>

    <hr class="settings-divider" />

    <div class="field">
      <label class="label">Notes in sequence</label>
      <div class="control">
        <div class="select is-fullwidth">
          <select
            data-testid="sequence-length"
            :value="settings.sequenceLength"
            @change="settings.sequenceLength = +($event.target as HTMLSelectElement).value"
          >
            <option v-for="n in 7" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label">Synth voice</label>
      <div class="control">
        <div class="select is-fullwidth">
          <select
            data-testid="synth-voice"
            :value="settings.synthVoice"
            @change="settings.synthVoice = ($event.target as HTMLSelectElement).value as Settings['synthVoice']"
          >
            <option value="sine">Sine — pure tuner tone</option>
            <option value="soft">Soft — warm triangle</option>
            <option value="piano">Piano — percussive attack</option>
          </select>
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label">Root note</label>
      <div class="control">
        <div class="select is-fullwidth">
          <select
            data-testid="root-note"
            :value="settings.rootNote"
            @change="settings.rootNote = ($event.target as HTMLSelectElement).value"
          >
            <option v-for="note in ALL_NOTES" :key="note" :value="note">{{ note }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="columns is-mobile is-variable is-2">
      <div class="column">
        <div class="field">
          <label class="label">Low octave</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select
                data-testid="low-octave"
                :value="settings.lowOctave"
                @change="settings.lowOctave = +($event.target as HTMLSelectElement).value"
              >
                <option v-for="n in OCTAVES" :key="n" :value="n">{{ n }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div class="column">
        <div class="field">
          <label class="label">High octave</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select
                data-testid="high-octave"
                :value="settings.highOctave"
                @change="settings.highOctave = +($event.target as HTMLSelectElement).value"
              >
                <option v-for="n in OCTAVES" :key="n" :value="n">{{ n }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-panel {
  padding: 1.25rem 1.5rem;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-divider {
  background-color: rgba(255, 255, 255, 0.06);
  margin: 0.75rem 0 1rem;
  height: 1px;
}

.settings-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #8892a0;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}

.settings-close-btn:hover,
.settings-close-btn:focus {
  background: rgba(255, 255, 255, 0.1);
  color: #eaeaea;
  outline: none;
}

/* Override Bulma label/select colors for dark theme */
:deep(.label) {
  color: #8892a0;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
}

:deep(.select select) {
  background-color: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
  color: #eaeaea;
  border-radius: 8px;
  height: 42px;
}

:deep(.select select:focus) {
  border-color: #e94560;
  box-shadow: 0 0 0 2px rgba(233, 69, 96, 0.25);
}

:deep(.select::after) {
  border-color: #8892a0;
}
</style>
