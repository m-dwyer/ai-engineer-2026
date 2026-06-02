# AI Engineer Melbourne 2026 - My Schedule

A Vite + React + TypeScript schedule app for AI Engineer Melbourne 2026.
It keeps the practical track-by-time grid and adds a prototype 3D view for exploring
tracks and talks across time.

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

The app builds to static files in `dist/` and is configured for GitHub Pages.

## What it does
- **Tracks as columns, time top→bottom.** Each block is sized by its duration and tagged with
  its room (Cinema 1/2, Gandel, Swinburne). Switch between Wed/Thu with the day tabs.
- **Click any talk** → a panel with the full description, speaker(s) + links, themes, and
  related sessions.
- **★ Star your picks** (tap the star) — they're highlighted and saved in the browser.
- **⚠ Clash detection** — if two starred talks overlap, a banner lists the conflict so you
  can choose.
- **Filter** by track (the coloured chips) or theme (the dropdown) to focus.
- **Full-width bands** mark venue-wide events: registration, lunch, breaks, reception, dinners.
- A red **“now” line** appears on the current day during the event.
- **3D prototype** shows tracks as lanes and talks as blocks in a Three.js scene.

## Refreshing the data
The schedule is baked in as of the embed date shown in the header. Tap **Refresh** (with
wifi) to pull the latest from `https://data.webdirections.org/ai-engineer/sessions.json`;
it falls back to the embedded copy if you're offline.

## Test

```sh
npm run test
npm run test:e2e
```
