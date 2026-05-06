/**
 * easter-eggs.js
 *
 * Call setupEasterEggs(driverInfoMap, driverDots, allDriverLocationData)
 * once session data has loaded. This wires up all keyboard triggers.
 *
 * Triggers that don't need driver data (e.g. "max") are also registered here
 * so everything is in one place.
 */

import { setupWhoEasterEgg } from './easter-egg-who.js';

// ── Helper: play a sound loud via Web Audio API gain boost ────
function playLoud(src, gainValue = 3.0) {
    const audio  = new Audio(src);
    audio.volume = 1.0;
    try {
        const ctx    = new (window.AudioContext || window.webkitAudioContext)();
        const source = ctx.createMediaElementSource(audio);
        const gain   = ctx.createGain();
        gain.gain.value = gainValue;
        source.connect(gain);
        gain.connect(ctx.destination);
    } catch (e) {
        // Web Audio unavailable — plain audio still plays at full volume
    }
    audio.play().catch(() => {});
}

// ── Static triggers (no driver data needed) ───────────────────
const STATIC_TRIGGERS = [
    {
        word:   'max',
        action: () => playLoud('/sounds/tu-tu-tu-du-max-verstappen.mp3', 3.0),
    },
    // Add more static easter eggs here
];

// Register static triggers immediately on import
{
    const MAX_LEN = Math.max(...STATIC_TRIGGERS.map(t => t.word.length));
    let buffer = '';
    window.addEventListener('keydown', (e) => {
        if (e.key.length !== 1) return;
        buffer = (buffer + e.key.toLowerCase()).slice(-MAX_LEN);
        for (const { word, action } of STATIC_TRIGGERS) {
            if (buffer.endsWith(word)) { buffer = ''; action(); break; }
        }
    });
}

// ── Dynamic triggers (need driver data) ──────────────────────
export function setupEasterEggs(driverInfoMap, driverDots, allDriverLocationData) {
    const who = setupWhoEasterEgg(driverInfoMap, driverDots, allDriverLocationData);

    const DYNAMIC_TRIGGERS = [
        { word: 'who', action: () => who.toggle() },
        // Add more driver-aware easter eggs here
    ];

    const MAX_LEN = Math.max(...DYNAMIC_TRIGGERS.map(t => t.word.length));
    let buffer = '';

    window.addEventListener('keydown', (e) => {
        if (e.key.length !== 1) return;
        buffer = (buffer + e.key.toLowerCase()).slice(-MAX_LEN);
        for (const { word, action } of DYNAMIC_TRIGGERS) {
            if (buffer.endsWith(word)) { buffer = ''; action(); break; }
        }
    });
}