/**
 * easter-eggs.js
 */

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

// ── Keyword listener ──────────────────────────────────────────
const TRIGGERS = [
    {
        word:   'max',
        action: () => playLoud('/sounds/tu-tu-tu-du-max-verstappen.mp3', 3.0),
    },
    // Add more easter eggs here, e.g:
    // { word: 'senna', action: () => playLoud('/sounds/senna.mp3') },
];

const MAX_LEN = Math.max(...TRIGGERS.map(t => t.word.length));
let buffer = '';

window.addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return; // ignore modifier keys
    buffer = (buffer + e.key.toLowerCase()).slice(-MAX_LEN);

    for (const { word, action } of TRIGGERS) {
        if (buffer.endsWith(word)) {
            buffer = '';
            action();
            break;
        }
    }
});
