# Pokédex

An interactive, animated Pokédex built with React. Type a Pokémon's name or National Dex number into a stylized handheld device. It scans, its doors slide open, a flash of light fills the screen, and a frosted-glass Pokédex entry appears with the Pokémon's artwork, stats and cry.

### 🔗 Live demo: **https://aysh-mzmdr.github.io/Pokedex/**

---

## Project Summary

The app is a single-page React application that pulls live data from [PokéAPI](https://pokeapi.co/). It's designed to feel like a physical gadget rather than a search form. The whole UI is a Pokédex shell drawn entirely in CSS (lens, indicator lights, speaker grille, D-pad, A/B buttons, screws and hinges), and you operate it with those controls. Every interaction has a matching sound effect synthesized in real time with the Web Audio API. The app ships no audio files of its own; the only recorded sounds are the official Pokémon cries streamed from PokéAPI.

## Tech stack

| Layer | Technology |
| --- | --- |
| UI framework | **React 19** (function components and hooks) |
| Build tool / dev server | **Vite 7** with `@vitejs/plugin-react` |
| Styling | Hand-written **CSS3**: 3D transforms, keyframe animations, `backdrop-filter` glassmorphism, gradients |
| Audio | **Web Audio API** for synthesized SFX, `HTMLAudioElement` for Pokémon cries |
| Data | **PokéAPI** REST endpoints (`/pokemon` and `/pokemon-species`) |
| Hosting / CI | **GitHub Pages**, deployed with the `gh-pages` package |

No UI component libraries, no animation libraries, no audio assets. Everything visual and audible is built from scratch.

## Features

### Searching
- **Search by name or ID**: enter `pikachu` or `25`, and input is capped at 12 characters.
- **D-pad navigation**: the up and down arrows add or subtract 1 from the Dex number in the input box.
- **A / B buttons**: the yellow button resets the input and the blue button runs the search. Pressing Enter in the input also runs the search.
- **Visual feedback on the lens**: it pulses blue while scanning and flashes red when no entry is found.
- **In-app manual**: a `?` button opens a legend that explains what each control does.

### The reveal
- **Cinematic opening sequence**: the doors slide apart in 3D, a core light charges up, and a white flash burst leads into the glass Pokédex.
- **Rescan**: plays the sequence in reverse and returns you to the closed device.
- **Next**: steps to the next Dex entry without closing the Pokédex, and wraps back to #001 after the last one.

### The Pokédex entry
- Official artwork with a floating animation and a scan-line overlay
- Dex number, name, category ("Mouse Pokémon"), and colour-coded type badges for all 18 types
- English Pokédex flavour text
- Height, weight, abilities (hidden abilities are labelled), and male/female gender ratio or "Genderless"
- All six base stats drawn as animated bars
- **Pokémon cry**: plays automatically when the entry appears. You can replay it with the speaker button, which animates while the cry plays.

### Sound design
All sound effects are synthesized in the browser (`src/sounds.js`):
- **Typing**: marimba-like plucks that climb a C-major pentatonic scale, so fast typing still sounds musical. Deleting plays a falling tone.
- **Buttons**: a two-tone confirmation blip.
- **D-pad**: a mechanical click whose pitch depends on direction.
- **Scanning**: a looping radar sweep timed to the lens's 1-second glow pulse.
- **Error**: a continuous buzz modulated by an LFO that lasts as long as the lens stays red.
- **Doors opening**: a filtered-noise whoosh with a rising tone.
- **Flash burst**: a low thump, a downward swoosh and a shimmering chord.

### Responsive
The layout adapts to phone-sized screens (`max-width: 640px`).

## Engineering highlights

### 1. Race-condition-safe data fetching
Searches are asynchronous, so an older request can finish after a newer one and overwrite it on screen. Each search, "Next" press and "Rescan" increments a counter stored in a ref (`requestId`). When a response arrives, it's applied only if its ID still matches the current counter. Stale responses are dropped, so only the most recent request can update the UI, whatever order the network returns them in.

### 2. Animation modelled as a state machine
The reveal is not a single CSS class toggle. It's a sequence of phases the app keeps in state: `CLOSED → OPENING → FLASH → GLASS`. Each phase has a fixed duration (`OPEN_DELAY`, `DOOR_TRANSITION`, `FLASH_DURATION`). A small `runSequence` helper schedules all the timers and cancels any sequence already in progress, so overlapping transitions can't pile up. Because the phase is real state, the rest of the app can depend on it:
- controls are disabled mid-animation,
- the lens state and sounds follow the current phase,
- the cry plays exactly when the glass view appears,
- closing the device invalidates any fetch still in flight.

### 3. A procedural audio engine with no asset files
`sounds.js` is a small synthesizer built on the Web Audio API:
- **One shared `AudioContext`**, created lazily, routed through a master gain and a `DynamicsCompressor` that acts as a limiter so stacked sounds don't clip.
- **Reusable primitives**: `tone()` for enveloped oscillators with optional pitch glides, and `noiseSweep()` for band-passed white noise with a moving filter cutoff. A single cached noise buffer is shared by every noise sound.
- **Clean-stopping loops**: looping sounds (scan, error buzz) play through their own gain "bus". Stopping one fades the bus out over about 60 ms and then disconnects it. This also cuts off notes that were already scheduled ahead, which avoids clicks and stray sounds.
- **An LFO-modulated buzz**: detuned sawtooth and square oscillators pass through a gain gate driven by a 2 Hz LFO, then through a low-pass filter.

### 4. Working with browser autoplay rules
Browsers block audio until the user interacts with the page. The app registers one-shot `pointerdown` and `keydown` listeners that create or resume the `AudioContext` on the first interaction. That makes later sounds triggered by async code, such as the cry after a fetch resolves, allowed to play.

### 5. Leak-free effect lifecycle
Every side effect is written as a `useEffect` that cleans up after itself:
- Each new Pokémon's cry is created as a preloaded `Audio` object. The effect's cleanup pauses it and removes its `play`, `pause` and `ended` listeners, so searching many Pokémon in one session doesn't leave old audio objects in memory.
- `startScan()` and `startBuzz()` return stop functions that are used directly as effect cleanups, which ties the sound's lifetime to the UI state that triggered it.
- Global gesture listeners and pending timers are removed on unmount.

### 6. Data normalisation layer
`fetchPokemon()` combines two PokéAPI calls (the Pokémon and its species) into one clean view model:
- unit conversion (decimetres → metres, hectograms → kilograms),
- zero-padded Dex IDs,
- `kebab-case` → Title Case formatting,
- English-only flavour text with PokéAPI's stray form-feed and newline characters stripped,
- gender ratio calculated from PokéAPI's eighths-based `gender_rate`,
- fallback chains for artwork (official artwork → default sprite) and cries (latest → legacy).

If the species request fails, the entry still renders with sensible placeholder text.

### 7. Pure-CSS 3D hardware
The whole device is built from HTML and CSS: `perspective` and `preserve-3d` for the doors, layered radial gradients for the lens, and more than 20 keyframe animations (idle glow, lens pulses, scan lines, core burst, glass entry, image float, cry sound waves). The result screen uses `backdrop-filter` glassmorphism over animated ambient colour blobs.

### 8. Accessibility touches
Icon-only controls have `aria-label`s, decorative SVGs are `aria-hidden`, controls are properly `disabled` when they can't be used, and the search is a real `<form>`, so it works from the keyboard.

### 9. Deployment pipeline
Vite is configured with `base: "/Pokedex/"` for GitHub Pages. `npm run deploy` runs a `predeploy` build and then publishes `dist/` to the `gh-pages` branch.

## Getting started

```bash
git clone https://github.com/ayshmzmdr/Pokedex.git
cd Pokedex
npm install
npm run dev        # start the dev server
npm run build      # production build to dist/
npm run preview    # preview the production build
npm run lint       # run ESLint
npm run deploy     # build and publish to GitHub Pages
```

## Project structure

```
Pokedex/
├── public/
│   └── Pokedex.png      # favicon
├── src/
│   ├── App.jsx          # UI, phase state machine, data fetching, cry playback
│   ├── sounds.js        # Web Audio synthesizer for all sound effects
│   ├── index.css        # device shell, 3D doors, animations, glass UI
│   └── main.jsx         # React entry point
├── index.html
└── vite.config.js       # React plugin and GitHub Pages base path
```

## Credits

- Pokémon data, artwork and cries: [PokéAPI](https://pokeapi.co/)
- Pokémon and Pokédex are trademarks of Nintendo, Game Freak and The Pokémon Company. This is a non-commercial fan project.
