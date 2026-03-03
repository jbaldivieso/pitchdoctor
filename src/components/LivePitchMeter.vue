<script setup lang="ts">
import { computed } from 'vue'
import { Note, Interval } from 'tonal'
import type { Note as NoteType, LivePitch } from '@/types'
import { classifyAccuracy } from '@/lib/pitchUtils'

const props = withDefaults(defineProps<{
  targetNote: NoteType
  livePitch: LivePitch | null
  rangeInCents?: number
}>(), {
  rangeInCents: 300,
})

const SEMITONES = [-3, -2, -1, 0, 1, 2, 3]
const CLARITY_THRESHOLD = 0.7

const isSinging = computed(() =>
  props.livePitch !== null &&
  props.livePitch.clarity >= CLARITY_THRESHOLD &&
  props.livePitch.frequency !== null
)

/** Tick marks: one per semitone across the range */
const ticks = computed(() =>
  SEMITONES.map((semitones) => ({
    semitones,
    position: 50 + (semitones * 100 / props.rangeInCents) * 50,
    noteName: Note.transpose(props.targetNote.name, Interval.fromSemitones(semitones)),
  }))
)

/** Indicator position clamped to visible bar (2%–98%) */
const indicatorLeft = computed(() => {
  const cents = props.livePitch?.centsDeviation ?? 0
  const pos = 50 + (cents / props.rangeInCents) * 50
  return Math.min(98, Math.max(2, pos))
})

const accuracy = computed(() => {
  if (!isSinging.value || props.livePitch?.centsDeviation === null) return null
  return classifyAccuracy(props.livePitch!.centsDeviation!)
})

const accuracyClass = computed(() => {
  if (!accuracy.value) return ''
  return {
    excellent: 'is-success',
    acceptable: 'is-warning',
    off: 'is-danger',
  }[accuracy.value]
})

const centsText = computed(() => {
  const c = props.livePitch?.centsDeviation
  if (c === null || c === undefined) return ''
  const n = Math.round(c)
  if (n === 0) return '0¢'
  return n > 0 ? `+${n}¢` : `${n}¢`
})
</script>

<template>
  <div class="live-pitch-meter">

    <!-- Header row: target vs detected -->
    <div class="meter-header">
      <div class="meter-note-group">
        <span class="meter-label">Target</span>
        <span class="note-tag">{{ targetNote.name }}</span>
      </div>
      <div v-if="isSinging" class="meter-note-group meter-note-group--right">
        <span class="meter-label">You</span>
        <span class="note-tag" :class="accuracyClass">{{ livePitch?.noteName ?? '—' }}</span>
        <span class="cents-offset" :class="accuracyClass">{{ centsText }}</span>
      </div>
      <div v-else class="meter-hint">
        Sing a note…
      </div>
    </div>

    <!-- Meter bar -->
    <div class="meter-track" role="meter" :aria-valuenow="livePitch?.centsDeviation ?? 0"
         :aria-valuemin="-rangeInCents" :aria-valuemax="rangeInCents">

      <!-- Semitone tick lines -->
      <div
        v-for="tick in ticks"
        :key="tick.semitones"
        class="tick-line"
        :class="{ 'tick-line--center': tick.semitones === 0 }"
        :style="{ left: tick.position + '%' }"
      />

      <!-- Sliding indicator -->
      <div
        v-if="isSinging"
        class="pitch-indicator"
        :class="accuracyClass"
        :style="{ left: indicatorLeft + '%' }"
      />
      <div v-else class="pitch-indicator pitch-indicator--silent" style="left: 50%" />
    </div>

    <!-- Flat/Sharp and note-name labels below the bar -->
    <div class="tick-labels">
      <div
        v-for="tick in ticks"
        :key="tick.semitones"
        class="tick-label"
        :class="{ 'tick-label--center': tick.semitones === 0 }"
        :style="{ left: tick.position + '%' }"
      >
        {{ tick.noteName }}
      </div>
    </div>

  </div>
</template>

<style scoped>
.live-pitch-meter {
  background: var(--bulma-scheme-main-bis, #16213e);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem 1rem 1.5rem;
}

/* Header */
.meter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.meter-note-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.meter-note-group--right {
  flex-direction: row-reverse;
}

.meter-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--bulma-text-light, #8892a0);
}

.note-tag {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--bulma-text, #eaeaea);
  min-width: 2.8rem;
  text-align: center;
  transition: background 0.2s, border-color 0.2s;
}

.note-tag.is-success {
  background: rgba(78, 204, 163, 0.18);
  border-color: #4ecca3;
  color: #4ecca3;
}
.note-tag.is-warning {
  background: rgba(240, 192, 64, 0.18);
  border-color: #f0c040;
  color: #f0c040;
}
.note-tag.is-danger {
  background: rgba(233, 69, 96, 0.18);
  border-color: #e94560;
  color: #e94560;
}

.cents-offset {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--bulma-text-light, #8892a0);
  min-width: 2rem;
  text-align: right;
}
.cents-offset.is-success { color: #4ecca3; }
.cents-offset.is-warning { color: #f0c040; }
.cents-offset.is-danger  { color: #e94560; }

.meter-hint {
  font-size: 0.85rem;
  color: var(--bulma-text-light, #8892a0);
  font-style: italic;
}

/* Track */
.meter-track {
  position: relative;
  height: 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  overflow: visible;
  margin-bottom: 0.35rem;
}

/* Tick lines */
.tick-line {
  position: absolute;
  top: 3px;
  bottom: 3px;
  width: 1px;
  background: rgba(255, 255, 255, 0.18);
  transform: translateX(-50%);
}
.tick-line--center {
  width: 2px;
  background: rgba(255, 255, 255, 0.45);
  top: 0;
  bottom: 0;
}

/* Indicator pill */
.pitch-indicator {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 26px;
  border-radius: 7px;
  transform: translate(-50%, -50%);
  transition: left 0.08s ease, background 0.2s, box-shadow 0.2s;
  background: #8892a0;
}

.pitch-indicator.is-success {
  background: #4ecca3;
  box-shadow: 0 0 8px rgba(78, 204, 163, 0.7);
}
.pitch-indicator.is-warning {
  background: #f0c040;
  box-shadow: 0 0 8px rgba(240, 192, 64, 0.7);
}
.pitch-indicator.is-danger {
  background: #e94560;
  box-shadow: 0 0 8px rgba(233, 69, 96, 0.7);
}
.pitch-indicator--silent {
  background: rgba(255, 255, 255, 0.12);
  box-shadow: none;
}

/* Labels */
.tick-labels {
  position: relative;
  height: 1.2rem;
}

.tick-label {
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.35);
  white-space: nowrap;
  user-select: none;
}

.tick-label--center {
  color: rgba(255, 255, 255, 0.7);
  font-weight: 700;
  font-size: 0.7rem;
}
</style>
