import { Note } from 'tonal'

/**
 * Convert a frequency in Hz to the nearest note name (e.g. "A4").
 * Returns null for invalid input (≤ 0 Hz).
 */
export function frequencyToNoteName(hz: number): string | null {
  if (hz <= 0) return null
  const name = Note.fromFreq(hz)
  return name || null
}

/**
 * Calculate the deviation in cents between a detected frequency and a target
 * frequency. Positive = sharp, negative = flat.
 *
 * Formula: 1200 × log₂(detected / target)
 */
export function centsDeviation(detected: number, target: number): number {
  if (detected <= 0 || target <= 0) return 0
  return 1200 * Math.log2(detected / target)
}

/**
 * Classify a cents deviation into an accuracy bucket.
 */
export function classifyAccuracy(
  cents: number,
): 'excellent' | 'acceptable' | 'off' {
  const abs = Math.abs(cents)
  if (abs <= 10) return 'excellent'
  if (abs <= 25) return 'acceptable'
  return 'off'
}
