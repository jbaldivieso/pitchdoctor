/**
 * NoteSegmenter — converts a stream of pitch readings into discrete detected notes.
 *
 * Usage:
 *   const seg = new NoteSegmenter(expectedNoteCount, timeoutMs, startTimestamp)
 *   seg.addReading(frequency, clarity, timestamp)  // call repeatedly from rAF loop
 *   if (seg.isDone()) seg.getNotes()               // get results
 *   seg.finalize()                                 // force-emit any in-progress note
 */

export interface SegmentedNote {
  medianFrequency: number
}

const MIN_STABLE_READINGS = 10    // minimum readings to confirm a note
const CLARITY_THRESHOLD = 0.9    // readings below this are treated as silence
const CENTS_TOLERANCE = 50       // ±50 cents — readings within this are "the same note"
const PITCH_CHANGE_THRESHOLD = 3 // consecutive out-of-range readings = real note change (blip tolerance)
const SILENCE_GAP_MS = 200       // ms of low-clarity needed to create a note boundary

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function centsApart(a: number, b: number): number {
  if (a <= 0 || b <= 0) return Infinity
  return Math.abs(1200 * Math.log2(a / b))
}

export class NoteSegmenter {
  private stableFreqs: number[] = []
  private pendingFreqs: number[] = []  // candidate readings for a new note (blip detection)
  private silenceStart: number | null = null
  private capturedNotes: SegmentedNote[] = []
  private done = false

  constructor(
    private readonly maxNotes: number,
    private readonly timeoutMs: number = 8000,
    private readonly startTime: number = 0,
  ) {}

  addReading(frequency: number, clarity: number, timestamp: number): void {
    if (this.done) return

    // Timeout check
    if (timestamp - this.startTime > this.timeoutMs) {
      this.emitCurrentNote()
      this.done = true
      return
    }

    if (clarity < CLARITY_THRESHOLD) {
      // Silence / low-clarity reading
      if (this.silenceStart === null) {
        this.silenceStart = timestamp
      }
      // If silence has persisted long enough, treat it as a note boundary
      if (
        timestamp - this.silenceStart > SILENCE_GAP_MS &&
        this.stableFreqs.length > 0
      ) {
        this.emitCurrentNote()
        this.silenceStart = null
      }
      return
    }

    // High-clarity reading — reset silence timer
    this.silenceStart = null

    if (this.stableFreqs.length === 0 && this.pendingFreqs.length === 0) {
      // Nothing accumulated yet — start fresh
      this.stableFreqs.push(frequency)
      return
    }

    // Determine the reference frequency from the current stable note
    const refFreq =
      this.stableFreqs.length > 0 ? median(this.stableFreqs) : median(this.pendingFreqs)
    const cents = centsApart(frequency, refFreq)

    if (cents <= CENTS_TOLERANCE) {
      // Within tolerance — part of the current note
      this.stableFreqs.push(frequency)
      this.pendingFreqs = [] // clear any accumulated blip candidates
    } else {
      // Out of range — might be a blip or a real note change
      this.pendingFreqs.push(frequency)
      if (this.pendingFreqs.length >= PITCH_CHANGE_THRESHOLD) {
        // Enough consecutive out-of-range readings → it's a real note change
        this.emitCurrentNote()
        this.stableFreqs = [...this.pendingFreqs]
        this.pendingFreqs = []
      }
    }
  }

  /**
   * Force-emit any in-progress note and mark the segmenter as done.
   * Call this when the listening window closes.
   */
  finalize(): void {
    if (!this.done) {
      this.emitCurrentNote()
      this.done = true
    }
  }

  getNotes(): SegmentedNote[] {
    return this.capturedNotes
  }

  isDone(): boolean {
    return this.done
  }

  private emitCurrentNote(): void {
    if (this.stableFreqs.length >= MIN_STABLE_READINGS) {
      const medianFrequency = median(this.stableFreqs)
      this.capturedNotes.push({ medianFrequency })
      if (this.capturedNotes.length >= this.maxNotes) {
        this.done = true
      }
    }
    this.stableFreqs = []
    this.pendingFreqs = []
  }
}
