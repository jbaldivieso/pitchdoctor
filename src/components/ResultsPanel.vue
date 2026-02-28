<script setup lang="ts">
import type { PitchResult } from '@/types'
import PitchScale from './PitchScale.vue'

defineProps<{
  results: PitchResult[]
}>()
</script>

<template>
  <div class="results-panel">
    <p v-if="results.length === 0" class="has-text-light has-text-centered py-4">
      No results yet.
    </p>
    <PitchScale v-for="(result, i) in results" :key="i" :result="result" />
  </div>
</template>
