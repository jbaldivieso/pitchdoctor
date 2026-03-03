import { describe, test, expect, vi, beforeEach } from 'vitest'
import { usePitchDetector } from '@/composables/usePitchDetector'

// --- Mock pitchy ---
const mockFindPitch = vi.fn().mockReturnValue([0, 0])
vi.mock('pitchy', () => ({
  PitchDetector: {
    forFloat32Array: vi.fn(() => ({ findPitch: mockFindPitch })),
  },
}))

// --- RAF control ---
let rafCallbacks: FrameRequestCallback[] = []
let rafIdCounter = 0

function flushRaf(times = 1) {
  for (let i = 0; i < times; i++) {
    const cbs = [...rafCallbacks]
    rafCallbacks = []
    cbs.forEach((cb) => cb(0))
  }
}

// --- Shared mock refs (re-implemented each beforeEach) ---
const mockTrackStop = vi.fn()
const mockGetFloatTimeDomainData = vi.fn()
const mockAnalyserConnect = vi.fn()
const mockSourceConnect = vi.fn()
const mockAudioContextClose = vi.fn().mockResolvedValue(undefined)
const mockAudioContextResume = vi.fn().mockResolvedValue(undefined)
const mockGetUserMedia = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  rafCallbacks = []
  rafIdCounter = 0

  // Re-apply resolved values after clearAllMocks
  mockAudioContextClose.mockResolvedValue(undefined)
  mockAudioContextResume.mockResolvedValue(undefined)

  const mockStream = {
    getTracks: vi.fn(() => [{ stop: mockTrackStop }]),
  }
  mockGetUserMedia.mockResolvedValue(mockStream)

  const mockAnalyser = {
    fftSize: 2048,
    getFloatTimeDomainData: mockGetFloatTimeDomainData,
    connect: mockAnalyserConnect,
  }
  const mockSource = { connect: mockSourceConnect }

  const MockAudioContext = vi.fn().mockImplementation(() => ({
    sampleRate: 44100,
    resume: mockAudioContextResume,
    createAnalyser: vi.fn(() => mockAnalyser),
    createMediaStreamSource: vi.fn(() => mockSource),
    close: mockAudioContextClose,
  }))

  Object.defineProperty(globalThis, 'AudioContext', {
    value: MockAudioContext,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    configurable: true,
    writable: true,
  })

  globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
    rafCallbacks.push(cb)
    return ++rafIdCounter
  }) as unknown as typeof requestAnimationFrame

  globalThis.cancelAnimationFrame = vi.fn((_id: number) => {
    rafCallbacks = []
  })
})

describe('usePitchDetector — startContinuous', () => {
  test('isContinuousListening starts false', () => {
    const { isContinuousListening } = usePitchDetector()
    expect(isContinuousListening.value).toBe(false)
  })

  test('isContinuousListening becomes true after mic opens', async () => {
    const { startContinuous, isContinuousListening } = usePitchDetector()
    const stopFn = await startContinuous(440)
    expect(isContinuousListening.value).toBe(true)
    stopFn()
  })

  test('livePitch starts null', () => {
    const { livePitch } = usePitchDetector()
    expect(livePitch.value).toBeNull()
  })

  test('livePitch is null-valued fields when clarity is below threshold', async () => {
    mockFindPitch.mockReturnValue([440, 0.5]) // low clarity
    const { startContinuous, livePitch } = usePitchDetector()
    const stopFn = await startContinuous(440)
    flushRaf(1)
    expect(livePitch.value).not.toBeNull()
    expect(livePitch.value!.frequency).toBeNull()
    expect(livePitch.value!.centsDeviation).toBeNull()
    stopFn()
  })

  test('livePitch has frequency and centsDeviation when clarity is high', async () => {
    mockFindPitch.mockReturnValue([440, 0.95])
    const { startContinuous, livePitch } = usePitchDetector()
    const stopFn = await startContinuous(440)
    flushRaf(1)
    expect(livePitch.value!.frequency).toBeCloseTo(440, 1)
    expect(livePitch.value!.centsDeviation).toBeCloseTo(0, 1)
    stopFn()
  })

  test('centsDeviation is negative when singing below target frequency', async () => {
    mockFindPitch.mockReturnValue([440, 0.95]) // A4
    const { startContinuous, livePitch } = usePitchDetector()
    const stopFn = await startContinuous(523.25) // target C5
    flushRaf(1)
    expect(livePitch.value!.centsDeviation).toBeLessThan(0)
    stopFn()
  })

  test('stop() sets isContinuousListening to false', async () => {
    const { startContinuous, isContinuousListening } = usePitchDetector()
    const stopFn = await startContinuous(440)
    expect(isContinuousListening.value).toBe(true)
    stopFn()
    expect(isContinuousListening.value).toBe(false)
  })

  test('stop() clears livePitch to null', async () => {
    mockFindPitch.mockReturnValue([440, 0.95])
    const { startContinuous, livePitch } = usePitchDetector()
    const stopFn = await startContinuous(440)
    flushRaf(1)
    expect(livePitch.value).not.toBeNull()
    stopFn()
    expect(livePitch.value).toBeNull()
  })

  test('stop() stops the mic tracks', async () => {
    const { startContinuous } = usePitchDetector()
    const stopFn = await startContinuous(440)
    stopFn()
    expect(mockTrackStop).toHaveBeenCalled()
  })

  test('stop() cancels the animation frame', async () => {
    const { startContinuous } = usePitchDetector()
    const stopFn = await startContinuous(440)
    stopFn()
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalled()
  })

  test('sets error and returns no-op stop when getUserMedia is denied', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'))
    const { startContinuous, error, isContinuousListening } = usePitchDetector()
    const stopFn = await startContinuous(440)
    expect(error.value).toBe('Permission denied')
    expect(isContinuousListening.value).toBe(false)
    expect(() => stopFn()).not.toThrow()
  })

  test('livePitch noteName is set correctly for high-clarity input', async () => {
    mockFindPitch.mockReturnValue([440, 0.95])
    const { startContinuous, livePitch } = usePitchDetector()
    const stopFn = await startContinuous(440)
    flushRaf(1)
    expect(livePitch.value!.noteName).toBe('A4')
    stopFn()
  })
})
