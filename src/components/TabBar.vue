<script setup lang="ts">
defineProps<{
  activeMode: 'beginner' | 'practice'
}>()

defineEmits<{
  change: ['beginner' | 'practice']
}>()
</script>

<template>
  <nav class="tab-bar" role="tablist" aria-label="App mode">
    <button
      class="tab-item"
      :class="{ 'tab-item--active': activeMode === 'beginner' }"
      role="tab"
      :aria-selected="activeMode === 'beginner'"
      @click="$emit('change', 'beginner')"
    >
      <span class="tab-icon">🎵</span>
      <span class="tab-label">Beginner</span>
    </button>
    <button
      class="tab-item"
      :class="{ 'tab-item--active': activeMode === 'practice' }"
      role="tab"
      :aria-selected="activeMode === 'practice'"
      @click="$emit('change', 'practice')"
    >
      <span class="tab-icon">🎼</span>
      <span class="tab-label">Practice</span>
    </button>
  </nav>
</template>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--bulma-scheme-main-bis, #16213e);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  z-index: 100;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 0 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.4);
  transition: color 0.15s;
  min-height: 56px;
  touch-action: manipulation;
  position: relative;
}

.tab-item::after {
  content: '';
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: var(--bulma-primary, #e94560);
  transform: scaleX(0);
  transition: transform 0.2s ease;
  border-radius: 0 0 2px 2px;
}

.tab-item--active {
  color: var(--bulma-primary, #e94560);
}

.tab-item--active::after {
  transform: scaleX(1);
}

.tab-icon {
  font-size: 1.2rem;
  line-height: 1;
}

.tab-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
