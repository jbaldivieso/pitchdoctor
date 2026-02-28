import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { start, now, Synth } from 'tone'
import { useAudioPlayer } from '@/composables/useAudioPlayer'
import type { NoteSequence } from '@/types'

vi.mock('tone', () => {
  const mockSynthInstance = {
    toDestination: vi.fn().mockReturnThis(),
    triggerAttackRelease: vi.fn(),
    dispose: vi.fn(),
  }
  const MockSynth = vi.fn().mockImplementation(() => mockSynthInstance)

  return {
    start: vi.fn().mockResolvedValue(undefined),
    now: vi.fn().mockReturnValue(0),
    Synth: MockSynth,
  }
})

const ONE_NOTE: NoteSequence = [{ name: 'A4', frequency: 440 }]
const TWO_NOTES: NoteSequence = [
  { name: 'C4', frequency: 261.63 },
  { name: 'D4', frequency: 293.66 },
]

function getSynthInstance() {
  return vi.mocked(Synth).mock.results[0].value as {
    toDestination: ReturnType<typeof vi.fn>
    triggerAttackRelease: ReturnType<typeof vi.fn>
    dispose: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAudioPlayer', () => {
  describe('Tone.start()', () => {
    test('calls Tone.start() before first playback', async () => {
      const { play } = useAudioPlayer()
      const p = play(ONE_NOTE, 'sine')
      await vi.runAllTimersAsync()
      await p
      expect(start).toHaveBeenCalled()
    })
  })

  describe('isPlaying state', () => {
    test('isPlaying is false initially', () => {
      const { isPlaying } = useAudioPlayer()
      expect(isPlaying.value).toBe(false)
    })

    test('isPlaying becomes true during playback', async () => {
      const { play, isPlaying } = useAudioPlayer()
      const p = play(ONE_NOTE, 'sine')
      // After Tone.start resolves but before timer fires, isPlaying should be true
      await Promise.resolve()  // let Tone.start() await settle
      expect(isPlaying.value).toBe(true)
      await vi.runAllTimersAsync()
      await p
    })

    test('isPlaying becomes false after playback completes', async () => {
      const { play, isPlaying } = useAudioPlayer()
      const p = play(ONE_NOTE, 'sine')
      await vi.runAllTimersAsync()
      await p
      expect(isPlaying.value).toBe(false)
    })
  })

  describe('note scheduling', () => {
    test('schedules the note with 0.8s duration at t=0 for a single note', async () => {
      vi.mocked(now).mockReturnValue(0)
      const { play } = useAudioPlayer()
      const p = play(ONE_NOTE, 'sine')
      await vi.runAllTimersAsync()
      await p
      const synth = getSynthInstance()
      expect(synth.triggerAttackRelease).toHaveBeenCalledWith(440, 0.8, 0)
    })

    test('schedules two notes with 0.8s duration and 1.1s interval (0.3s gap)', async () => {
      vi.mocked(now).mockReturnValue(0)
      const { play } = useAudioPlayer()
      const p = play(TWO_NOTES, 'sine')
      await vi.runAllTimersAsync()
      await p
      const synth = getSynthInstance()
      expect(synth.triggerAttackRelease).toHaveBeenCalledWith(261.63, 0.8, 0)
      expect(synth.triggerAttackRelease).toHaveBeenCalledWith(293.66, 0.8, 1.1)
    })

    test('uses Tone.now() as the scheduling base time', async () => {
      vi.mocked(now).mockReturnValue(5)
      const { play } = useAudioPlayer()
      const p = play(ONE_NOTE, 'sine')
      await vi.runAllTimersAsync()
      await p
      const synth = getSynthInstance()
      expect(synth.triggerAttackRelease).toHaveBeenCalledWith(440, 0.8, 5)
    })

    test('plays each note at the correct frequency', async () => {
      vi.mocked(now).mockReturnValue(0)
      const { play } = useAudioPlayer()
      const p = play(TWO_NOTES, 'sine')
      await vi.runAllTimersAsync()
      await p
      const synth = getSynthInstance()
      const calls = synth.triggerAttackRelease.mock.calls
      expect(calls[0][0]).toBeCloseTo(261.63, 1)
      expect(calls[1][0]).toBeCloseTo(293.66, 1)
    })
  })

  describe('synth voice', () => {
    test('creates Tone.Synth with oscillator.type = sine for sine voice', async () => {
      const { play } = useAudioPlayer()
      const p = play(ONE_NOTE, 'sine')
      await vi.runAllTimersAsync()
      await p
      expect(Synth).toHaveBeenCalledWith(
        expect.objectContaining({ oscillator: expect.objectContaining({ type: 'sine' }) }),
      )
    })

    test('creates Tone.Synth with oscillator.type = triangle for soft voice', async () => {
      const { play } = useAudioPlayer()
      const p = play(ONE_NOTE, 'soft')
      await vi.runAllTimersAsync()
      await p
      expect(Synth).toHaveBeenCalledWith(
        expect.objectContaining({ oscillator: expect.objectContaining({ type: 'triangle' }) }),
      )
    })

    test('creates Tone.Synth with a shaped envelope for piano voice', async () => {
      const { play } = useAudioPlayer()
      const p = play(ONE_NOTE, 'piano')
      await vi.runAllTimersAsync()
      await p
      expect(Synth).toHaveBeenCalledWith(
        expect.objectContaining({ envelope: expect.any(Object) }),
      )
    })
  })

  describe('post-playback delay', () => {
    test('waits 0.5s after last note ends before resolving (1 note: 0.8+0.5=1.3s total)', async () => {
      vi.mocked(now).mockReturnValue(0)
      const { play, isPlaying } = useAudioPlayer()
      const p = play(ONE_NOTE, 'sine')

      // Let Tone.start() resolve
      await Promise.resolve()

      // Advance to just before completion (1299ms)
      await vi.advanceTimersByTimeAsync(1299)
      expect(isPlaying.value).toBe(true)

      // Advance past completion (1ms more → total 1300ms)
      await vi.advanceTimersByTimeAsync(1)
      await p
      expect(isPlaying.value).toBe(false)
    })

    test('waits correct time for 2 notes (last note ends at 1.9s + 0.5s = 2.4s total)', async () => {
      vi.mocked(now).mockReturnValue(0)
      const { play, isPlaying } = useAudioPlayer()
      const p = play(TWO_NOTES, 'sine')

      await Promise.resolve()

      // Just before: 2399ms
      await vi.advanceTimersByTimeAsync(2399)
      expect(isPlaying.value).toBe(true)

      // Over the line: 1ms more
      await vi.advanceTimersByTimeAsync(1)
      await p
      expect(isPlaying.value).toBe(false)
    })
  })

  describe('cleanup', () => {
    test('disposes the synth after playback', async () => {
      const { play } = useAudioPlayer()
      const p = play(ONE_NOTE, 'sine')
      await vi.runAllTimersAsync()
      await p
      const synth = getSynthInstance()
      expect(synth.dispose).toHaveBeenCalled()
    })

    test('connects synth to destination via toDestination()', async () => {
      const { play } = useAudioPlayer()
      const p = play(ONE_NOTE, 'sine')
      await vi.runAllTimersAsync()
      await p
      const synth = getSynthInstance()
      expect(synth.toDestination).toHaveBeenCalled()
    })
  })
})
