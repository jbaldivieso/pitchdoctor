<script setup lang="ts">
import { ref } from 'vue'
import type { AppState } from './types'

const state = ref<AppState>('idle')
</script>

<template>
  <section class="section">
    <div class="container">
      <h1 class="title has-text-centered">Pitch Doctor</h1>
      <p class="subtitle has-text-centered has-text-light">
        State: <strong class="has-text-primary">{{ state }}</strong>
      </p>
    </div>
  </section>
</template>
