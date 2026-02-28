import { describe, test, expect } from 'vitest'
import { centsDeviation, classifyAccuracy, frequencyToNoteName, octaveNormalizedCents } from '@/lib/pitchUtils'

describe('centsDeviation', () => {
  test('returns 0 for exact frequency match', () => {
    expect(centsDeviation(440, 440)).toBe(0)
  })

  test('returns positive cents when detected is sharp', () => {
    // One semitone sharp ≈ +100 cents
    const oneUp = 440 * Math.pow(2, 1 / 12)
    expect(centsDeviation(oneUp, 440)).toBeCloseTo(100, 0)
  })

  test('returns negative cents when detected is flat', () => {
    const oneDown = 440 * Math.pow(2, -1 / 12)
    expect(centsDeviation(oneDown, 440)).toBeCloseTo(-100, 0)
  })

  test('returns 0 for invalid inputs (zero or negative)', () => {
    expect(centsDeviation(0, 440)).toBe(0)
    expect(centsDeviation(440, 0)).toBe(0)
    expect(centsDeviation(-1, 440)).toBe(0)
  })

  test('+12 cents for ~12-cent deviation', () => {
    const target = 440
    // 12 cents = 2^(12/1200) ratio
    const detected = target * Math.pow(2, 12 / 1200)
    expect(centsDeviation(detected, target)).toBeCloseTo(12, 0)
  })
})

describe('classifyAccuracy', () => {
  test('excellent within ±10 cents', () => {
    expect(classifyAccuracy(0)).toBe('excellent')
    expect(classifyAccuracy(10)).toBe('excellent')
    expect(classifyAccuracy(-10)).toBe('excellent')
  })

  test('acceptable between ±10 and ±25 cents', () => {
    expect(classifyAccuracy(11)).toBe('acceptable')
    expect(classifyAccuracy(25)).toBe('acceptable')
    expect(classifyAccuracy(-20)).toBe('acceptable')
  })

  test('off beyond ±25 cents', () => {
    expect(classifyAccuracy(26)).toBe('off')
    expect(classifyAccuracy(-50)).toBe('off')
  })
})

describe('octaveNormalizedCents', () => {
  test('0 cents stays 0 (perfect unison)', () => {
    expect(octaveNormalizedCents(0)).toBe(0)
  })
  test('+1200 cents (exact octave sharp) → 0', () => {
    expect(octaveNormalizedCents(1200)).toBe(0)
  })
  test('-1200 cents (exact octave flat) → 0', () => {
    expect(octaveNormalizedCents(-1200)).toBe(0)
  })
  test('+1250 cents (octave + 50¢ sharp) → +50', () => {
    expect(octaveNormalizedCents(1250)).toBe(50)
  })
  test('-1150 cents (octave - 50¢, i.e. 50¢ sharp of lower octave) → +50', () => {
    expect(octaveNormalizedCents(-1150)).toBe(50)
  })
  test('+2400 cents (two octaves) → 0', () => {
    expect(octaveNormalizedCents(2400)).toBe(0)
  })
  test('+30 cents passes through unchanged', () => {
    expect(octaveNormalizedCents(30)).toBe(30)
  })
  test('-30 cents passes through unchanged', () => {
    expect(octaveNormalizedCents(-30)).toBe(-30)
  })
})

describe('frequencyToNoteName', () => {
  test('returns null for 0 Hz', () => {
    expect(frequencyToNoteName(0)).toBeNull()
  })

  test('returns null for negative Hz', () => {
    expect(frequencyToNoteName(-100)).toBeNull()
  })

  test('returns a non-empty string for valid frequency', () => {
    const result = frequencyToNoteName(440)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })
})
