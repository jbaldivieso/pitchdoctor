import { majorScaleGenerator } from '@/lib/generators/majorScale'
import type { NoteSequence, GeneratorConfig } from '@/types'

export function useNoteGenerator() {
  function generate(length: number, config: GeneratorConfig): NoteSequence {
    return majorScaleGenerator.generate(length, config)
  }

  return { generate }
}
