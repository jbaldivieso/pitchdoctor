import { Scale, Note, Midi } from 'tonal'
import type { NoteGenerator, NoteSequence, GeneratorConfig } from '@/types'

/**
 * Builds the list of note names within the octave range for a given root+scale.
 */
function buildNotePool(
  rootNote: string,
  lowOctave: number,
  highOctave: number,
): string[] {
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

export const majorScaleGenerator: NoteGenerator = {
  id: 'major-scale',
  name: 'Major Scale',
  description: 'Consecutive ascending notes from a major scale',

  generate(length: number, config: GeneratorConfig): NoteSequence {
    const { rootNote, lowOctave, highOctave } = config
    const pool = buildNotePool(rootNote, lowOctave, highOctave)

    if (pool.length === 0) {
      throw new Error(`No notes in range ${rootNote}${lowOctave}–${rootNote}${highOctave}`)
    }

    // Clamp length to what's available
    const maxStart = Math.max(0, pool.length - length)
    const startIndex = Math.floor(Math.random() * (maxStart + 1))
    const slice = pool.slice(startIndex, startIndex + length)

    return slice.map((name) => ({
      name,
      frequency: Note.freq(name) ?? 0,
    }))
  },
}
