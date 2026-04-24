# 🏁 F1 Explorer

An interactive Formula 1 race visualiser built with Astro and Three.js. Select any race from the 2023, 2024, or 2025 season and watch it unfold - drivers move around the track in real time, intervals update live, team radios play at the moment they were spoken, and when the chequered flag drops you get a full podium with the fastest lap.

**Live demo:** [f1-explorer](https://api-k03m.onrender.com/)

---

## The concept

I wanted to build something I'd actually use. I'm a big F1 fan and during every race weekend I'm flicking between the live timing app, the TV feed, and Twitter to piece together what's happening on track. I thought: what if you could scrub through an entire race like a video, with all the timing data, radio messages, and track positions synchronised to that exact moment?

OpenF1 is a free public API that exposes almost everything the official F1 timing feed sends - every location ping of every car, every pit stop, every interval change, every team radio transmission, every race control message. I decided to use all of it.

The app has two main pages:
- **Overview** - a carousel of every race in the selected season with all its sessions
- **Detail** - the track visualiser, which loads when you click a session

---

## What it does

Once you load a session, you get:

### The track
A top-down view of the circuit rendered in WebGL. Each driver is a circle with their team colour as the border and their headshot as the fill. As the timeline plays they move around the track at the speed they actually drove. You can zoom with the scroll wheel, pan by dragging, and click any driver to lock the camera onto them in **focus mode** - the camera follows them and their personal telemetry HUD appears.

### The intervals tower
A live timing tower on the left showing the gap to the leader, tyre compound, and pit stop indicator. Identical to the official F1 timing graphic you see on the broadcast.

### Other towers
Depending on session type you get:
- **On Lap** (practice/qualifying) - shows each driver's current lap time with sector colours
- **Pit Stops** (race) - live feed of pit stop times
- **Overtakes** (race) - chronological list of on-track passes
- **Race Control** - flags, safety cars, DRS enabled messages
- **Comparison** - right-click a driver to add them to the comparison panel, which shows their last 5 lap times as a horizontal bar chart with the tyre compound they were on. Add a second driver and you get a sector-by-sector delta table.

All the towers are resizable (drag the edge) and collapsible (click the − button).

### Weather and team radio
Weather data (track temp, air temp, humidity, wind, rain) updates along the timeline. When a team radio message was transmitted, a popup appears with an audio player of the actual recording.

### Intro videos
I was browsing and found the official F1 theme videos for each season. Instead of a boring loading bar, those play full-screen while the session data fetches. A "Skip Intro" button appears when loading finishes.

### Telemetry HUD
In focus mode a circular gauge shows live speed, RPM, gear, throttle, brake, and DRS status - styled like a real F1 onboard graphic. While the car telemetry is still fetching, a fake progress arc fills from 0% to 92% so you never see a blank "loading" screen.

### Podium
When the race ends, a full podium overlay appears with P1/P2/P3 headshots on stepped platforms in team colours, plus the fastest lap holder in a purple pill below.

### Picture-in-Picture
There's a ⧉ button top-right of the canvas that pops the track and intervals tower out into a floating browser PiP window. Composited live via `captureStream()` so the tower text updates in real time.

---

## Technology

**Astro** for the component structure and static page build. I chose it because it ships very little JavaScript by default but lets me drop in regular `<script>` tags where I need interactivity, which is basically everywhere in the visualiser.

**Three.js** for the WebGL track rendering. Orthographic camera, single `BufferGeometry` for the track line, per-driver `Group` meshes with headshot textures, and raycasting for click detection.

**Vanilla JavaScript** for everything else. The codebase is split across ~20 ES modules - each tower has its own file, data fetching is one module, camera controls another, audio another, and so on. Nothing is compiled beyond what Astro does for TypeScript-less ES modules.

---

## Content API

**[OpenF1](https://openf1.org/)** - a community-run REST API that mirrors the official F1 timing data feed. I use most of its endpoints:

| Endpoint | What I use it for |
|---|---|
| `/sessions` | Calendar, session metadata |
| `/meetings` | Race weekend info |
| `/drivers` | Acronyms, team colours, headshots |
| `/location` | Every car's `x,y,z` coordinate at 4Hz - the track animation |
| `/car_data` | Speed, RPM, throttle, brake, DRS, gear - the telemetry HUD |
| `/intervals` | Gap to leader + gap ahead for the timing tower |
| `/position` | Driver position at each moment |
| `/session_result` | Final classification + fastest lap holder |
| `/laps` | Lap times, sector times, start times |
| `/stints` | Tyre compound per stint |
| `/pit` | Pit stop timings |
| `/overtakes` | On-track passes |
| `/race_control` | Flags, safety car, DRS, pit entry messages |
| `/weather` | Temps, humidity, wind, rain |
| `/team_radio` | Audio recordings with timestamps |

The location data is the big one - for a 90-minute race you're fetching ~400,000 points across 20 drivers. I do it in 4 parallel time-windowed chunks with rate limiting (3 requests/sec, 28/min, auto-retry on 429) to stay within their published limits.

---

## Web APIs

I used a lot of Web APIs. The key ones for grading:

### WebGL API
The track renderer is pure WebGL via Three.js. Every frame draws the track line, the driver dots with their headshot textures, and the fading driver trails (built from vertex colours on a `BufferGeometry`).

### Canvas API
The telemetry HUD is a 2D canvas with `getContext('2d')`. Every frame I draw the background circle, the RPM arc, the throttle/brake bars, the speed number, and the DRS indicator. The loading state has a fake progress arc that fills 0→92% over ~3 seconds using an ease-out curve so there's never a blank screen.

A second canvas is used for the Picture-in-Picture composite - I take the WebGL canvas output with `drawImage()`, then redraw the interval tower rows as 2D text next to it, and stream the combined canvas to a hidden `<video>` element for PiP.

### Picture-in-Picture API
The PiP button calls `canvas.captureStream(30)` on the composite canvas, feeds the stream into a video element, waits for `canplay`, then calls `requestPictureInPicture()`. Works in Chrome/Edge. Mobile gets the button hidden because PiP is unreliable there.

### Web Audio API
Team radio uses `new Audio()` for the recordings. The Max Verstappen easter egg (type "max" anywhere) uses `AudioContext` + `GainNode` to amplify the horn sample by 3× over normal volume.

### HTMLVideoElement
The season intro videos (`2023-F1.mp4` etc.) play full-cover over the canvas during loading. I wait for the `ended` event before revealing the session, or the user can click "Skip Intro" once the data is ready.

### requestAnimationFrame
The main animation loop - advances simulated race time, updates driver positions, redraws trails, throttles tower re-renders to every 500ms. Returns a `destroy()` function that calls `cancelAnimationFrame` so the old loop dies cleanly when you load a new session.

### CustomEvent
The calendar dispatches a `session-changed` event on the window. The visualiser listens for it and loads the new session. Decouples the two components nicely.

### Touch Events
The race calendar carousel and the tower resize handles both support touch drag alongside mouse events, so it works on tablets.

### DOM API
All the towers are built entirely via `createElement` / `appendChild` - no template literals being injected, no framework. The tower builders each export a single `update(time, containerEl, data, driverInfoMap, ...)` function that the animation loop calls.

---

## Process

### Week 1 - data pipeline
Started by just seeing what OpenF1 returns for a single session. Rate limits are strict so I wrote `apiFetch()` first - a wrapper that tracks the request history and waits out 429 responses. Then built the session and driver fetchers and verified I could at least render a driver list.

### Week 2 - the track
Hardest single problem: OpenF1's `/location` endpoint gives you per-driver coordinates in arbitrary units, not normalised to a track shape. I had to:
1. Fetch location data for all drivers in parallel 4-way time chunks
2. Find the driver with the most location points (usually the leader who ran the longest)
3. Use their points as the track geometry line
4. Normalise all coordinates to a common centre/scale
5. Render driver dots at their `x,y` with linear interpolation between timestamps

### Week 3 - towers and timing
Built the intervals tower first. Then live-lap for practice/qualifying, pit stops, overtakes, race control, driver comparison. Each one its own module that exports an `update()` function the main loop calls. The interval data is pre-sorted by timestamp so I binary-search the right entry for the current sim time.

### Week 4 - polish and Web APIs
This is where most of the fun stuff happened. Focus mode with camera follow, PiP, the intro videos, the podium screen, the easter egg, responsive layout for smaller screens, resizable towers, the HTML/CSS lap comparison chart. The fake 0→92% telemetry loading bar was a last-minute fix because the real load takes a few seconds and a blank screen felt broken.

### Things that broke and how I fixed them

- **Animation loop kept running after loading a new session** - multiple loops stacked on top of each other, track got laggy. Fixed by having `setupPlayback` return a `destroy()` that calls `cancelAnimationFrame`, and calling it before every new load.

- **PiP `AbortError: play() request interrupted by new load`** - had to `await` the video's `canplay` event before calling `play()` on a fresh `srcObject`.

- **Canvas went tiny in top-left when I made it responsive** - tried `aspect-ratio: 4/3` with `ResizeObserver`, Three.js kept fighting the CSS. Fixed by keeping the renderer at fixed 800×600 internally and stretching the canvas element via CSS (`width:100% !important`) with the classic `padding-bottom: 75%` trick.

- **Tyre compound showed wrong stint's tyres** - my stint matching logic was using inclusive ranges with off-by-one errors around pit laps. Switched to matching on `lap_end === pitLap` which was closer to what actually happens in the data.

- **Team radio cached `ERR_CACHE_READ_FAILURE`** - adding `?_=${Date.now()}` to the URL fixed it.

- **Loading screen showed over an empty Three.js canvas** - the initial approach hid the WebGL canvas behind a sprite, but when the sprite was removed the canvas was still black because I'd cleared the scene. Restructured to build the scene first, then reveal it.

---

## Sources and AI usage

I used Claude (Anthropic's AI) as a coding assistant throughout this project. It was particularly useful for:
- Writing the rate-limited `apiFetch` helper
- Getting the raycasting math right for click detection on the 3D dots
- Debugging why PiP was throwing `AbortError`
- Writing the initial skeleton of the driver trail overlay with vertex-coloured geometry
- General CSS refactoring (the responsive breakpoints are largely AI-suggested)

Where it suggested an approach, I read through it, understood it, then mostly rewrote it in my own style and adjusted for the specifics of my codebase. All architectural decisions - splitting into modules, the tower system, the separation of data / scene / camera / playback - are mine. The animation loop, the coordinate normalisation for the track, the interval matching logic, the lap chart, the podium layout, and all the easter eggs were written by me.

### Other sources

- **OpenF1 API docs** - https://openf1.org/
- **Three.js docs** - https://threejs.org/docs/
- **MDN Web Docs** - for all the Web API references, especially PiP, captureStream, and AudioContext
- **F1 team logos** - Formula1.com media CDN
- **Driver headshots** - served by OpenF1
- **F1 intro theme videos** - downloaded by me for the loading screen



## 1/2 april 2026

### What did i do
- Added base astro
- added base api fetching
- added driver selecting
- added threejs
- added pan an zoom
- added initaial driver position
- added animation for frist car
- Made dot move at correct speed
- Added change speed button


### How long did it take
- 2 hours for base astro and api fetching
- 1 hour for driver selecting
- 2 hours for threejs and pan and zoom
- 1 hour for initial driver position
- 2 hours for animation for first car
- 1 hour for making dot move at correct speed
- 1 hour for adding change speed button

### What did i learn
- I learned how to use astro and how to fetch data from an api
- I learned how to use threejs and how to create a basic scene
- I learned how to animate objects in threejs
- I learned how to use setTimeout to change the speed of the animation
- I learned how to use useState and useEffect in astro

## 8/9 april 2026

### What did i do
- added track selection
- added stationary cars to be removed
- added intercals
- added quallifying
- added race
- split files
- added race calender
- updated race calender
- added sector times
- added weather
- added radio

### How long did it take
- 2 hours for track selection
- 1 hour for stationary cars to be removed
- 2 hours for adding intervals
- 1 hour for adding qualifying
- 1 hour for adding race
- 1 hour for splitting files
- 2 hours for race calendar
- 1 hour for sector times
- 1 hour for weather
- 1 hour for radio

### What did i learn
- I learned how to split a larger project into smaller files and keep the code easier to maintain
- I learned how to build track selection so users can switch context without changing the whole app
- I learned how to handle race-specific states like qualifying, race mode, and stationary cars
- I learned how to calculate and show intervals and sector times from live timing data
- I learned how to connect race calendar and weather data to make the visualisation more complete
- I learned that updating and refining features (like the race calendar) improves usability over time


## 22/23 april 2026

### What did i do
- made load time faster
- fixed audio
- fixed loading screen
- added pit tower
- added team car to side of interval
- added driver headshots to car dots
- added overtakes tower
- added car telemetry popup
- split files
- added race control tower
- added lines behind cars to show where they have been
- added pinning camera to a driver
- made previous session delete itself when new session is loaded
- added driver comparision mode
- added intro instead of loading screen
- added skip button to intro
- added podium
- added PiP

### How long did it take
- 2 hours
- 1 hour
- 1 hour
- 2 hours
- 1 hour
- 1 hour
- 2 hours
- 1 hour
- 1 hour
- 1 hour
- 1 hour
- 1 hour
- 1 hour
- 1 hour
- 1 hour
- 30 minutes
- 2 hours
- 1 hour

### What did i learn
- I learned how to optimize load times by only fetching necessary data and using caching where possible
- I learned how to implement audio playback and controls for team radios
- I learned how to create a dynamic loading screen that updates with progress
- I learned how to build a pit stop tower that shows pit stop details and timings
- I learned how to enhance the interval tower by adding team cars and driver headshots for better visual identification
- I learned how to create an overtakes tower that tracks position changes throughout the session
- I learned how to build a car telemetry popup that shows live data like speed, throttle, and brake status when clicking on a driver dot
- I learned how to implement a race control tower that displays important messages and flags during the session
- I learned how to add motion trails behind cars to visualize their recent path on the track
- I learned how to implement a camera system that can be pinned to a specific driver for a focused view of their performance
- I learned how to manage state and cleanup when switching between sessions to prevent memory leaks and ensure a smooth user experience
- I learned how to create a driver comparison mode that allows users to select two drivers and compare their lap times, sector times, and telemetry data side by side for deeper analysis
- I learned how to create an engaging intro sequence that plays before the session loads, and how to add a skip button for users who want to jump straight to the action
- I learned how to design and implement a podium screen that celebrates the top finishers at the end of the race
- I learned how to implement Picture-in-Picture (PiP) mode to allow users to watch








# Web APIs Used

## Core

### [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
All data requests to OpenF1 are made through `fetch()`. The custom `apiFetch()` wrapper adds rate limiting and automatic retry on 429 responses.

### [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
Powers team radio playback via `new Audio()`. Handles play/pause, progress tracking, and auto-dismiss when audio ends.

---

## Graphics

### [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
Used for the loading screen - a `<canvas>` element is drawn to with `getContext('2d')` and `fillText()`, then fed into Three.js as a `CanvasTexture` to display loading progress on the 3D scene.

### [WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
The track renderer is built on WebGL via Three.js. Handles the track line geometry, driver dot meshes, headshot textures, orthographic camera, and the render loop.

---

## UI & Interaction

### [DOM API](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)
All tower rows (intervals, live lap, pit stops) are built by dynamically creating and appending elements with `createElement()`, `appendChild()`, and `innerHTML`.

### [EventTarget / addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
Used throughout for user interaction - timeline scrubber input, play/pause button clicks, mouse wheel zoom, and mouse drag panning on the track canvas.

### [AnimationFrame API](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
Drives the main animation loop. Each frame advances the simulated race time, updates driver dot positions, and throttles tower re-renders to every 500ms.

---

## Timing

### [setTimeout / clearTimeout](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout)
Used for auto-dismissing the team radio popup after 15 seconds (or 3 seconds after audio ends).