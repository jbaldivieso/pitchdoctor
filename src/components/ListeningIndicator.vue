<template>
  <div class="listening-indicator has-text-centered">
    <div class="pulse-wrapper">
      <div class="pulse-ring pulse-ring--outer"></div>
      <div class="pulse-ring pulse-ring--inner"></div>
      <div class="mic-icon" aria-hidden="true">🎤</div>
    </div>
    <p class="listening-label mt-4">Listening…</p>
    <p class="listening-hint">Sing each note you heard</p>
  </div>
</template>

<style scoped>
.listening-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 0 1.5rem;
}

.pulse-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  border-radius: 50%;
  background-color: var(--bulma-primary, #e94560);
}

.pulse-ring--outer {
  width: 80px;
  height: 80px;
  opacity: 0;
  animation: pulse-outer 1.6s ease-out infinite;
}

.pulse-ring--inner {
  width: 56px;
  height: 56px;
  animation: pulse-inner 1.6s ease-in-out infinite;
}

.mic-icon {
  position: relative;
  z-index: 1;
  font-size: 1.5rem;
  line-height: 1;
}

@keyframes pulse-outer {
  0% {
    transform: scale(0.7);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes pulse-inner {
  0%   { transform: scale(0.92); }
  50%  { transform: scale(1.04); }
  100% { transform: scale(0.92); }
}

.listening-label {
  font-size: 1.05rem;
  font-weight: 600;
  color: #eaeaea;
  letter-spacing: 0.01em;
}

.listening-hint {
  font-size: 0.8rem;
  color: #8892a0;
  margin-top: 0.25rem;
}
</style>
