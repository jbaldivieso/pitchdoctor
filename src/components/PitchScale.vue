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
    <div class="level is-mobile mb-2">
      <div class="level-left">
        <span class="tag is-medium is-dark">{{ result.target.name }}</span>
      </div>
      <div class="level-right">
        <span v-if="result.detected" :class="['tag', 'is-medium', accuracyClass]">
          {{ result.detected.name }} {{ centsText }}
        </span>
        <span v-else class="tag is-medium is-dark not-detected">not detected</span>
      </div>
    </div>

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
        <span>♭</span>
        <span>♯</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pitch-bar {
  position: relative;
}

.pitch-bar-track {
  height: 12px;
  background: hsl(220, 40%, 12%);
  border-radius: 6px;
  position: relative;
  overflow: visible;
}

.pitch-bar-center {
  position: absolute;
  left: 50%;
  top: 0;
  width: 2px;
  height: 100%;
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(-50%);
}

.pitch-bar-indicator {
  position: absolute;
  width: 12px;
  height: 20px;
  top: -4px;
  transform: translateX(-50%);
  border-radius: 3px;
}

.pitch-bar-indicator.is-success {
  background: #4ecca3;
}
.pitch-bar-indicator.is-warning {
  background: #f0c040;
}
.pitch-bar-indicator.is-danger {
  background: #e94560;
}

.pitch-bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #8892a0;
  margin-top: 0.25rem;
}
</style>
