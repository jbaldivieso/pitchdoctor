# Pitch Doctor — Project Spec
## Overview
A Progressive Web App that plays a sequence of musical notes, listens to the user sing/hum them back, and provides visual feedback on pitch accuracy for each note. Target platform is iOS (Safari / home screen PWA), but should work on any modern browser.
## Tech Stack
- **Framework**: Vue 3 (Composition API, `<script setup>`)
- **Build tool**: Vite
- **Language**: TypeScript
- **Audio synthesis**: [Tone.js](https://tonejs.github.io/) (`tone` v15.x) — generates target notes with configurable synth voices
- **Pitch detection**: [pitchy](https://github.com/ianprime0509/pitchy) (v4.x) — McLeod Pitch Method, runs in real time via AudioWorklet, returns Hz + clarity score
- **Music theory**: [tonal](https://github.com/tonaljs/tonal) — note name ↔ frequency conversion, scale generation, interval math, cents calculation
- **Styling**: [Bulma](https://bulma.io/) CSS framework, customized with the app's distinctive color palette via Bulma's Sass variables. Minimal and clean aesthetic (see Design section)
- **Testing**: Vitest + Vue Test Utils for unit/component tests. All code should be developed **red/green TDD style** — write a failing test first, then implement to make it pass. See Testing section for details.
- **PWA**: Vite PWA plugin (`vite-plugin-pwa`) for manifest + service worker
## Core User Flow
1. User opens the app and sees a simple screen with a **Play** button and a sequence length selector.
2. User taps **Play**. The app plays N notes in sequence (e.g., 3 notes from a C major scale), each held for ~0.8s with ~0.3s gap.
3. After playback completes, the app automatically begins listening via the microphone. A visual indicator shows that it's listening.
4. The user sings/hums each note. The app detects pitch in real time and segments the input into discrete notes (based on pitch stability and silence gaps).
5. Once the app has captured the expected number of notes (or a timeout of ~8s elapses), listening stops.
6. The app displays a **results screen** showing each note with a horizontal pitch accuracy scale indicating how sharp or flat the user was.
7. User can tap **Try Again** (same sequence) or **New Sequence** (generate fresh notes).
## Audio Output (Tone Generation)
Use Tone.js to synthesize the target notes.
### Synth Voices (User-Selectable in Settings)
Provide at least three synth options the user can choose between:
| Label         | Tone.js instrument       | Character                |
|---------------|--------------------------|--------------------------|
| **Sine**      | `Tone.Synth` (sine wave) | Pure, tuner-like         |
| **Soft**      | `Tone.Synth` (triangle)  | Warm, mellow             |
| **Piano**     | `Tone.PolySynth` or `Tone.Synth` with a shaped envelope | Piano-ish, percussive attack |
Store the user's preference in `localStorage`.
### Playback Behavior
- Play each note for **0.8 seconds**, with **0.3 seconds** of silence between notes.
- Use `Tone.now()` scheduling for precise timing.
- Call `Tone.start()` on the first user gesture (tap) to satisfy iOS AudioContext restrictions.
- After the last note finishes, wait **0.5 seconds**, then begin listening.
## Audio Input (Pitch Detection)
### Microphone Access
- Request mic access via `navigator.mediaDevices.getUserMedia({ audio: true })`.
- Connect the MediaStream to an `AnalyserNode` (Web Audio API).
- Use `AudioWorklet` for real-time audio processing — this is supported on iOS Safari 14.5+ and all modern browsers.
- If mic permission is denied, show a clear message explaining that the app needs microphone access to work and how to enable it in iOS Settings.
### Pitch Detection Pipeline
1. Create an `AnalyserNode` with `fftSize: 2048` (or higher for better low-frequency resolution).
2. On each animation frame (or at ~60Hz via `requestAnimationFrame`), pull time-domain data from the analyser.
3. Feed the float32 buffer into `pitchy`'s `PitchDetector.forFloat32Array(bufferSize)`.
4. `findPitch(buffer, sampleRate)` returns `[frequency, clarity]`.
5. Discard readings where `clarity < 0.9` (noise / silence / transition).
6. Use `tonal` to convert the detected frequency to the nearest note name and compute **cents deviation** from the target note.
### Note Segmentation
The user will sing N discrete notes. Segment them using this approach:
- Maintain a rolling window of recent stable pitch readings (e.g., last 10 readings within ±50 cents of each other).
- When the pitch stabilizes on a new note (differs from the previous captured note by more than a semitone), record it as the next note in the sequence.
- Also detect silence gaps (clarity drops below threshold for >200ms) as note boundaries.
- Stop capturing after N notes are detected or after a configurable timeout (~8 seconds).
- Store the **median frequency** of each detected note for accuracy calculation.
## Feedback Display
### Per-Note Pitch Accuracy Scale
For each note in the sequence, display a **horizontal scale** (like a tuner meter):
```
        ♭ ◄━━━━━━━━━━━|━━━━━━━━━━━► ♯
                       ▲
                   (indicator)
```
- The center of the scale represents **perfect pitch** (0 cents deviation).
- The scale spans roughly **±50 cents** (one semitone in each direction).
- A marker/indicator shows where the user's pitch landed.
- Color-code the indicator:
  - **Green** if within ±10 cents (excellent)
  - **Yellow/amber** if within ±25 cents (acceptable)
  - **Red** if beyond ±25 cents (needs work)
- Show the **note name** and **cents deviation** (e.g., "+12¢" or "−8¢") as text alongside the scale.
- If a note wasn't detected (user was silent or unclear), show a "not detected" state.
### Layout
Stack the per-note results vertically. For each note:
```
  Target: C4       You sang: C4 +12¢
  ♭ ━━━━━━━━━━━━━━━|━━●━━━━━━━━━━━━ ♯
```
## Note Generation
### MVP: Major Scale Fragments
For the MVP, generate sequences by picking **consecutive notes from the C major scale** starting at a random position within a comfortable singing range.
- **Default range**: C3 to C5 (covers most singing voices for humming).
- Pick a random starting note within the range (ensuring the full sequence fits).
- Select N consecutive ascending scale tones from that starting point.
### Architecture for Future Expansion
Design the note generation as a **strategy pattern** (or simple composable function) so it's easy to swap in other generators later:
```typescript
interface NoteGenerator {
  name: string;
  description: string;
  generate(length: number, config?: GeneratorConfig): NoteSequence;
}
```
Planned future generators (not for MVP, but design to accommodate):
- **Interval training**: specific intervals (3rds, 5ths, octaves)
- **Jumping intervals**: non-consecutive scale tones
- **Minor scales**: natural, harmonic, melodic minor
- **Chromatic**: notes outside a single scale
## Settings
A minimal settings panel (slide-out or separate view) with:
| Setting            | Type          | Default    | Options                              |
|--------------------|---------------|------------|--------------------------------------|
| Sequence length    | Number picker | 3          | 1–7                                  |
| Synth voice        | Radio/select  | Soft       | Sine, Soft, Piano                    |
| Root note          | Select        | C          | All 12 notes (affects scale start)   |
| Octave range       | Range slider  | C3–C5      | Adjustable low/high bound            |
Persist all settings in `localStorage`.
## PWA Configuration
### Manifest (`manifest.json`)
```json
{
  "name": "Pitch Doctor",
  "short_name": "PitchDr",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#1a1a2e",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
- Generate simple placeholder icons (solid color with a musical note glyph or just the app initial).
- Include `<meta name="apple-mobile-web-app-capable" content="yes">` and `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`.
### Service Worker
Use `vite-plugin-pwa` in `generateSW` mode for basic precaching. The app is fully client-side with no backend, so offline support is straightforward — cache all assets.
## Design
### Color Palette
Override Bulma's Sass variables to apply a distinctive palette — not the typical blues/grays of generic apps. Suggestion (adapt as you see fit, but keep it cohesive):
| Role             | Color      | Bulma variable override              | Usage                                    |
|------------------|------------|---------------------------------------|------------------------------------------|
| **Background**   | `#1a1a2e`  | `$scheme-main`                        | Deep navy, main bg                       |
| **Surface**      | `#16213e`  | `$scheme-main-bis`                    | Cards, panels, boxes                     |
| **Primary**      | `#e94560`  | `$primary`                            | Buttons, active states, accents          |
| **Secondary**    | `#0f3460`  | `$info` or custom                     | Secondary buttons, borders               |
| **Text**         | `#eaeaea`  | `$text`                               | Primary text                             |
| **Text muted**   | `#8892a0`  | `$text-light`                         | Secondary text, labels                   |
| **Success**      | `#4ecca3`  | `$success`                            | Pitch accuracy: excellent (within ±10¢)  |
| **Warning**      | `#f0c040`  | `$warning`                            | Pitch accuracy: acceptable (±10–25¢)     |
| **Error**        | `#e94560`  | `$danger`                             | Pitch accuracy: off (>±25¢), error states|
The `main.scss` file should import Bulma after setting these variable overrides:
```scss
// Override Bulma variables first
$scheme-main: #1a1a2e;
$primary: #e94560;
$success: #4ecca3;
$warning: #f0c040;
$danger: #e94560;
$text: #eaeaea;
// ... etc
// Then import Bulma
@import "bulma/bulma";
// App-specific overrides below
```
### Typography
- Use Bulma's default font stack (BlinkMacSystemFont, -apple-system, etc.) which is clean and native-feeling on iOS.
- Large, readable note names. The pitch scale should be the visual focus.
### Layout
- Mobile-first, single-column layout. Use Bulma's `container`, `section`, `box`, and `columns` for structure.
- Large tap targets (minimum 44×44pt per Apple HIG). Bulma's button sizes (`is-large`) help here.
- No unnecessary chrome. The main screen is essentially: sequence display area, a big action button, and results.
- Use Bulma's `notification`, `tag`, and `progress` components where they fit naturally (e.g., tags for note names, notifications for status messages).
### States
The app has a simple state machine:
```
IDLE → PLAYING → LISTENING → RESULTS
  ↑                              │
  └──────────────────────────────┘
```
- **IDLE**: Shows "Play" button. Sequence length selector visible.
- **PLAYING**: Notes are sounding. Show which note is currently playing (e.g., highlight the current note in a horizontal sequence display).
- **LISTENING**: Mic is active. Show a pulsing indicator or waveform visualization. Optionally show real-time detected pitch.
- **RESULTS**: Show the per-note accuracy scales. "Try Again" and "New Sequence" buttons.
## iOS-Specific Considerations
- **AudioContext must start from user gesture**: Gate `Tone.start()` and `AudioContext.resume()` behind the Play button tap.
- **getUserMedia permission**: Will prompt the user on first use. Handle the rejected case gracefully.
- **PWA on home screen**: Test that audio playback and mic access both work in standalone mode (they should, but verify).
- **No background audio needed**: This is a foreground-only interaction.
- **Safe area insets**: Use `env(safe-area-inset-*)` CSS to avoid notch/home indicator overlap.
## Project Structure
```
pitch-doctor/
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── favicon.ico
├── src/
│   ├── App.vue                    # Root component, state machine
│   ├── main.ts                    # App entry point
│   ├── components/
│   │   ├── PlayButton.vue         # Big play/action button
│   │   ├── NoteDisplay.vue        # Shows current sequence / what's playing
│   │   ├── ListeningIndicator.vue # Mic active visual feedback
│   │   ├── PitchScale.vue         # Single note's horizontal accuracy meter
│   │   ├── ResultsPanel.vue       # All notes' accuracy results
│   │   └── SettingsPanel.vue      # Settings slide-out
│   ├── composables/
│   │   ├── useAudioPlayer.ts      # Tone.js wrapper: play note sequences
│   │   ├── usePitchDetector.ts    # Mic + pitchy: real-time pitch detection
│   │   ├── useNoteGenerator.ts    # Strategy pattern for generating sequences
│   │   └── useSettings.ts         # localStorage-backed reactive settings
│   ├── lib/
│   │   ├── pitchUtils.ts          # Hz ↔ note conversion, cents calculation (uses tonal)
│   │   ├── noteSegmenter.ts       # Logic for segmenting continuous pitch into discrete notes
│   │   └── generators/
│   │       └── majorScale.ts      # Major scale consecutive-note generator
│   ├── types/
│   │   └── index.ts               # Shared TypeScript types
│   └── assets/
│       └── styles/
│           └── main.scss          # Bulma imports + custom variable overrides
├── src/__tests__/                 # Co-located test files (mirrors src/ structure)
│   ├── lib/
│   │   ├── pitchUtils.spec.ts
│   │   ├── noteSegmenter.spec.ts
│   │   └── generators/
│   │       └── majorScale.spec.ts
│   ├── composables/
│   │   ├── useAudioPlayer.spec.ts
│   │   ├── usePitchDetector.spec.ts
│   │   ├── useNoteGenerator.spec.ts
│   │   └── useSettings.spec.ts
│   └── components/
│       ├── PlayButton.spec.ts
│       ├── PitchScale.spec.ts
│       ├── ResultsPanel.spec.ts
│       └── SettingsPanel.spec.ts
├── index.html
├── vite.config.ts
├── vitest.config.ts               # Vitest configuration
├── tsconfig.json
├── package.json
└── README.md
```
## Key TypeScript Types
```typescript
// A single note with frequency and name
interface Note {
  name: string;       // e.g., "C4"
  frequency: number;  // e.g., 261.63
}
// A sequence of notes to play / match
type NoteSequence = Note[];
// Result of pitch detection for one sung note
interface PitchResult {
  target: Note;
  detected: Note | null;        // null if not detected
  centsDeviation: number;       // negative = flat, positive = sharp
  medianFrequency: number | null;
  accuracy: 'excellent' | 'acceptable' | 'off' | 'missed';
}
// App state machine
type AppState = 'idle' | 'playing' | 'listening' | 'results';
// Note generator interface
interface NoteGenerator {
  id: string;
  name: string;
  description: string;
  generate(length: number, config: GeneratorConfig): NoteSequence;
}
interface GeneratorConfig {
  rootNote: string;    // e.g., "C"
  lowOctave: number;   // e.g., 3
  highOctave: number;  // e.g., 5
}
// User settings
interface Settings {
  sequenceLength: number;
  synthVoice: 'sine' | 'soft' | 'piano';
  rootNote: string;
  lowOctave: number;
  highOctave: number;
}
```
## Dependencies
```json
{
  "dependencies": {
    "vue": "^3.5",
    "tone": "^15.1",
    "pitchy": "^4.1",
    "tonal": "^6.0",
    "bulma": "^1.0"
  },
  "devDependencies": {
    "vite": "^6",
    "vite-plugin-pwa": "^0.21",
    "@vitejs/plugin-vue": "^5",
    "typescript": "^5.5",
    "sass": "^1.80",
    "vitest": "^2",
    "@vue/test-utils": "^2",
    "jsdom": "^25",
    "@vitest/coverage-v8": "^2"
  }
}
```
## What's NOT in the MVP
- Score tracking / streak counting
- Practice history / persistence beyond settings
- Multiple scale modes (minor, chromatic, etc.) — just major scale
- Interval training mode
- Visual waveform display while listening
- Audio playback of what the user sang
- User accounts or cloud sync
- Android-specific optimizations (should work, but not the focus)
## Testing Strategy (TDD)
All non-trivial code must be developed using **red/green TDD**. Write a failing test first, then write the minimum code to make it pass, then refactor. Tests should run fast and be deterministic.
### Test Runner
- **Vitest** with `jsdom` environment for component tests.
- Run with `vitest` (watch mode) during development, `vitest run --coverage` for CI.
### What to Unit Test (high-value, pure logic — TDD these)
| Module | Key test cases |
|--------|---------------|
| `pitchUtils.ts` | Hz → note name conversion, cents deviation calculation (exact, sharp, flat, octave boundaries), edge cases (0 Hz, very high Hz) |
| `noteSegmenter.ts` | Segments stable pitch readings into notes, handles silence gaps, handles noise (low clarity), respects expected note count, timeout behavior |
| `generators/majorScale.ts` | Generates correct scale degrees for C major, other roots, respects octave range, handles edge cases (sequence longer than remaining scale), randomness stays within bounds |
| `useSettings.ts` | Defaults are correct, reads/writes localStorage, handles corrupted localStorage gracefully |
| `useNoteGenerator.ts` | Delegates to the correct generator, passes config through |
| `types/index.ts` | Type-only — no tests needed |
### What to Component Test (render + interaction)
| Component | Key test cases |
|-----------|---------------|
| `PitchScale.vue` | Renders correct note name, positions indicator based on cents deviation, applies correct color class for excellent/acceptable/off/missed |
| `ResultsPanel.vue` | Renders one PitchScale per note, handles mixed results (some hit, some missed) |
| `SettingsPanel.vue` | Renders all settings with correct defaults, emits changes, synth voice selection works |
| `PlayButton.vue` | Shows correct label for each app state, emits click, disabled states |
### What to Mock
- **Tone.js**: Mock the `Synth` and `start()` — don't actually produce audio in tests.
- **getUserMedia / AudioContext / AnalyserNode**: Mock these Web Audio APIs. Provide fake Float32Array data to test the pitch detection pipeline.
- **pitchy**: Can test with real pitchy against synthetic buffers (sine wave at known frequency) OR mock for speed.
- **localStorage**: Use Vitest's built-in jsdom localStorage or a simple mock.
### What to Test Manually on Device
These cannot be meaningfully automated and require a real iOS device:
- Audio actually plays through speakers with each synth voice.
- Microphone permission prompt appears and works.
- Pitch detection accurately tracks sung/hummed notes.
- Full play → listen → results flow works end-to-end.
- PWA installs to home screen and works in standalone mode.
- Audio + mic work in standalone PWA mode (not just Safari).
- Safe area insets render correctly on notched devices.
### Test File Naming Convention
Tests live in `src/__tests__/` mirroring the source structure. All test files use `.spec.ts` extension.
### Example TDD Workflow
```
# 1. Write the test
src/__tests__/lib/pitchUtils.spec.ts:
  test('centsDeviation returns 0 for exact frequency match')
    → expect(centsDeviation(440, 440)).toBe(0)
# 2. Run it — it fails (RED)
$ npx vitest run src/__tests__/lib/pitchUtils.spec.ts
# 3. Implement the function (GREEN)
src/lib/pitchUtils.ts:
  export function centsDeviation(detected: number, target: number): number { ... }
# 4. Run again — it passes
# 5. Write the next test, repeat
```
## Deployment
### Target: GitHub Pages
The app will be deployed to **GitHub Pages** and served at `pitch.baldivieso.com`.
### Vite Base Path
Since GitHub Pages can serve from a custom domain at the root, configure Vite accordingly:
```typescript
// vite.config.ts
export default defineConfig({
  base: '/', // root — custom domain points directly here
  // ...
})
```
If the site is ever served from a subpath (e.g., `username.github.io/pitch-doctor/`), change `base` to `'/pitch-doctor/'`.
### Build & Deploy
```bash
npm run build        # outputs to dist/
```
Deploy the `dist/` directory to the `gh-pages` branch. Recommended approach:
- Use a GitHub Actions workflow that builds on push to `main` and deploys to `gh-pages`.
- Or use the `gh-pages` npm package for manual deploys.
### Custom Domain
- Configure a `CNAME` file in `public/` containing `pitch.baldivieso.com` so it's included in the build output.
- Set up DNS: CNAME record for `pitch.baldivieso.com` → `<username>.github.io`.
- Enable "Enforce HTTPS" in the GitHub Pages settings.
### PWA + GitHub Pages
- The service worker scope will be `/` with the custom domain, which is ideal.
- `start_url` in the manifest should be `/`.
- The `vite-plugin-pwa` will handle generating the service worker and manifest with the correct paths based on the `base` config.
## Manual Testing Notes
- **Must test on a real iOS device** — simulators don't have mic access.
- Verify audio playback + mic input work when launched from home screen (standalone PWA mode).
- Test with headphones (to prevent the mic from picking up the played tones during playback — though the play-then-listen flow should avoid this).
- Test pitch detection accuracy with a known-frequency tone generator to validate the pipeline.
