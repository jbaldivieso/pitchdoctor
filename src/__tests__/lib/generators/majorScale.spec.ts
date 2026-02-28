import { describe, test, expect } from 'vitest'
import { Scale, Note, Midi } from 'tonal'
import { majorScaleGenerator } from '@/lib/generators/majorScale'
import type { GeneratorConfig } from '@/types'

/** Replicates the pool-building logic from majorScale.ts for cross-checking */
function buildExpectedPool(rootNote: string, lowOctave: number, highOctave: number): string[] {
  const scaleNotes = Scale.get(`${rootNote} major`).notes
  const pool: string[] = []
  const lowMidi = Midi.toMidi(`${rootNote}${lowOctave}`) ?? 0
  const highMidi = Midi.toMidi(`${rootNote}${highOctave}`) ?? 127
  for (let oct = lowOctave; oct <= highOctave; oct++) {
    for (const note of scaleNotes) {
      const name = `${note}${oct}`
      const midi = Midi.toMidi(name)
      if (midi !== null && midi >= lowMidi && midi <= highMidi) {
        pool.push(name)
      }
    }
  }
  return pool
}

const DEFAULT_CONFIG: GeneratorConfig = { rootNote: 'C', lowOctave: 4, highOctave: 5 }

describe('majorScaleGenerator', () => {
  describe('basic output', () => {
    test('generates the correct number of notes', () => {
      const result = majorScaleGenerator.generate(3, DEFAULT_CONFIG)
      expect(result).toHaveLength(3)
    })

    test('generates 1 note for length=1', () => {
      const result = majorScaleGenerator.generate(1, DEFAULT_CONFIG)
      expect(result).toHaveLength(1)
    })

    test('generates 7 notes for length=7', () => {
      const config: GeneratorConfig = { rootNote: 'C', lowOctave: 3, highOctave: 5 }
      const result = majorScaleGenerator.generate(7, config)
      expect(result).toHaveLength(7)
    })

    test('each note has a valid name string and positive frequency', () => {
      const result = majorScaleGenerator.generate(3, DEFAULT_CONFIG)
      for (const note of result) {
        expect(typeof note.name).toBe('string')
        expect(note.name.length).toBeGreaterThan(0)
        expect(note.frequency).toBeGreaterThan(0)
      }
    })

    test('frequencies match note names as reported by tonal', () => {
      const result = majorScaleGenerator.generate(3, DEFAULT_CONFIG)
      for (const note of result) {
        const expected = Note.freq(note.name)
        expect(expected).not.toBeNull()
        expect(note.frequency).toBeCloseTo(expected!, 1)
      }
    })
  })

  describe('scale correctness', () => {
    test('generates consecutive ascending scale tones for C major', () => {
      const config = DEFAULT_CONFIG
      const pool = buildExpectedPool(config.rootNote, config.lowOctave, config.highOctave)
      const result = majorScaleGenerator.generate(3, config)
      const startIdx = pool.indexOf(result[0].name)
      expect(startIdx).toBeGreaterThanOrEqual(0)
      for (let i = 0; i < result.length; i++) {
        expect(result[i].name).toBe(pool[startIdx + i])
      }
    })

    test('all generated notes fall within the specified octave range (C major)', () => {
      const config = DEFAULT_CONFIG
      const lowMidi = Midi.toMidi(`${config.rootNote}${config.lowOctave}`)!
      const highMidi = Midi.toMidi(`${config.rootNote}${config.highOctave}`)!
      const result = majorScaleGenerator.generate(4, config)
      for (const note of result) {
        const midi = Midi.toMidi(note.name)!
        expect(midi).toBeGreaterThanOrEqual(lowMidi)
        expect(midi).toBeLessThanOrEqual(highMidi)
      }
    })

    test('works with C major (scale notes are C D E F G A B)', () => {
      const cMajorNotes = Scale.get('C major').notes  // ['C','D','E','F','G','A','B']
      const result = majorScaleGenerator.generate(4, DEFAULT_CONFIG)
      for (const note of result) {
        const letter = note.name.replace(/\d/g, '')
        expect(cMajorNotes).toContain(letter)
      }
    })

    test('works with G major root', () => {
      const config: GeneratorConfig = { rootNote: 'G', lowOctave: 3, highOctave: 5 }
      const gMajorNotes = Scale.get('G major').notes  // G A B C D E F#
      const result = majorScaleGenerator.generate(4, config)
      for (const note of result) {
        const letter = note.name.replace(/\d/g, '')
        expect(gMajorNotes).toContain(letter)
      }
    })

    test('works with F major root', () => {
      const config: GeneratorConfig = { rootNote: 'F', lowOctave: 3, highOctave: 5 }
      const fMajorNotes = Scale.get('F major').notes  // F G A Bb C D E
      const result = majorScaleGenerator.generate(4, config)
      for (const note of result) {
        const letter = note.name.replace(/\d/g, '')
        expect(fMajorNotes).toContain(letter)
      }
    })

    test('generates consecutive ascending scale tones for G major', () => {
      const config: GeneratorConfig = { rootNote: 'G', lowOctave: 4, highOctave: 5 }
      const pool = buildExpectedPool(config.rootNote, config.lowOctave, config.highOctave)
      const result = majorScaleGenerator.generate(3, config)
      const startIdx = pool.indexOf(result[0].name)
      expect(startIdx).toBeGreaterThanOrEqual(0)
      for (let i = 0; i < result.length; i++) {
        expect(result[i].name).toBe(pool[startIdx + i])
      }
    })
  })

  describe('edge cases', () => {
    test('clamps gracefully when requested length exceeds the available pool', () => {
      // lowOctave=4, highOctave=4 with root C gives only C4 in the pool
      const config: GeneratorConfig = { rootNote: 'C', lowOctave: 4, highOctave: 4 }
      const pool = buildExpectedPool('C', 4, 4)
      const result = majorScaleGenerator.generate(10, config)
      // Should not crash and should return at most what's available
      expect(result.length).toBeLessThanOrEqual(pool.length)
      expect(result.length).toBeGreaterThan(0)
    })

    test('throws when octave range yields no notes', () => {
      // Inverted range — high < low
      const config: GeneratorConfig = { rootNote: 'C', lowOctave: 5, highOctave: 3 }
      expect(() => majorScaleGenerator.generate(3, config)).toThrow()
    })
  })

  describe('randomness', () => {
    test('starting position varies across multiple calls (statistical)', () => {
      // Large pool so there are many valid starting positions
      const config: GeneratorConfig = { rootNote: 'C', lowOctave: 3, highOctave: 5 }
      const firstNotes = new Set<string>()
      for (let i = 0; i < 50; i++) {
        const result = majorScaleGenerator.generate(3, config)
        firstNotes.add(result[0].name)
      }
      // With a large pool we expect at least 3 distinct starting notes in 50 tries
      expect(firstNotes.size).toBeGreaterThan(2)
    })

    test('starting position never produces out-of-bounds sequences', () => {
      const config: GeneratorConfig = { rootNote: 'C', lowOctave: 3, highOctave: 5 }
      const pool = buildExpectedPool('C', 3, 5)
      for (let i = 0; i < 30; i++) {
        const result = majorScaleGenerator.generate(4, config)
        for (const note of result) {
          expect(pool).toContain(note.name)
        }
      }
    })
  })
})
