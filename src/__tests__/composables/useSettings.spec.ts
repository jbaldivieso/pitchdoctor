import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick, watch } from 'vue'
import { useSettings } from '../../composables/useSettings'

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns correct default values', () => {
    const { settings } = useSettings()
    expect(settings.sequenceLength).toBe(3)
    expect(settings.synthVoice).toBe('soft')
    expect(settings.rootNote).toBe('C')
    expect(settings.lowOctave).toBe(3)
    expect(settings.highOctave).toBe(5)
  })

  it('reads from localStorage on initialization', () => {
    localStorage.setItem('pitch-doctor-settings', JSON.stringify({
      sequenceLength: 5,
      synthVoice: 'piano',
      rootNote: 'G',
      lowOctave: 4,
      highOctave: 6,
    }))
    const { settings } = useSettings()
    expect(settings.sequenceLength).toBe(5)
    expect(settings.synthVoice).toBe('piano')
    expect(settings.rootNote).toBe('G')
    expect(settings.lowOctave).toBe(4)
    expect(settings.highOctave).toBe(6)
  })

  it('writes to localStorage when a setting changes', async () => {
    const { settings } = useSettings()
    settings.sequenceLength = 5
    await nextTick()
    const stored = JSON.parse(localStorage.getItem('pitch-doctor-settings') ?? '{}')
    expect(stored.sequenceLength).toBe(5)
  })

  it('persists all settings including synthVoice and rootNote', async () => {
    const { settings } = useSettings()
    settings.synthVoice = 'piano'
    settings.rootNote = 'G'
    await nextTick()
    const stored = JSON.parse(localStorage.getItem('pitch-doctor-settings') ?? '{}')
    expect(stored.synthVoice).toBe('piano')
    expect(stored.rootNote).toBe('G')
  })

  it('handles corrupted localStorage gracefully (falls back to defaults)', () => {
    localStorage.setItem('pitch-doctor-settings', '{invalid json]')
    const { settings } = useSettings()
    expect(settings.sequenceLength).toBe(3)
    expect(settings.synthVoice).toBe('soft')
    expect(settings.rootNote).toBe('C')
    expect(settings.lowOctave).toBe(3)
    expect(settings.highOctave).toBe(5)
  })

  it('handles missing keys in stored data by merging with defaults', () => {
    localStorage.setItem('pitch-doctor-settings', JSON.stringify({ sequenceLength: 6 }))
    const { settings } = useSettings()
    expect(settings.sequenceLength).toBe(6)
    expect(settings.synthVoice).toBe('soft')
    expect(settings.rootNote).toBe('C')
    expect(settings.lowOctave).toBe(3)
    expect(settings.highOctave).toBe(5)
  })

  it('handles non-object stored data gracefully', () => {
    localStorage.setItem('pitch-doctor-settings', '"just a string"')
    const { settings } = useSettings()
    expect(settings.sequenceLength).toBe(3)
    expect(settings.rootNote).toBe('C')
  })

  it('individual settings are reactive (changes trigger watchers)', async () => {
    const { settings } = useSettings()
    let callCount = 0
    watch(() => settings.sequenceLength, () => { callCount++ })
    settings.sequenceLength = 7
    await nextTick()
    expect(callCount).toBe(1)
  })

  it('changing lowOctave is reactive', async () => {
    const { settings } = useSettings()
    let callCount = 0
    watch(() => settings.lowOctave, () => { callCount++ })
    settings.lowOctave = 2
    await nextTick()
    expect(callCount).toBe(1)
  })
})
