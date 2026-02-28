/** A single musical note */
export interface Note {
  name: string       // e.g. "C4"
  frequency: number  // e.g. 261.63
}

/** An ordered sequence of notes to play / match */
export type NoteSequence = Note[]

/** Result of pitch detection for one sung note */
export interface PitchResult {
  target: Note
  detected: Note | null        // null if not detected
  centsDeviation: number       // negative = flat, positive = sharp
  medianFrequency: number | null
  accuracy: 'excellent' | 'acceptable' | 'off' | 'missed'
}

/** App state machine */
export type AppState = 'idle' | 'playing' | 'listening' | 'results'

/** Config passed to a note generator */
export interface GeneratorConfig {
  rootNote: string   // e.g. "C"
  lowOctave: number  // e.g. 3
  highOctave: number // e.g. 5
}

/** Strategy-pattern interface for note generators */
export interface NoteGenerator {
  id: string
  name: string
  description: string
  generate(length: number, config: GeneratorConfig): NoteSequence
}

/** Persisted user settings */
export interface Settings {
  sequenceLength: number
  synthVoice: 'sine' | 'soft' | 'piano'
  rootNote: string
  lowOctave: number
  highOctave: number
}
