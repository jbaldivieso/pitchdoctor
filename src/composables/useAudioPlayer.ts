import { ref } from 'vue'
import { start, now, Synth } from 'tone'
import type { NoteSequence } from '@/types'

type SynthVoice = 'sine' | 'soft' | 'piano'

const NOTE_DURATION = 0.8    // seconds
const NOTE_GAP = 0.3         // seconds gap between notes
const NOTE_INTERVAL = NOTE_DURATION + NOTE_GAP  // 1.1s per note slot
const POST_PLAYBACK_DELAY = 0.5  // seconds after last note before signaling done

function createSynth(voice: SynthVoice): InstanceType<typeof Synth> {
  if (voice === 'sine') {
    return new Synth({ oscillator: { type: 'sine' } })
  }
  if (voice === 'soft') {
    return new Synth({ oscillator: { type: 'triangle' } })
  }
  // piano — shaped envelope
  return new Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.001, decay: 0.3, sustain: 0.2, release: 1.5 },
  })
}

export function useAudioPlayer() {
  const isPlaying = ref(false)

  async function play(sequence: NoteSequence, voice: SynthVoice): Promise<void> {
    await start()
    isPlaying.value = true

    const synth = createSynth(voice)
    synth.toDestination()

    const startTime = now()
    for (let i = 0; i < sequence.length; i++) {
      synth.triggerAttackRelease(
        sequence[i].frequency,
        NOTE_DURATION,
        startTime + i * NOTE_INTERVAL,
      )
    }

    // Wait until after the last note finishes, plus the post-playback delay
    const lastNoteEnd = (sequence.length - 1) * NOTE_INTERVAL + NOTE_DURATION
    const totalWait = (lastNoteEnd + POST_PLAYBACK_DELAY) * 1000

    await new Promise<void>((resolve) => setTimeout(resolve, totalWait))

    synth.dispose()
    isPlaying.value = false
  }

  return { isPlaying, play }
}
