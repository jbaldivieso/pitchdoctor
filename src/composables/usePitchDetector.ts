import { ref } from 'vue'
import { PitchDetector } from 'pitchy'
import { NoteSegmenter } from '@/lib/noteSegmenter'
import { frequencyToNoteName, centsDeviation, classifyAccuracy, octaveNormalizedCents } from '@/lib/pitchUtils'
import type { NoteSequence, PitchResult, LivePitch } from '@/types'

const TIMEOUT_MS = 8000
const CLARITY_THRESHOLD = 0.7

export function usePitchDetector() {
  const isListening = ref(false)
  const isContinuousListening = ref(false)
  const error = ref<string | null>(null)
  const livePitch = ref<LivePitch | null>(null)

  async function listen(targetSequence: NoteSequence): Promise<PitchResult[]> {
    isListening.value = true
    error.value = null

    let stream: MediaStream | null = null
    let audioContext: AudioContext | null = null

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      audioContext = new AudioContext()
      await audioContext.resume()

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)

      const segmenter = new NoteSegmenter(targetSequence.length, TIMEOUT_MS, Date.now())
      const detector = PitchDetector.forFloat32Array(analyser.fftSize)
      const buffer = new Float32Array(analyser.fftSize)

      await new Promise<void>((resolve) => {
        let rafId: number

        function detect() {
          if (segmenter.isDone()) {
            cancelAnimationFrame(rafId)
            resolve()
            return
          }
          analyser.getFloatTimeDomainData(buffer)
          const [freq, clarity] = detector.findPitch(buffer, audioContext!.sampleRate)
          segmenter.addReading(freq, clarity, Date.now())
          rafId = requestAnimationFrame(detect)
        }

        rafId = requestAnimationFrame(detect)
      })

      segmenter.finalize()

      return buildResults(targetSequence, segmenter.getNotes())
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Microphone access denied'
      return targetSequence.map((target) => ({
        target,
        detected: null,
        centsDeviation: 0,
        medianFrequency: null,
        accuracy: 'missed' as const,
      }))
    } finally {
      stream?.getTracks().forEach((t) => t.stop())
      await audioContext?.close()
      isListening.value = false
    }
  }

  /**
   * Opens the microphone and streams live pitch data into the `livePitch` ref
   * on every animation frame. Returns a stop() function that closes the mic
   * and stops detection. No timeout, no segmentation — runs until stopped.
   */
  async function startContinuous(targetFrequency: number): Promise<() => void> {
    isContinuousListening.value = true
    error.value = null
    livePitch.value = null

    let stream: MediaStream | null = null
    let audioContext: AudioContext | null = null
    let rafId: number | null = null

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContext = new AudioContext()
      await audioContext.resume()

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)

      const detector = PitchDetector.forFloat32Array(analyser.fftSize)
      const buffer = new Float32Array(analyser.fftSize)

      function detect() {
        analyser.getFloatTimeDomainData(buffer)
        const [freq, clarity] = detector.findPitch(buffer, audioContext!.sampleRate)

        if (clarity >= CLARITY_THRESHOLD && freq > 0) {
          const cents = centsDeviation(freq, targetFrequency)
          livePitch.value = {
            frequency: freq,
            centsDeviation: cents,
            clarity,
            noteName: frequencyToNoteName(freq),
          }
        } else {
          livePitch.value = {
            frequency: null,
            centsDeviation: null,
            clarity,
            noteName: null,
          }
        }

        rafId = requestAnimationFrame(detect)
      }

      rafId = requestAnimationFrame(detect)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Microphone access denied'
      isContinuousListening.value = false
      livePitch.value = null
    }

    return function stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      stream?.getTracks().forEach((t) => t.stop())
      audioContext?.close()
      isContinuousListening.value = false
      livePitch.value = null
    }
  }

  return { listen, startContinuous, isListening, isContinuousListening, livePitch, error }
}

function buildResults(
  targetSequence: NoteSequence,
  segmented: { medianFrequency: number }[],
): PitchResult[] {
  return targetSequence.map((target, i) => {
    const seg = segmented[i] ?? null
    if (!seg) {
      return {
        target,
        detected: null,
        centsDeviation: 0,
        medianFrequency: null,
        accuracy: 'missed' as const,
      }
    }
    const freq = seg.medianFrequency
    const noteName = frequencyToNoteName(freq) ?? target.name
    const rawCents = centsDeviation(freq, target.frequency)
    const cents = octaveNormalizedCents(rawCents)
    const accuracy = classifyAccuracy(cents)
    return {
      target,
      detected: { name: noteName, frequency: freq },
      centsDeviation: cents,
      medianFrequency: freq,
      accuracy,
    }
  })
}
