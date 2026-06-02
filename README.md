# AI Engineer Melbourne 2026 — My Schedule

A single, self-contained `index.html` that visualises the conference program as a
**track-by-time grid** so you can decide what to attend on **Wed 3** and **Thu 4 June**.

## Open it
Double-click `index.html`, or:

```sh
open index.html
```

No server, no build, no internet required — the full schedule (108 sessions) is embedded
in the file.

## Use it on your phone
AirDrop or email `index.html` to your phone and open it in Safari/Chrome. It works fully
offline, so dodgy conference wifi doesn't matter. Your starred picks are saved on the device.

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

## Refreshing the data
The schedule is baked in as of the embed date shown in the header. Tap **↻ Refresh** (with
wifi) to pull the latest from `https://data.webdirections.org/ai-engineer/sessions.json`;
it falls back to the embedded copy if you're offline.
