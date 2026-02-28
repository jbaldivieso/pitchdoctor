# Pitch Doctor — Implementation Plan

> Granular, ordered phases derived from `SPEC.md`. Each phase is a single focused session (~30–90 min of Claude Code work), ends with something testable, and builds on prior phases. TDD is mandatory for all logic and component code.
>
> **Current state**: Project scaffolding (Phase 1) and foundational types/utilities (Phase 2) are already complete from the initial setup commit. The plan begins execution at Phase 3.

---

## Phase 1: Project Scaffolding ✅ (already complete)

**Goal**: Set up the Vite + Vue 3 + TypeScript project with all dependencies, Vitest, Bulma/Sass theming, and verify everything builds and runs.

**Files created** (already exist):
- `package.json` — all runtime and dev dependencies
- `vite.config.ts` — Vite config with `@vitejs/plugin-vue`, `vite-plugin-pwa` (shell config), `@` alias
- `vitest.config.ts` — Vitest with jsdom environment, coverage config
- `tsconfig.json` — TypeScript configuration
- `index.html` — HTML entry point with PWA meta tags
- `src/main.ts` — app entry point, mounts Vue app, imports styles
- `src/App.vue` — minimal root component (just title + state display)
- `src/assets/styles/main.scss` — Bulma Sass variable overrides ($scheme-main, $primary, $success, $warning, $danger, $text, etc.), Bulma import, safe-area-inset padding, tap target minimums

**Done when**: `npm run build` succeeds, `npx vitest run` passes (even with trivial tests), `npm run dev` shows the styled Pitch Doctor page.

---

## Phase 2: TypeScript Types & Pitch Utilities ✅ (already complete)

**Goal**: Define all shared TypeScript types and implement the pure pitch math utility functions with full TDD coverage.

**Files created** (already exist):
- `src/types/index.ts` — `Note`, `NoteSequence`, `PitchResult`, `AppState`, `NoteGenerator`, `GeneratorConfig`, `Settings`
- `src/lib/pitchUtils.ts` — `frequencyToNoteName(hz)`, `centsDeviation(detected, target)`, `classifyAccuracy(cents)`
- `src/__tests__/lib/pitchUtils.spec.ts` — tests for all three functions

**Tests written** (already pass):
- `src/__tests__/lib/pitchUtils.spec.ts`
  - `centsDeviation`: returns 0 for exact match, positive for sharp, negative for flat, handles zero/negative input, specific cents deviation value
  - `classifyAccuracy`: excellent within ±10¢, acceptable ±10–25¢, off beyond ±25¢
  - `frequencyToNoteName`: null for 0 Hz, null for negative Hz, valid string for valid frequency

**Done when**: All pitchUtils tests pass. Types compile without errors.

---

## Phase 3: Major Scale Generator & useNoteGenerator

**Goal**: TDD the major scale note generator and the composable that wraps the generator strategy pattern. The generator implementation (`majorScale.ts`) already exists but lacks tests; this phase adds full test coverage and builds the `useNoteGenerator` composable.

**Files to create/modify**:
- `src/__tests__/lib/generators/majorScale.spec.ts` — **create**: full test suite for the existing generator
- `src/lib/generators/majorScale.ts` — **existing**: may need minor fixes if tests reveal issues
- `src/composables/useNoteGenerator.ts` — **create**: composable that selects and delegates to the active generator
- `src/__tests__/composables/useNoteGenerator.spec.ts` — **create**: tests for the composable

**Tests to write**:
- `src/__tests__/lib/generators/majorScale.spec.ts`
  - generates the correct number of notes for a given length
  - generated notes are consecutive ascending scale tones (no gaps in the scale)
  - all generated notes fall within the specified octave range (lowOctave–highOctave)
  - works with C major root (default case)
  - works with non-C roots (e.g., G major, F major)
  - each generated note has a valid `name` (string) and `frequency` (positive number)
  - frequencies match the note names (cross-check with tonal)
  - handles edge case: requested length exceeds available pool (clamps gracefully)
  - handles edge case: single-note sequence (length = 1)
  - handles edge case: maximum sequence length (7 notes)
  - throws or handles gracefully when octave range yields no notes
  - randomness: starting position varies across multiple calls (statistical)
  - randomness: starting position never produces out-of-bounds sequences
- `src/__tests__/composables/useNoteGenerator.spec.ts`
  - exposes a `generate(length, config)` function
  - delegates to majorScaleGenerator by default
  - passes config through to the underlying generator correctly
  - returns a valid NoteSequence

**Done when**: All generator tests and useNoteGenerator tests pass. `npx vitest run` is green.

**Notes**: The existing `majorScale.ts` uses `Math.random()` internally. Tests for randomness should use statistical checks (e.g., run multiple times, verify starting indices vary) rather than trying to mock `Math.random`. For deterministic tests of note correctness, seed-independent assertions (e.g., "all notes are in C major scale", "notes are consecutive") are preferred.

---

## Phase 4: Note Segmentation Logic

**Goal**: TDD the note segmenter — the module that takes a stream of pitch readings and segments them into discrete notes based on pitch stability, silence gaps, and expected note count.

**Files to create**:
- `src/lib/noteSegmenter.ts` — **create**: the segmentation engine
- `src/__tests__/lib/noteSegmenter.spec.ts` — **create**: comprehensive test suite

**Tests to write**:
- `src/__tests__/lib/noteSegmenter.spec.ts`
  - **Stable pitch detection**: feeding N identical pitch readings (same frequency, high clarity) produces one detected note with that frequency
  - **Multiple notes**: a stream that holds one pitch, then shifts to a new pitch (>1 semitone away), produces two separate notes
  - **Median frequency**: the detected note's frequency is the median of its stable readings (not mean)
  - **Silence gap as boundary**: a gap of low-clarity readings (>200ms worth) between two pitches creates a note boundary
  - **Noise rejection**: readings with clarity below threshold (0.9) are discarded and don't contribute to note detection
  - **Rolling window stability**: the note is not captured until a sufficient number of consistent readings accumulate (e.g., 10 readings within ±50 cents)
  - **Expected note count**: stops capturing after N notes are detected (configurable)
  - **Timeout**: stops capturing after a configurable timeout (~8 seconds) even if fewer than N notes detected
  - **Returns partial results**: if timeout fires after detecting only some notes, returns what was captured
  - **Adjacent identical notes**: if the user sings the same note twice with a silence gap in between, it captures it as two separate notes
  - **Ignores brief pitch fluctuations**: a momentary blip (1–2 frames of different pitch) within a stable note doesn't split it
  - **Empty input**: no readings produces no notes

**Done when**: All noteSegmenter tests pass. The module exports a clean API (e.g., a class or set of functions) that `usePitchDetector` can call in Phase 6.

**Notes**: Design the API so it can be fed readings one-at-a-time (streaming) from the pitch detection animation loop. Consider a stateful approach: a `NoteSegmenter` class or a closure that accepts `addReading(frequency, clarity, timestamp)` and exposes `getNotes()` / `isDone()`. The exact API will emerge from the tests. This is the most algorithmically complex module — take time to get the edge cases right.

---

## Phase 5: Audio Player Composable (Tone.js)

**Goal**: TDD the `useAudioPlayer` composable that wraps Tone.js for playing note sequences with configurable synth voices and precise timing.

**Files to create**:
- `src/composables/useAudioPlayer.ts` — **create**: Tone.js wrapper composable
- `src/__tests__/composables/useAudioPlayer.spec.ts` — **create**: test suite with mocked Tone.js

**Tests to write**:
- `src/__tests__/composables/useAudioPlayer.spec.ts`
  - **Tone.start()**: calls `Tone.start()` before first playback (iOS AudioContext requirement)
  - **Note scheduling**: schedules each note in the sequence with correct timing — 0.8s duration, 0.3s gap between notes
  - **Synth voice — sine**: creates a `Tone.Synth` with `oscillator.type = 'sine'` when voice is `'sine'`
  - **Synth voice — soft**: creates a `Tone.Synth` with `oscillator.type = 'triangle'` when voice is `'soft'`
  - **Synth voice — piano**: creates a `Tone.Synth` with a shaped envelope when voice is `'piano'`
  - **Playback completion**: signals when playback is done (e.g., resolves a promise or sets a reactive flag)
  - **Post-playback delay**: after the last note, waits 0.5s before signaling completion (transition gap before listening starts)
  - **Exposes playing state**: provides a reactive `isPlaying` ref
  - **Plays correct frequencies**: triggers the synth with the correct frequency/note for each note in the sequence
  - **Cleanup**: disposes of the synth when done to avoid resource leaks

**Done when**: All useAudioPlayer tests pass with mocked Tone.js. `npx vitest run` is green.

**Notes**: Mock `Tone.Synth`, `Tone.PolySynth`, `Tone.start()`, `Tone.now()`, and `Tone.getDestination()` (or `Tone.Destination`). Use `vi.mock('tone')` at the module level. The composable should accept the synth voice type as a parameter. Use `Tone.now()` scheduling (not `setTimeout`) for precise note timing per the spec.

---

## Phase 6: Pitch Detector Composable (Mic + pitchy)

**Goal**: TDD the `usePitchDetector` composable that handles microphone access, real-time pitch detection via pitchy, and feeds readings into the note segmenter.

**Files to create**:
- `src/composables/usePitchDetector.ts` — **create**: mic + pitchy + segmenter integration
- `src/__tests__/composables/usePitchDetector.spec.ts` — **create**: test suite with mocked Web Audio APIs

**Tests to write**:
- `src/__tests__/composables/usePitchDetector.spec.ts`
  - **Requests mic access**: calls `navigator.mediaDevices.getUserMedia({ audio: true })` when starting
  - **Handles mic denial**: sets an error state / message when getUserMedia rejects (permission denied)
  - **Creates audio pipeline**: creates `AudioContext`, connects `MediaStreamSource` → `AnalyserNode` with `fftSize: 2048`
  - **Pitch detection loop**: starts a `requestAnimationFrame` loop that reads from the AnalyserNode and feeds data to pitchy's `PitchDetector`
  - **Clarity filtering**: discards readings where pitchy's clarity < 0.9
  - **Feeds segmenter**: passes valid (frequency, clarity, timestamp) readings to the note segmenter
  - **Exposes reactive state**: provides `isListening`, `detectedNotes`, and `error` refs
  - **Stops on completion**: stops the detection loop and releases mic when the segmenter reports enough notes captured
  - **Stops on timeout**: stops after the configured timeout (~8 seconds)
  - **Cleanup**: stops MediaStream tracks and closes AudioContext on teardown
  - **Returns PitchResult array**: converts segmenter output + target notes into `PitchResult[]` with cents deviation and accuracy classification

**Done when**: All usePitchDetector tests pass with mocked getUserMedia, AudioContext, AnalyserNode, and pitchy. `npx vitest run` is green.

**Notes**: This composable orchestrates the mic → AnalyserNode → pitchy → noteSegmenter → PitchResult pipeline. Mock `navigator.mediaDevices.getUserMedia` to return a fake MediaStream. Mock `AudioContext` and `AnalyserNode` (provide fake `getFloatTimeDomainData` that writes known values into the buffer). Either mock pitchy or use real pitchy with synthetic sine-wave buffers. The composable takes the target `NoteSequence` and expected count as inputs, and produces `PitchResult[]` as output.

---

## Phase 7: Results Display Components (PitchScale + ResultsPanel)

**Goal**: TDD the results visualization components — the horizontal pitch accuracy meter and the panel that stacks them.

**Files to create**:
- `src/components/PitchScale.vue` — **create**: horizontal ±50¢ accuracy meter for one note
- `src/components/ResultsPanel.vue` — **create**: stacks PitchScale for each note in the sequence
- `src/__tests__/components/PitchScale.spec.ts` — **create**: component test suite
- `src/__tests__/components/ResultsPanel.spec.ts` — **create**: component test suite

**Tests to write**:
- `src/__tests__/components/PitchScale.spec.ts`
  - renders the **target note name** (e.g., "C4")
  - renders the **detected note name** and **cents deviation text** (e.g., "+12¢", "−8¢")
  - applies **green / success** class when accuracy is `'excellent'` (within ±10¢)
  - applies **yellow / warning** class when accuracy is `'acceptable'` (±10–25¢)
  - applies **red / danger** class when accuracy is `'off'` (>±25¢)
  - shows **"not detected"** state when `detected` is null (accuracy is `'missed'`)
  - **positions the indicator** correctly on the horizontal scale based on cents deviation (0¢ = center, ±50¢ = edges)
  - clamps indicator position at the edges for deviations beyond ±50¢
  - renders the flat (♭) and sharp (♯) labels on the scale ends
- `src/__tests__/components/ResultsPanel.spec.ts`
  - renders **one PitchScale per note** in the results array
  - handles **mixed results**: some notes excellent, some missed
  - renders **zero results** gracefully (empty state)
  - passes the correct `PitchResult` props down to each PitchScale

**Done when**: All PitchScale and ResultsPanel component tests pass. Components render correctly with test data in the Vitest jsdom environment.

**Notes**: PitchScale receives a `PitchResult` as a prop. The indicator position should be computed as a percentage: `50 + (centsDeviation / 50) * 50` (clamped to 0–100%). Use Bulma's `tag` for note names, Bulma's `progress` or custom CSS for the horizontal scale. ResultsPanel receives `PitchResult[]` as a prop.

---

## Phase 8: Playback & Listening UI Components ✅ (complete)

**Goal**: TDD the interactive UI components: the main action button, the note sequence display, and the listening indicator.

**Files to create**:
- `src/components/PlayButton.vue` — **create**: big action button with state-dependent label
- `src/components/NoteDisplay.vue` — **create**: horizontal sequence display, highlights current note
- `src/components/ListeningIndicator.vue` — **create**: pulsing mic-active visual feedback
- `src/__tests__/components/PlayButton.spec.ts` — **create**: component tests
- `src/__tests__/components/NoteDisplay.spec.ts` — **create**: component tests (optional, add if logic warrants it)

**Tests to write**:
- `src/__tests__/components/PlayButton.spec.ts`
  - shows **"Play"** label when app state is `'idle'`
  - shows **"Listening…"** (or similar) label when state is `'listening'`
  - shows **"Playing…"** (or similar) label when state is `'playing'`
  - shows **"Try Again"** and **"New Sequence"** buttons when state is `'results'`
  - **emits `play` event** when clicked in idle state
  - **emits `tryAgain` event** when "Try Again" is clicked in results state
  - **emits `newSequence` event** when "New Sequence" is clicked in results state
  - button is **disabled** during `'playing'` and `'listening'` states (no double-trigger)
  - uses Bulma's `is-large` class for large tap targets
- `src/__tests__/components/NoteDisplay.spec.ts` (if applicable)
  - renders all notes in the sequence as tags/labels
  - **highlights the currently playing note** (via an `activeIndex` prop)
  - no highlight when no note is active (idle or results state)

**Done when**: All PlayButton tests pass. NoteDisplay renders the sequence with correct highlighting. ListeningIndicator shows a pulsing/animated visual. `npx vitest run` is green.

**Notes**: PlayButton may actually be two sub-states in the results phase (two buttons). Consider accepting `appState` as a prop and emitting different events. NoteDisplay takes `NoteSequence` and `activeIndex` props. ListeningIndicator is mostly CSS animation — a pulsing circle or mic icon — and may not need extensive unit tests beyond verifying it renders.

---

## Phase 9: App Integration — State Machine Wiring

**Goal**: Wire all composables and components together in `App.vue`, implementing the full state machine (idle → playing → listening → results) and the complete user flow.

**Files to modify**:
- `src/App.vue` — **modify**: replace placeholder with full state machine, import and use all composables and components

**Implementation steps**:
1. Import `useNoteGenerator`, `useAudioPlayer`, `usePitchDetector`
2. Define the state machine: `state = ref<AppState>('idle')`
3. **Idle state**: show PlayButton ("Play") + NoteDisplay (current sequence or placeholder) + sequence length selector
4. **Play button handler**: generate a new sequence (or reuse for "Try Again"), transition to `'playing'`, call `useAudioPlayer.play(sequence, synthVoice)`
5. **Playing state**: show NoteDisplay with active note highlighting, disable Play button. On playback completion → transition to `'listening'`
6. **Listening state**: show ListeningIndicator, start `usePitchDetector` with the target sequence. On detection completion → transition to `'results'`
7. **Results state**: show ResultsPanel with PitchResult array, show "Try Again" (replay same sequence) and "New Sequence" (generate fresh) buttons. Both return to idle (then immediately to playing)
8. Handle `Tone.start()` on first user gesture (the initial Play tap)

**Done when**: The app runs in `npm run dev` and the full flow works end-to-end:
- Tap Play → hear notes play in sequence → mic activates and listens → results appear with pitch accuracy scales
- "Try Again" replays the same sequence
- "New Sequence" generates a fresh sequence
- State transitions are clean (no stuck states)

**Notes**: This is the integration phase — no new unit tests are strictly required, but verify the flow manually in the browser. If any composable APIs need adjustment to fit together, update their tests first (TDD). The sequence length selector can be a simple number input for now (it will move to Settings in Phase 10). This phase will likely require the most manual testing in a browser.

---

## Phase 10: Settings & Persistence

**Goal**: TDD the settings composable and settings panel component. Wire settings into the app so user preferences persist across sessions.

**Files to create/modify**:
- `src/composables/useSettings.ts` — **create**: localStorage-backed reactive settings
- `src/components/SettingsPanel.vue` — **create**: settings slide-out/panel UI
- `src/__tests__/composables/useSettings.spec.ts` — **create**: test suite
- `src/__tests__/components/SettingsPanel.spec.ts` — **create**: component tests
- `src/App.vue` — **modify**: integrate settings panel, pass settings to composables

**Tests to write**:
- `src/__tests__/composables/useSettings.spec.ts`
  - returns correct **default values**: sequenceLength=3, synthVoice='soft', rootNote='C', lowOctave=3, highOctave=5
  - **reads from localStorage** on initialization (restores persisted settings)
  - **writes to localStorage** when a setting changes
  - **handles corrupted localStorage** gracefully (falls back to defaults)
  - **handles missing keys** in stored data (merges with defaults)
  - individual settings are **reactive** (changing one triggers watchers)
  - all values conform to their valid ranges / enums
- `src/__tests__/components/SettingsPanel.spec.ts`
  - renders **sequence length** picker (1–7)
  - renders **synth voice** selector (Sine, Soft, Piano) with current selection
  - renders **root note** selector (all 12 notes)
  - renders **octave range** controls (low/high)
  - **emits setting changes** when user modifies a control
  - shows the **current value** for each setting

**Done when**: All useSettings and SettingsPanel tests pass. Settings panel is wired into App.vue. Changing settings in the panel affects note generation and playback. Settings persist across page reloads (verified manually).

**Notes**: Use `localStorage` with a single JSON key (e.g., `pitch-doctor-settings`). The composable should use Vue's `reactive()` or multiple `ref()`s with `watch` to auto-save. Clear `localStorage` between test runs. The settings panel can be a slide-out (Bulma `modal` or off-canvas) or a separate section — keep it simple.

---

## Phase 11: Visual Polish & iOS Hardening

**Goal**: Refine the visual design, ensure mobile-first layout, and address iOS-specific requirements that weren't covered in earlier phases.

**Files to modify**:
- `src/assets/styles/main.scss` — **modify**: add any missing app-level styles, transitions, animations
- `src/components/*.vue` — **modify**: refine Bulma class usage, spacing, responsive layout
- `src/App.vue` — **modify**: layout refinements
- `index.html` — **modify**: ensure all iOS PWA meta tags are present

**Checklist (not TDD — visual/manual verification)**:
- [ ] Mobile-first single-column layout using Bulma's `container`, `section`, `box`
- [ ] Large tap targets (min 44×44pt) on all interactive elements
- [ ] Pitch scale is the visual focus — large, readable note names
- [ ] `env(safe-area-inset-*)` applied correctly (already in main.scss — verify on device)
- [ ] `<meta name="apple-mobile-web-app-capable" content="yes">` present
- [ ] `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` present
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">` present
- [ ] Smooth state transitions (idle → playing → listening → results)
- [ ] Listening state has a visible pulsing/animated indicator
- [ ] Color palette looks cohesive: deep navy bg, coral accents, teal/amber/red accuracy colors
- [ ] No visual clutter — minimal chrome, focused UI
- [ ] Mic permission denied state shows a clear, helpful message
- [ ] "Not detected" state for missed notes looks distinct and informative
- [ ] Sequence length selector is intuitive (consider Bulma's `select` or custom stepper)

**Done when**: App looks polished in mobile viewport (Chrome/Safari DevTools), all iOS meta tags are present, layout is clean with adequate spacing and tap targets. Ready for real-device testing.

**Notes**: This is a polish phase — no new logic, no new tests. Focus on visual quality and UX. Test in browser DevTools with iPhone viewport sizes (375×812 for iPhone X-class, 390×844 for 14-class). The app should feel native-like.

---

## Phase 12: PWA Configuration & Deployment

**Goal**: Finalize PWA configuration (manifest, service worker, icons) and set up GitHub Pages deployment.

**Files to create/modify**:
- `public/icon-192.png` — **create**: 192×192 placeholder icon
- `public/icon-512.png` — **create**: 512×512 placeholder icon
- `public/favicon.ico` — **create**: favicon
- `public/CNAME` — **create**: contains `pitch.baldivieso.com`
- `vite.config.ts` — **verify**: PWA config is complete (already has shell config)
- `index.html` — **verify**: all PWA meta tags present
- `.github/workflows/deploy.yml` — **create**: GitHub Actions workflow for build + deploy to gh-pages

**PWA verification checklist**:
- [ ] `npm run build` produces `dist/` with:
  - [ ] `manifest.webmanifest` with correct name, icons, colors, start_url
  - [ ] A generated service worker file (from workbox/generateSW)
  - [ ] CNAME file
  - [ ] Icon files
- [ ] Dev server: app can be installed as PWA (browser shows install prompt)
- [ ] Service worker precaches all assets for offline use

**GitHub Actions workflow should**:
- Trigger on push to `main`
- Install dependencies, run tests, build
- Deploy `dist/` contents to `gh-pages` branch
- Configure GitHub Pages to serve from `gh-pages` branch root

**Done when**: `npm run build` succeeds with full PWA assets. CNAME is in the build output. GitHub Actions workflow file exists and is syntactically valid. Icons exist (even as simple colored squares). The app is deployable.

**Notes**: For placeholder icons, generate simple solid-color PNGs (coral `#e94560` background with a white musical note symbol or the letter "P"). Can use a canvas script, an online generator, or just commit minimal PNGs. The `vite-plugin-pwa` config in `vite.config.ts` already has the manifest shell — verify it's complete. The service worker in `generateSW` mode will auto-precache all build assets.

---

## Phase Summary

| Phase | Title | Key Deliverables | Status |
|-------|-------|-----------------|--------|
| 1 | Project Scaffolding | Vite, Vue, TS, Vitest, Bulma/Sass | ✅ Done |
| 2 | Types & Pitch Utilities | Types, pitchUtils (TDD) | ✅ Done |
| 3 | Note Generation | majorScale tests, useNoteGenerator (TDD) | Pending |
| 4 | Note Segmentation | noteSegmenter (TDD) | Pending |
| 5 | Audio Player | useAudioPlayer with Tone.js (TDD) | Pending |
| 6 | Pitch Detector | usePitchDetector with mic + pitchy (TDD) | Pending |
| 7 | Results Display | PitchScale, ResultsPanel (TDD) | Pending |
| 8 | Playback & Listening UI | PlayButton, NoteDisplay, ListeningIndicator (TDD) | ✅ Done |
| 9 | App Integration | State machine wiring, full user flow | Pending |
| 10 | Settings & Persistence | useSettings, SettingsPanel (TDD) | Pending |
| 11 | Visual Polish & iOS | Layout, styling, iOS meta tags | Pending |
| 12 | PWA & Deployment | Icons, service worker, GitHub Actions, CNAME | Pending |

**Total**: 12 phases, 10 remaining. Phases 3–8 are TDD-driven (tests first). Phase 9 is integration. Phases 10–12 are settings, polish, and deployment.
