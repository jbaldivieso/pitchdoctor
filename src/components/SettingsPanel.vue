<script setup lang="ts">
import { watch } from 'vue'
import type { Settings } from '../types'

const props = defineProps<{ settings: Settings }>()
const emit = defineEmits<{ change: [settings: Settings] }>()

const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const OCTAVES = [1, 2, 3, 4, 5, 6, 7, 8]

watch(
  () => ({ ...props.settings }),
  (newValue) => { emit('change', newValue) },
  { deep: true },
)
</script>

<template>
  <div class="box">
    <h2 class="title is-5 mb-4">Settings</h2>

    <div class="field">
      <label class="label">Notes in sequence</label>
      <div class="control">
        <div class="select">
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
        <div class="select">
          <select
            data-testid="synth-voice"
            :value="settings.synthVoice"
            @change="settings.synthVoice = ($event.target as HTMLSelectElement).value as Settings['synthVoice']"
          >
            <option value="sine">Sine</option>
            <option value="soft">Soft</option>
            <option value="piano">Piano</option>
          </select>
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label">Root note</label>
      <div class="control">
        <div class="select">
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

    <div class="field">
      <label class="label">Low octave</label>
      <div class="control">
        <div class="select">
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

    <div class="field">
      <label class="label">High octave</label>
      <div class="control">
        <div class="select">
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
</template>
