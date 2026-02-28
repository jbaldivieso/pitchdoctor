import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePitchDetector } from '@/composables/usePitchDetector'
import type { NoteSequence } from '@/types'

// ---------------------------------------------------------------------------
// pitchy mock — hoisted so it can be referenced in vi.mock factory
// ---------------------------------------------------------------------------
const mockFindPitch = vi.hoisted(() => vi.fn())

vi.mock('pitchy', () => ({
  PitchDetector: {
    forFloat32Array: vi.fn(() => ({ findPitch: mockFindPitch })),
  },
}))

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const TARGET_ONE: NoteSequence = [{ name: 'A4', frequency: 440 }]
const TARGET_TWO: NoteSequence = [
  { name: 'A4', frequency: 440 },
  { name: 'B4', frequency: 493.88 },
]

// ---------------------------------------------------------------------------
describe('usePitchDetector', () => {
  let currentTime: number
  let pendingRaf: FrameRequestCallback | null

  let mockGetUserMedia: ReturnType<typeof vi.fn>
  let mockGetFloatTimeDomainData: ReturnType<typeof vi.fn>
  let mockSource: { connect: ReturnType<typeof vi.fn> }
  let mockAnalyser: { fftSize: number; getFloatTimeDomainData: ReturnType<typeof vi.fn> }
  let mockAudioContext: {
    createAnalyser: ReturnType<typeof vi.fn>
    createMediaStreamSource: ReturnType<typeof vi.fn>
    sampleRate: number
    close: ReturnType<typeof vi.fn>
  }
  let mockTrack: { stop: ReturnType<typeof vi.fn> }
  let mockStream: { getTracks: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    // ---- performance.now mock ----
    currentTime = 0
    vi.stubGlobal('performance', { now: () => currentTime })

    // ---- requestAnimationFrame / cancelAnimationFrame mocks ----
    pendingRaf = null
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      pendingRaf = cb
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn(() => {
      pendingRaf = null
    }))

    // ---- AudioContext mock ----
    mockGetFloatTimeDomainData = vi.fn()
    mockAnalyser = {
      fftSize: 2048,
      getFloatTimeDomainData: mockGetFloatTimeDomainData,
    }
    mockSource = { connect: vi.fn() }
    mockAudioContext = {
      createAnalyser: vi.fn(() => mockAnalyser),
      createMediaStreamSource: vi.fn(() => mockSource),
      sampleRate: 44100,
      close: vi.fn().mockResolvedValue(undefined),
    }
    vi.stubGlobal('AudioContext', vi.fn(() => mockAudioContext))

    // ---- navigator.mediaDevices.getUserMedia mock ----
    mockTrack = { stop: vi.fn() }
    mockStream = { getTracks: vi.fn(() => [mockTrack]) }
    mockGetUserMedia = vi.fn().mockResolvedValue(mockStream)
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: mockGetUserMedia },
    })

    // ---- pitchy default: 440 Hz, high clarity ----
    mockFindPitch.mockReturnValue([440, 0.95])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  // ---- RAF helpers ----

  /** Run one pending requestAnimationFrame callback. */
  function tick() {
    const cb = pendingRaf
    pendingRaf = null
    cb?.(0)
  }

  /** Run N RAF frames sequentially. */
  function flushFrames(n: number) {
    for (let i = 0; i < n; i++) tick()
  }

  /** Wait two microtask ticks for getUserMedia + async setup to complete. */
  async function waitForSetup() {
    await Promise.resolve()
    await Promise.resolve()
  }

  /**
   * Complete detection by:
   *  1. Flushing 10 frames → fills NoteSegmenter's stableFreqs (MIN_STABLE_READINGS = 10)
   *  2. Advancing past the 8 s timeout → forces emitCurrentNote → isDone = true
   *  3. Awaiting the promise
   */
  async function driveToCompletion(promise: Promise<any>): Promise<any> {
    await waitForSetup()
    flushFrames(10)     // accumulate 10 stable readings
    currentTime = 8001  // past TIMEOUT_MS (8000)
    flushFrames(1)      // timeout fires → note emitted → segmenter done
    return await promise
  }

  // ============================================================
  // Mic access
  // ============================================================
  describe('mic access', () => {
    test('calls getUserMedia with { audio: true }', async () => {
      const { start } = usePitchDetector()
      const p = start(TARGET_ONE)
      await waitForSetup()
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
      await driveToCompletion(p)
    })

    test('sets error state when mic is denied', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('NotAllowedError'))
      const { start, error } = usePitchDetector()
      await start(TARGET_ONE)
      expect(error.value).toBeTruthy()
    })

    test('returns empty array when mic is denied', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('NotAllowedError'))
      const { start } = usePitchDetector()
      const result = await start(TARGET_ONE)
      expect(result).toEqual([])
    })

    test('isListening stays false when mic is denied', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('NotAllowedError'))
      const { start, isListening } = usePitchDetector()
      await start(TARGET_ONE)
      expect(isListening.value).toBe(false)
    })
  })

  // ============================================================
  // Audio pipeline
  // ============================================================
  describe('audio pipeline', () => {
    test('creates an AudioContext', async () => {
      const { start } = usePitchDetector()
      const p = start(TARGET_ONE)
      await waitForSetup()
      expect(AudioContext).toHaveBeenCalled()
      await driveToCompletion(p)
    })

    test('creates AnalyserNode and sets fftSize to 2048', async () => {
      const { start } = usePitchDetector()
      const p = start(TARGET_ONE)
      await waitForSetup()
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled()
      expect(mockAnalyser.fftSize).toBe(2048)
      await driveToCompletion(p)
    })

    test('creates MediaStreamSource from the mic stream', async () => {
      const { start } = usePitchDetector()
      const p = start(TARGET_ONE)
      await waitForSetup()
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream)
      await driveToCompletion(p)
    })

    test('connects source to analyser', async () => {
      const { start } = usePitchDetector()
      const p = start(TARGET_ONE)
      await waitForSetup()
      expect(mockSource.connect).toHaveBeenCalledWith(mockAnalyser)
      await driveToCompletion(p)
    })
  })

  // ============================================================
  // Reactive state
  // ============================================================
  describe('reactive state', () => {
    test('isListening is false initially', () => {
      const { isListening } = usePitchDetector()
      expect(isListening.value).toBe(false)
    })

    test('error is null initially', () => {
      const { error } = usePitchDetector()
      expect(error.value).toBeNull()
    })

    test('isListening becomes true after mic access is granted', async () => {
      const { start, isListening } = usePitchDetector()
      const p = start(TARGET_ONE)
      await waitForSetup()
      expect(isListening.value).toBe(true)
      await driveToCompletion(p)
    })

    test('isListening becomes false after completion', async () => {
      const { start, isListening } = usePitchDetector()
      await driveToCompletion(start(TARGET_ONE))
      expect(isListening.value).toBe(false)
    })
  })

  // ============================================================
  // Pitch detection loop
  // ============================================================
  describe('pitch detection loop', () => {
    test('registers a requestAnimationFrame callback after setup', async () => {
      const { start } = usePitchDetector()
      const p = start(TARGET_ONE)
      await waitForSetup()
      expect(pendingRaf).not.toBeNull()
      await driveToCompletion(p)
    })

    test('reads audio data from AnalyserNode on each frame', async () => {
      const { start } = usePitchDetector()
      const p = start(TARGET_ONE)
      await waitForSetup()
      flushFrames(3)
      expect(mockGetFloatTimeDomainData).toHaveBeenCalledTimes(3)
      currentTime = 8001
      flushFrames(1)
      await p
    })

    test('calls pitchy findPitch with the audio buffer and sample rate', async () => {
      const { start } = usePitchDetector()
      const p = start(TARGET_ONE)
      await waitForSetup()
      flushFrames(1)
      expect(mockFindPitch).toHaveBeenCalledWith(expect.any(Float32Array), 44100)
      currentTime = 8001
      flushFrames(11)
      await p
    })
  })

  // ============================================================
  // Clarity filtering
  // ============================================================
  describe('clarity filtering', () => {
    test('low-clarity readings (< 0.9) do not produce a detected note', async () => {
      mockFindPitch.mockReturnValue([440, 0.5]) // below threshold
      const { start } = usePitchDetector()
      const p = start(TARGET_ONE)
      await waitForSetup()
      flushFrames(20)           // 20 low-clarity frames — none should contribute
      currentTime = 8001
      flushFrames(1)            // timeout fires, no stable note captured
      const results = await p
      expect(results[0].accuracy).toBe('missed')
    })
  })

  // ============================================================
  // Cleanup
  // ============================================================
  describe('cleanup', () => {
    test('stops all MediaStream tracks on completion', async () => {
      const { start } = usePitchDetector()
      await driveToCompletion(start(TARGET_ONE))
      expect(mockTrack.stop).toHaveBeenCalled()
    })

    test('closes the AudioContext on completion', async () => {
      const { start } = usePitchDetector()
      await driveToCompletion(start(TARGET_ONE))
      expect(mockAudioContext.close).toHaveBeenCalled()
    })
  })

  // ============================================================
  // PitchResult output
  // ============================================================
  describe('PitchResult output', () => {
    test('returns one PitchResult per target note', async () => {
      const { start } = usePitchDetector()
      const results = await driveToCompletion(start(TARGET_ONE))
      expect(results).toHaveLength(1)
    })

    test('result has target, centsDeviation, medianFrequency, accuracy, detected fields', async () => {
      const { start } = usePitchDetector()
      const [r] = await driveToCompletion(start(TARGET_ONE))
      expect(r).toMatchObject({
        target: TARGET_ONE[0],
        centsDeviation: expect.any(Number),
        accuracy: expect.stringMatching(/^(excellent|acceptable|off|missed)$/),
      })
      expect('detected' in r).toBe(true)
      expect('medianFrequency' in r).toBe(true)
    })

    test('updates results ref after completion', async () => {
      const { start, results } = usePitchDetector()
      await driveToCompletion(start(TARGET_ONE))
      expect(results.value).toHaveLength(1)
    })

    test('undetected notes have accuracy "missed" and detected null', async () => {
      // Feed enough for only 1 note out of 2 expected, then timeout
      const { start } = usePitchDetector()
      const p = start(TARGET_TWO)
      await waitForSetup()
      flushFrames(10)
      currentTime = 8001
      flushFrames(1)
      const results = await p
      expect(results[1].accuracy).toBe('missed')
      expect(results[1].detected).toBeNull()
    })
  })

  // ============================================================
  // Timeout behavior
  // ============================================================
  describe('timeout', () => {
    test('stops after 8 seconds even if not all notes are detected', async () => {
      const { start, isListening } = usePitchDetector()
      const p = start(TARGET_TWO)
      await waitForSetup()
      flushFrames(10)   // only 1 note worth of readings
      currentTime = 8001
      flushFrames(1)
      await p
      expect(isListening.value).toBe(false)
    })
  })
})
