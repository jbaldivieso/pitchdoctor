import { describe, test, expect } from 'vitest'
import { NoteSegmenter } from '@/lib/noteSegmenter'

/** Feed N identical readings at 16ms intervals starting at t=startMs */
function feedReadings(
  seg: NoteSegmenter,
  frequency: number,
  clarity: number,
  count: number,
  startMs = 0,
): void {
  for (let i = 0; i < count; i++) {
    seg.addReading(frequency, clarity, startMs + i * 16)
  }
}

describe('NoteSegmenter', () => {
  describe('stable pitch detection', () => {
    test('feeding N identical high-clarity readings produces one detected note', () => {
      const seg = new NoteSegmenter(1)
      feedReadings(seg, 440, 0.95, 15)
      seg.finalize()
      expect(seg.getNotes()).toHaveLength(1)
      expect(seg.getNotes()[0].medianFrequency).toBeCloseTo(440, 1)
    })

    test('empty input produces no notes', () => {
      const seg = new NoteSegmenter(3)
      seg.finalize()
      expect(seg.getNotes()).toHaveLength(0)
    })
  })

  describe('multiple notes', () => {
    test('shifting pitch by >1 semitone produces two separate notes', () => {
      const seg = new NoteSegmenter(2)
      // C4 ≈ 261.63 Hz, D4 ≈ 293.66 Hz (2 semitones apart)
      feedReadings(seg, 261.63, 0.95, 15, 0)
      feedReadings(seg, 293.66, 0.95, 15, 250)
      seg.finalize()
      expect(seg.getNotes()).toHaveLength(2)
    })
  })

  describe('median frequency', () => {
    test('detected note frequency is the median of stable readings, not the mean', () => {
      const seg = new NoteSegmenter(1)
      // Feed readings with one outlier; median should exclude the outlier's influence
      // 9 readings at 440, then 5 readings slightly flat at 435
      feedReadings(seg, 440, 0.95, 9, 0)
      feedReadings(seg, 435, 0.95, 5, 144)
      seg.finalize()
      const notes = seg.getNotes()
      expect(notes).toHaveLength(1)
      // Median of [440×9, 435×5] sorted: [435,435,435,435,435,440,440,440,440,440,440,440,440,440]
      // 14 values, mid = 7 → average of index 6 (440) and 7 (440) = 440
      // Mean would be (9*440 + 5*435)/14 ≈ 438.2
      expect(notes[0].medianFrequency).toBeCloseTo(440, 0)
    })
  })

  describe('silence gap as boundary', () => {
    test('>200ms of low-clarity readings between two pitches creates two notes', () => {
      const seg = new NoteSegmenter(2)
      // Note 1: 10 readings ending at t=144ms
      feedReadings(seg, 440, 0.95, 10, 0)
      // Silence: starts at t=160, extends past 200ms
      seg.addReading(0, 0.5, 160)
      seg.addReading(0, 0.5, 370)   // 370-160 = 210ms > 200ms gap → boundary
      // Note 2: 10 readings
      feedReadings(seg, 523.25, 0.95, 10, 400)
      seg.finalize()
      expect(seg.getNotes()).toHaveLength(2)
    })

    test('silence shorter than 200ms does NOT split a note', () => {
      const seg = new NoteSegmenter(2)
      feedReadings(seg, 440, 0.95, 10, 0)
      // Brief silence: only 100ms
      seg.addReading(0, 0.5, 160)
      seg.addReading(0, 0.5, 260)   // 260-160 = 100ms — NOT enough
      feedReadings(seg, 440, 0.95, 10, 300)
      seg.finalize()
      // Should be 1 note, not 2
      expect(seg.getNotes()).toHaveLength(1)
    })
  })

  describe('noise rejection', () => {
    test('readings with clarity below 0.9 are discarded', () => {
      const seg = new NoteSegmenter(1)
      // Feed 15 noisy readings (should be ignored)
      feedReadings(seg, 440, 0.7, 15, 0)
      seg.finalize()
      expect(seg.getNotes()).toHaveLength(0)
    })

    test('clarity exactly at threshold (0.9) is accepted', () => {
      const seg = new NoteSegmenter(1)
      feedReadings(seg, 440, 0.9, 12, 0)
      seg.finalize()
      expect(seg.getNotes()).toHaveLength(1)
    })
  })

  describe('rolling window stability', () => {
    test('fewer than 10 consistent readings does not capture a note', () => {
      const seg = new NoteSegmenter(1)
      feedReadings(seg, 440, 0.95, 9, 0)
      seg.finalize()
      expect(seg.getNotes()).toHaveLength(0)
    })

    test('exactly 10 consistent readings captures a note', () => {
      const seg = new NoteSegmenter(1)
      feedReadings(seg, 440, 0.95, 10, 0)
      seg.finalize()
      expect(seg.getNotes()).toHaveLength(1)
    })
  })

  describe('expected note count', () => {
    test('stops capturing after maxNotes are detected', () => {
      const seg = new NoteSegmenter(2)
      // Note 1
      feedReadings(seg, 261.63, 0.95, 10, 0)
      // Silence gap → note 1 emitted
      seg.addReading(0, 0.5, 165)
      seg.addReading(0, 0.5, 370)
      // Note 2
      feedReadings(seg, 293.66, 0.95, 10, 400)
      // Silence gap → note 2 emitted, isDone becomes true
      seg.addReading(0, 0.5, 570)
      seg.addReading(0, 0.5, 780)
      // Any further readings should be ignored
      feedReadings(seg, 329.63, 0.95, 15, 820)
      seg.finalize()
      expect(seg.getNotes()).toHaveLength(2)
    })

    test('isDone() returns true after maxNotes are captured', () => {
      const seg = new NoteSegmenter(1)
      feedReadings(seg, 440, 0.95, 10, 0)
      seg.finalize()
      expect(seg.isDone()).toBe(true)
    })
  })

  describe('timeout', () => {
    test('stops after the configured timeout even with fewer notes detected', () => {
      const seg = new NoteSegmenter(3, 1000, 0)  // 1s timeout for faster test
      feedReadings(seg, 440, 0.95, 10, 0)
      // Send a reading well past the timeout
      seg.addReading(523.25, 0.95, 1001)
      expect(seg.isDone()).toBe(true)
    })

    test('returns partial results when timeout fires after some notes detected', () => {
      const seg = new NoteSegmenter(3, 1000, 0)
      // Note 1 complete
      feedReadings(seg, 261.63, 0.95, 10, 0)
      seg.addReading(0, 0.5, 165)
      seg.addReading(0, 0.5, 370)
      // Start note 2 but do not complete it
      feedReadings(seg, 293.66, 0.95, 5, 400)
      // Timeout reading
      seg.addReading(293.66, 0.95, 1001)
      expect(seg.isDone()).toBe(true)
      // Only note 1 was fully captured (note 2 had only 5 stable readings, less than 10)
      expect(seg.getNotes().length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('adjacent identical notes', () => {
    test('same pitch sung twice with silence gap captures two separate notes', () => {
      const seg = new NoteSegmenter(2)
      // First C4
      feedReadings(seg, 440, 0.95, 10, 0)
      // Silence gap >200ms
      seg.addReading(0, 0.5, 165)
      seg.addReading(0, 0.5, 370)
      // Second C4
      feedReadings(seg, 440, 0.95, 10, 400)
      seg.finalize()
      const notes = seg.getNotes()
      expect(notes).toHaveLength(2)
      expect(notes[0].medianFrequency).toBeCloseTo(440, 0)
      expect(notes[1].medianFrequency).toBeCloseTo(440, 0)
    })
  })

  describe('brief pitch fluctuations', () => {
    test('1-2 frames of different pitch within a stable note does not split it', () => {
      const seg = new NoteSegmenter(1)
      // 20 readings of C4
      feedReadings(seg, 440, 0.95, 20, 0)
      // 2 blip readings (C5 — 1 octave = 1200 cents away, far out of range)
      seg.addReading(880, 0.95, 320)
      seg.addReading(880, 0.95, 336)
      // 20 more C4 readings — blip is discarded, note continues
      feedReadings(seg, 440, 0.95, 20, 352)
      seg.finalize()
      // Still only one note
      expect(seg.getNotes()).toHaveLength(1)
      expect(seg.getNotes()[0].medianFrequency).toBeCloseTo(440, 0)
    })

    test('3+ consecutive different-pitch frames triggers a note boundary', () => {
      const seg = new NoteSegmenter(2)
      // 15 readings of C4
      feedReadings(seg, 440, 0.95, 15, 0)
      // 3 consecutive readings at E5 (far from C4) → real note change
      seg.addReading(659.25, 0.95, 250)
      seg.addReading(659.25, 0.95, 266)
      seg.addReading(659.25, 0.95, 282)
      // 12 more E5 readings (total 15 stable E5 readings)
      feedReadings(seg, 659.25, 0.95, 12, 298)
      seg.finalize()
      expect(seg.getNotes()).toHaveLength(2)
    })
  })
})
