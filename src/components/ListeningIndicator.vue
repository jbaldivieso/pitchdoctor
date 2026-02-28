<template>
  <div class="listening-indicator has-text-centered">
    <div class="pulse-ring"></div>
    <p class="has-text-light mt-3">Listening…</p>
  </div>
</template>

<style scoped>
.listening-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 0;
}

.pulse-ring {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: var(--bulma-primary, #e94560);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.9);
    opacity: 1;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.7;
  }
  100% {
    transform: scale(0.9);
    opacity: 1;
  }
}
</style>
