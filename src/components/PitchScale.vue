<template>
  <div class="pitch-scale" :class="accuracyClass">
    <div class="pitch-scale__notes">
      <span class="pitch-scale__target tag is-medium">{{ result.target.name }}</span>
      <span v-if="result.detected" class="pitch-scale__detected">
        {{ result.detected.name }}
        <span class="pitch-scale__cents">{{ centsText }}</span>
      </span>
      <span v-else class="pitch-scale__missed">not detected</span>
    </div>
    <div class="pitch-scale__bar">
      <span class="pitch-scale__label">♭</span>
      <div class="pitch-scale__track">
        <div
          class="pitch-scale__indicator"
          data-testid="pitch-indicator"
          :style="{ left: indicatorPercent + '%' }"
        ></div>
      </div>
      <span class="pitch-scale__label">♯</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PitchResult } from '@/types'

const props = defineProps<{ result: PitchResult }>()

const accuracyClass = computed(() => {
  switch (props.result.accuracy) {
    case 'excellent':
      return 'is-success'
    case 'acceptable':
      return 'is-warning'
    case 'off':
    case 'missed':
      return 'is-danger'
  }
})

const indicatorPercent = computed(() => {
  const raw = 50 + (props.result.centsDeviation / 50) * 50
  return Math.max(0, Math.min(100, raw))
})

const centsText = computed(() => {
  const c = props.result.centsDeviation
  if (c === 0) return '0¢'
  return (c > 0 ? '+' : '') + c.toFixed(0) + '¢'
})
</script>
