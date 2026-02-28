import { reactive, watch } from 'vue'
import type { Settings } from '../types'

export const STORAGE_KEY = 'pitch-doctor-settings'

export const DEFAULT_SETTINGS: Settings = {
  sequenceLength: 3,
  synthVoice: 'soft',
  rootNote: 'C',
  lowOctave: 3,
  highOctave: 5,
}

function loadFromStorage(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULT_SETTINGS }
    }
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function useSettings() {
  const settings = reactive<Settings>(loadFromStorage())

  watch(
    () => ({ ...settings }),
    (newValue) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue))
    },
    { deep: true },
  )

  return { settings }
}
