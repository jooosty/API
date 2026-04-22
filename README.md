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










# Web APIs Used

## Core

### [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
All data requests to OpenF1 are made through `fetch()`. The custom `apiFetch()` wrapper adds rate limiting and automatic retry on 429 responses.

### [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
Powers team radio playback via `new Audio()`. Handles play/pause, progress tracking, and auto-dismiss when audio ends.

---

## Graphics

### [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
Used for the loading screen — a `<canvas>` element is drawn to with `getContext('2d')` and `fillText()`, then fed into Three.js as a `CanvasTexture` to display loading progress on the 3D scene.

### [WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
The track renderer is built on WebGL via Three.js. Handles the track line geometry, driver dot meshes, headshot textures, orthographic camera, and the render loop.

---

## UI & Interaction

### [DOM API](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)
All tower rows (intervals, live lap, pit stops) are built by dynamically creating and appending elements with `createElement()`, `appendChild()`, and `innerHTML`.

### [EventTarget / addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
Used throughout for user interaction — timeline scrubber input, play/pause button clicks, mouse wheel zoom, and mouse drag panning on the track canvas.

### [AnimationFrame API](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
Drives the main animation loop. Each frame advances the simulated race time, updates driver dot positions, and throttles tower re-renders to every 500ms.

---

## Timing

### [setTimeout / clearTimeout](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout)
Used for auto-dismissing the team radio popup after 15 seconds (or 3 seconds after audio ends).