<template>
  <div class="results-panel">
    <PitchScale
      v-for="(result, index) in results"
      :key="index"
      :result="result"
    />
  </div>
</template>

<script setup lang="ts">
import PitchScale from './PitchScale.vue'
import type { PitchResult } from '@/types'

defineProps<{ results: PitchResult[] }>()
</script>
