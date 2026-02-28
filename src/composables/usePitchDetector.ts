import { ref } from 'vue'
import { PitchDetector } from 'pitchy'
import { NoteSegmenter } from '@/lib/noteSegmenter'
import { frequencyToNoteName, centsDeviation, classifyAccuracy } from '@/lib/pitchUtils'
import type { NoteSequence, PitchResult } from '@/types'

const TIMEOUT_MS = 8000

export function usePitchDetector() {
  const isListening = ref(false)
  const error = ref<string | null>(null)

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

  return { listen, isListening, error }
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
    const cents = centsDeviation(freq, target.frequency)
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
