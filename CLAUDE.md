# Pitch Doctor — Claude Context

## What This Is
A PWA that plays musical notes, listens to the user sing them back, and scores pitch accuracy. Target: iOS Safari / home screen PWA. Full spec: `SPEC.md`.

## Commands
```bash
npm run dev          # Vite dev server
npm run build        # Production build → dist/
npm run preview      # Preview the production build locally
npx vitest           # Run tests in watch mode (use during development)
npx vitest run       # Run tests once (CI)
npx vitest run --coverage   # With coverage report
```

## Tech Stack
- **Vue 3** + Composition API (`<script setup>`) + TypeScript
- **Vite 6** + `@vitejs/plugin-vue`
- **Tone.js 15** — audio synthesis
- **pitchy 4** — McLeod Pitch Method pitch detection
- **tonal 6** — Hz ↔ note name, cents math, scale generation
- **Bulma 1** — CSS framework, customized via Sass variable overrides
- **Vitest 2** + `@vue/test-utils` + jsdom — testing

## Project Layout
```
src/
  App.vue                      # Root; owns the state machine (idle→playing→listening→results)
  main.ts                      # Entry point; mounts app
  components/
    PlayButton.vue             # Big action button; label changes per app state
    NoteDisplay.vue            # Sequence display; highlights current note during playback
    ListeningIndicator.vue     # Pulsing mic-active indicator
    PitchScale.vue             # Horizontal ±50¢ accuracy meter for one note
    ResultsPanel.vue           # Stacks PitchScale for each note
    SettingsPanel.vue          # Settings slide-out
  composables/
    useAudioPlayer.ts          # Tone.js wrapper — schedules and plays note sequences
    usePitchDetector.ts        # getUserMedia + pitchy — real-time pitch detection
    useNoteGenerator.ts        # Selects and delegates to the active NoteGenerator
    useSettings.ts             # localStorage-backed reactive settings
  lib/
    pitchUtils.ts              # Pure functions: Hz→note, centsDeviation (uses tonal)
    noteSegmenter.ts           # Segments continuous pitch readings into discrete notes
    generators/
      majorScale.ts            # MVP generator: consecutive major-scale notes
  types/
    index.ts                   # Shared TS interfaces (Note, NoteSequence, PitchResult, etc.)
  assets/styles/
    main.scss                  # Bulma variable overrides → @import bulma → app overrides
src/__tests__/                 # Mirrors src/ structure; all files *.spec.ts
```

## Key Types (see `src/types/index.ts`)
```typescript
interface Note { name: string; frequency: number }
type NoteSequence = Note[]
interface PitchResult {
  target: Note; detected: Note | null
  centsDeviation: number; medianFrequency: number | null
  accuracy: 'excellent' | 'acceptable' | 'off' | 'missed'
}
type AppState = 'idle' | 'playing' | 'listening' | 'results'
interface NoteGenerator {
  id: string; name: string; description: string
  generate(length: number, config: GeneratorConfig): NoteSequence
}
interface GeneratorConfig { rootNote: string; lowOctave: number; highOctave: number }
interface Settings { sequenceLength: number; synthVoice: 'sine'|'soft'|'piano'; rootNote: string; lowOctave: number; highOctave: number }
```

## TDD Workflow (mandatory for all non-trivial code)
1. Write a failing test first (RED)
2. Implement the minimum code to pass (GREEN)
3. Refactor
4. Repeat

High-value pure logic to TDD: `pitchUtils.ts`, `noteSegmenter.ts`, `generators/majorScale.ts`, `useSettings.ts`.

## What to Mock in Tests
- **Tone.js**: mock `Synth`, `PolySynth`, and `Tone.start()` — no real audio
- **Web Audio APIs**: mock `getUserMedia`, `AudioContext`, `AnalyserNode`
- **pitchy**: either mock or feed synthetic Float32Array (sine at known Hz)
- **localStorage**: jsdom provides it; clear between tests

## Audio Rules (iOS)
- `Tone.start()` and `AudioContext.resume()` must be called from a user gesture (tap)
- Mic access via `getUserMedia({ audio: true })` — handle denial gracefully
- Note playback: 0.8s on, 0.3s gap, 0.5s delay before listening starts

## Pitch Accuracy Thresholds
- **Excellent** (green): ±10 cents
- **Acceptable** (yellow): ±10–25 cents
- **Off** (red): >±25 cents

## Color Palette (Bulma Sass overrides)
| Variable | Value | Role |
|---|---|---|
| `$scheme-main` | `#1a1a2e` | Background |
| `$scheme-main-bis` | `#16213e` | Surface/cards |
| `$primary` | `#e94560` | Buttons, accents |
| `$success` | `#4ecca3` | Excellent accuracy |
| `$warning` | `#f0c040` | Acceptable accuracy |
| `$danger` | `#e94560` | Off/error |
| `$text` | `#eaeaea` | Body text |

## Deployment
- GitHub Pages at `pitch.baldivieso.com`
- `public/CNAME` contains `pitch.baldivieso.com`
- Vite `base: '/'` (custom domain at root)
- `vite-plugin-pwa` in `generateSW` mode handles service worker + manifest
- Build output: `dist/` → deploy to `gh-pages` branch via GitHub Actions

## What Requires Manual Device Testing
Pitch detection, audio playback, mic permission, and PWA install/standalone mode must be tested on a real iOS device — simulators have no mic.
