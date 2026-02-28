import { ref } from 'vue'
import { PitchDetector } from 'pitchy'
import { NoteSegmenter } from '@/lib/noteSegmenter'
import { frequencyToNoteName, centsDeviation, classifyAccuracy } from '@/lib/pitchUtils'
import type { NoteSequence, PitchResult, Note } from '@/types'

const TIMEOUT_MS = 8000

export function usePitchDetector() {
  const isListening = ref(false)
  const results = ref<PitchResult[]>([])
  const error = ref<string | null>(null)

  let _stream: MediaStream | null = null
  let _audioContext: AudioContext | null = null
  let _rafId: number | null = null
  let _segmenter: NoteSegmenter | null = null
  let _targetSequence: NoteSequence = []

  function cleanup() {
    isListening.value = false
    if (_rafId !== null) {
      cancelAnimationFrame(_rafId)
      _rafId = null
    }
    if (_stream) {
      _stream.getTracks().forEach((t) => t.stop())
      _stream = null
    }
    if (_audioContext) {
      _audioContext.close()
      _audioContext = null
    }
  }

  function buildResults(): PitchResult[] {
    const segNotes = _segmenter?.getNotes() ?? []
    return _targetSequence.map((target, i) => {
      const seg = segNotes[i]
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
      const name = frequencyToNoteName(freq)
      const detected: Note | null = name ? { name, frequency: freq } : null
      const cents = centsDeviation(freq, target.frequency)
      const accuracy = detected ? classifyAccuracy(cents) : ('missed' as const)
      return {
        target,
        detected,
        centsDeviation: cents,
        medianFrequency: freq,
        accuracy,
      }
    })
  }

  async function start(targetSequence: NoteSequence): Promise<PitchResult[]> {
    error.value = null
    results.value = []
    _targetSequence = targetSequence

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      error.value = 'Microphone access denied'
      return []
    }

    _stream = stream
    const audioContext = new AudioContext()
    _audioContext = audioContext
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    const startTime = performance.now()
    _segmenter = new NoteSegmenter(targetSequence.length, TIMEOUT_MS, startTime)
    const detector = PitchDetector.forFloat32Array(analyser.fftSize)
    const buffer = new Float32Array(analyser.fftSize)

    isListening.value = true

    return new Promise<PitchResult[]>((resolve) => {
      function detect() {
        analyser.getFloatTimeDomainData(buffer)
        const timestamp = performance.now()
        const [frequency, clarity] = detector.findPitch(buffer, audioContext.sampleRate)
        _segmenter!.addReading(frequency, clarity, timestamp)

        if (_segmenter!.isDone()) {
          const pitchResults = buildResults()
          results.value = pitchResults
          cleanup()
          resolve(pitchResults)
          return
        }

        _rafId = requestAnimationFrame(detect)
      }

      _rafId = requestAnimationFrame(detect)
    })
  }

  function stop() {
    if (!isListening.value || !_segmenter) return
    _segmenter.finalize()
    const pitchResults = buildResults()
    results.value = pitchResults
    cleanup()
  }

  return { isListening, results, error, start, stop }
}
