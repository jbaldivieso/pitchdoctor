# Pitch Doctor

**Sing a note. Find out if you nailed it.**

Pitch Doctor plays a short sequence of musical notes, then listens while you sing them back. It tells you — down to the cent — how close you were on each one.

Live at **[pitch.baldivieso.com](https://pitch.baldivieso.com)**

---

## What It Does

1. Tap **Play** — the app plays 3 notes (or however many you've configured)
2. Sing them back into your phone's mic
3. See a pitch accuracy meter for each note: were you sharp? flat? spot on?

That's it. No account required, no ads, no server — it runs entirely in your browser.

---

## Who It's For

**Singers and musicians** who want immediate, objective pitch feedback without needing a teacher or a piano in the room. It's especially useful for:

- Warming up your ear before a rehearsal
- Drilling pitch accuracy on intervals you find tricky
- Checking whether you're actually in tune or just think you are

**Non-musicians:** if you've ever wondered whether you can carry a tune, this will tell you. Honestly.

---

## How to Use It

### On iPhone (recommended)

1. Open [pitch.baldivieso.com](https://pitch.baldivieso.com) in Safari
2. Tap the **Share** button → **Add to Home Screen** to install it as an app
3. Open it from your home screen — it works offline once installed
4. Grant microphone access when prompted (required to hear you sing)

### On Any Modern Browser

Just visit the URL. Chrome, Firefox, and Safari on desktop all work. The microphone permission prompt will appear the first time you tap Play.

### Settings

Tap the **⚙** gear icon to adjust:

| Setting | What it does |
|---|---|
| **Sequence length** | How many notes to play (1–7) |
| **Synth voice** | Sine (pure tuner tone), Soft (warm triangle), Piano (percussive) |
| **Root note** | The key the scale runs from |
| **Octave range** | High and low bounds for generated notes |

Settings are saved automatically and persist between sessions.

---

## Reading the Results

After you sing, each note gets its own pitch meter:

```
Target: C4       You sang: D4 −8¢
♭ ━━━━━━━━━━━━━━━|━●━━━━━━━━━━━━ ♯
```

The bar spans ±50 cents (one semitone in each direction from perfect). The dot shows where you landed:

- **Green** — within ±10 cents. Excellent.
- **Yellow** — within ±25 cents. Acceptable.
- **Red** — more than ±25 cents off. Needs work.
- **Not detected** — the app couldn't hear a clear pitch. Try singing more steadily, or move somewhere quieter.

A cent is 1/100th of a semitone. Human listeners start noticing pitch errors around 10–20 cents; professional-grade intonation is typically within 5.

---

## Technical Overview

Pitch Doctor is a Progressive Web App built with:

- **[Vue 3](https://vuejs.org/)** (Composition API, `<script setup>`) — UI and state machine
- **[Tone.js](https://tonejs.github.io/)** — synthesizes the target notes with configurable voices
- **[pitchy](https://github.com/ianprime0509/pitchy)** — real-time pitch detection via the McLeod Pitch Method, reading from the microphone at ~60 Hz
- **[tonal](https://github.com/tonaljs/tonal)** — Hz ↔ note name conversion and cents math
- **[Bulma](https://bulma.io/)** — CSS framework, heavily themed with a custom dark palette
- **[vite-plugin-pwa](https://vite-pwa-org.netlify.app/)** — service worker and manifest for offline-capable home screen installation

### How Pitch Detection Works

The microphone stream feeds into a Web Audio `AnalyserNode`. On each animation frame, the float32 time-domain buffer is passed to pitchy's `PitchDetector`, which uses the McLeod Pitch Method to return a frequency and a clarity score. Readings below 0.9 clarity (noise, silence, or pitch transitions) are discarded. Stable readings are collected into a rolling window; when the pitch holds steady for long enough, it's recorded as a detected note. The median frequency of the window is compared against the target note to compute cents deviation.

### Architecture

```
App.vue  (state machine: idle → playing → listening → results)
├── useNoteGenerator   →  generators/majorScale.ts  (strategy pattern)
├── useAudioPlayer     →  Tone.js
├── usePitchDetector   →  getUserMedia → AnalyserNode → pitchy → noteSegmenter.ts
└── useSettings        →  localStorage
```

The note generator uses a strategy pattern (`NoteGenerator` interface) so new exercise types — interval training, minor scales, chromatic sequences — can be added without touching the rest of the app.

### Running Locally

```bash
npm install
npm run dev          # Vite dev server at localhost:5173
npm run build        # Production build → dist/
npm run preview      # Preview the production build
```

### Tests

The project uses TDD throughout. Pure logic (pitch math, note segmentation, scale generation, settings) is tested first with Vitest before implementation.

```bash
npx vitest           # Watch mode
npx vitest run       # Run once
npx vitest run --coverage
```

### Deployment

GitHub Actions builds on push to `main` and deploys to the `gh-pages` branch. The `public/CNAME` file routes `pitch.baldivieso.com` to GitHub Pages. The service worker precaches all assets so the app works offline after the first visit.

---

## Known Limitations

- **iOS Simulator has no microphone.** Pitch detection must be tested on a real device.
- **Background audio is not supported** — the app is foreground-only by design.
- **Desktop mic quality varies.** A headset or condenser mic gives better results than a laptop's built-in mic in a noisy room.
- **Only major scale sequences** in the current version. Other scale modes and interval training are designed into the architecture but not yet exposed.

---

## License

MIT
