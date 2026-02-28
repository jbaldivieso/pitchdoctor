<script setup lang="ts">
import { computed } from 'vue'
import type { PitchResult } from '@/types'

const props = defineProps<{
  result: PitchResult
}>()

// Position on the ±50¢ scale: 0% = far flat, 50% = center, 100% = far sharp
const indicatorPosition = computed(() => {
  const cents = props.result.centsDeviation
  return Math.min(100, Math.max(0, 50 + (cents / 50) * 50))
})

const accuracyClass = computed(() => {
  switch (props.result.accuracy) {
    case 'excellent':
      return 'is-success'
    case 'acceptable':
      return 'is-warning'
    case 'off':
      return 'is-danger'
    default:
      return 'is-dark'
  }
})

const centsText = computed(() => {
  const c = Math.round(props.result.centsDeviation)
  return c >= 0 ? `+${c}¢` : `${c}¢`
})
</script>

<template>
  <div class="pitch-scale box mb-3">
    <!-- Note name row -->
    <div class="pitch-scale-header">
      <div class="pitch-scale-target">
        <span class="pitch-label">Target</span>
        <span class="tag is-medium note-name-tag">{{ result.target.name }}</span>
      </div>

      <div class="pitch-scale-detected">
        <span class="pitch-label">You sang</span>
        <span v-if="result.detected" :class="['tag', 'is-medium', 'note-name-tag', accuracyClass]">
          {{ result.detected.name }}
          <span class="cents-text">{{ centsText }}</span>
        </span>
        <span v-else class="tag is-medium note-name-tag not-detected-tag">
          <span class="not-detected-icon">—</span>
          not detected
        </span>
      </div>
    </div>

    <!-- Pitch bar -->
    <div class="pitch-bar">
      <div class="pitch-bar-track">
        <div class="pitch-bar-center"></div>
        <div
          v-if="result.accuracy !== 'missed'"
          class="pitch-bar-indicator"
          :class="accuracyClass"
          :style="{ left: `${indicatorPosition}%` }"
        ></div>
      </div>
      <div class="pitch-bar-labels">
        <span>♭ flat</span>
        <span>sharp ♯</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pitch-scale-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.pitch-scale-target,
.pitch-scale-detected {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.pitch-scale-detected {
  align-items: flex-end;
}

.pitch-label {
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8892a0;
  line-height: 1;
}

.note-name-tag {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  height: 2rem;
  padding: 0 0.6rem;
  border-radius: 6px;
}

.cents-text {
  margin-left: 0.3em;
  font-size: 0.8em;
  font-weight: 500;
  opacity: 0.85;
}

/* Not detected styling: muted, with a dash indicator */
.not-detected-tag {
  background-color: rgba(255, 255, 255, 0.05) !important;
  color: #8892a0 !important;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  font-style: italic;
  font-size: 0.8rem;
}

.not-detected-icon {
  margin-right: 0.3em;
  font-style: normal;
}

/* Pitch bar */
.pitch-bar {
  position: relative;
}

.pitch-bar-track {
  height: 14px;
  background: hsl(220, 40%, 10%);
  border-radius: 7px;
  position: relative;
  overflow: visible;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.pitch-bar-center {
  position: absolute;
  left: 50%;
  top: -2px;
  width: 2px;
  height: calc(100% + 4px);
  background: rgba(255, 255, 255, 0.18);
  transform: translateX(-50%);
  border-radius: 1px;
}

.pitch-bar-indicator {
  position: absolute;
  width: 12px;
  height: 22px;
  top: -4px;
  transform: translateX(-50%);
  border-radius: 3px;
  transition: left 0.3s ease;
}

.pitch-bar-indicator.is-success {
  background: #4ecca3;
  box-shadow: 0 0 8px rgba(78, 204, 163, 0.5);
}
.pitch-bar-indicator.is-warning {
  background: #f0c040;
  box-shadow: 0 0 8px rgba(240, 192, 64, 0.5);
}
.pitch-bar-indicator.is-danger {
  background: #e94560;
  box-shadow: 0 0 8px rgba(233, 69, 96, 0.5);
}

.pitch-bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  color: #8892a0;
  margin-top: 0.35rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
</style>
