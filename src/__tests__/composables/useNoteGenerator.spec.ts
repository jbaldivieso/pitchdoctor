import { describe, test, expect } from 'vitest'
import { useNoteGenerator } from '@/composables/useNoteGenerator'
import type { GeneratorConfig } from '@/types'

const config: GeneratorConfig = { rootNote: 'C', lowOctave: 4, highOctave: 5 }

describe('useNoteGenerator', () => {
  test('exposes a generate function', () => {
    const { generate } = useNoteGenerator()
    expect(typeof generate).toBe('function')
  })

  test('delegates to majorScaleGenerator by default and returns a NoteSequence', () => {
    const { generate } = useNoteGenerator()
    const result = generate(3, config)
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(3)
  })

  test('passes config through to the underlying generator correctly', () => {
    const { generate } = useNoteGenerator()
    // G major should produce notes from G major scale
    const gConfig: GeneratorConfig = { rootNote: 'G', lowOctave: 4, highOctave: 5 }
    const result = generate(3, gConfig)
    expect(result).toHaveLength(3)
    // All notes should have positive frequencies
    for (const note of result) {
      expect(note.frequency).toBeGreaterThan(0)
    }
  })

  test('each item in the returned NoteSequence has a name and frequency', () => {
    const { generate } = useNoteGenerator()
    const result = generate(4, config)
    for (const note of result) {
      expect(typeof note.name).toBe('string')
      expect(note.name.length).toBeGreaterThan(0)
      expect(typeof note.frequency).toBe('number')
      expect(note.frequency).toBeGreaterThan(0)
    }
  })
})
