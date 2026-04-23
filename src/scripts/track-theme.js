/**
 * track-theme.js
 *
 * Plays the F1 theme music during session loading.
 * Themes are stored in /public/themes/ and named:
 *   2023-F1.mp4
 *   2024-F1.mp4
 *   2025-F1.mp4
 *
 * The theme matching the session year is played (falling back to 2025).
 * Music fades out when loading completes.
 */

const THEMES = {
    2023: '/themes/2023-F1.mp4',
    2024: '/themes/2024-F1.mp4',
    2025: '/themes/2025-F1.mp4',
};

const DEFAULT_THEME = '/themes/2025-F1.mp4';
const FADE_DURATION = 1200; // ms to fade out

let currentThemeAudio = null;
let fadeInterval      = null;

/**
 * Start playing the theme for the given year.
 * @param {number|string} year  — session year (e.g. 2024)
 */
export function playTheme(year) {
    stopTheme(); // stop any previous theme immediately

    const src = THEMES[Number(year)] || DEFAULT_THEME;
    const audio = new Audio(src);
    audio.volume = 0.55;
    audio.loop   = true;

    // Fade in from silence
    audio.volume = 0;
    audio.play().catch(() => {
        // Autoplay blocked — silently ignore, the load will just be quiet
    });

    let vol = 0;
    const fadeIn = setInterval(() => {
        vol = Math.min(vol + 0.05, 0.55);
        audio.volume = vol;
        if (vol >= 0.55) clearInterval(fadeIn);
    }, 60);

    currentThemeAudio = audio;
}

/**
 * Fade out and stop the currently playing theme.
 */
export function stopTheme() {
    if (fadeInterval) { clearInterval(fadeInterval); fadeInterval = null; }
    if (!currentThemeAudio) return;

    const audio = currentThemeAudio;
    currentThemeAudio = null;

    let vol = audio.volume;
    fadeInterval = setInterval(() => {
        vol = Math.max(vol - 0.05, 0);
        audio.volume = vol;
        if (vol <= 0) {
            clearInterval(fadeInterval);
            fadeInterval = null;
            audio.pause();
            audio.src = '';
        }
    }, FADE_DURATION / (vol / 0.05));
}
