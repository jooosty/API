/**
 * track-radio.js
 * Team radio popup logic.
 */

export function setupRadio(driverInfoMap) {
    let radioIndex       = 0;
    let currentAudio     = null;
    let dismissTimer     = null;
    let lastRadioSimTime = -Infinity;

    const radioPopup    = document.getElementById('radio-popup');
    const radioDot      = document.getElementById('radio-dot');
    const radioAcronym  = document.getElementById('radio-acronym');
    const radioPlayBtn  = document.getElementById('radio-play-btn');
    const radioProgress = document.getElementById('radio-progress-bar');
    const radioTimeEl   = document.getElementById('radio-time');
    const radioClose    = document.getElementById('radio-close');

    function fmtAudioTime(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    function dismiss() {
        if (currentAudio) { currentAudio.pause(); currentAudio = null; }
        if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
        if (radioPopup) radioPopup.classList.add('hidden');
    }

    function show(entry) {
        const info = driverInfoMap[entry.driver_number] || { acronym: '#' + entry.driver_number, colour: '#fff' };
        radioDot.style.background = info.colour;
        radioAcronym.textContent  = info.acronym;
        radioProgress.style.width = '0%';
        radioTimeEl.textContent   = '0:00';
        radioPlayBtn.textContent  = '▶ Play';

        if (currentAudio) { currentAudio.pause(); currentAudio = null; }
        const audio = new Audio(entry.recording_url + '?_=' + Date.now());
        currentAudio = audio;

        audio.addEventListener('timeupdate', () => {
            if (!audio.duration) return;
            radioProgress.style.width = (audio.currentTime / audio.duration * 100) + '%';
            radioTimeEl.textContent   = fmtAudioTime(audio.currentTime);
        });
        audio.addEventListener('ended', () => {
            radioPlayBtn.textContent  = '▶ Play';
            radioProgress.style.width = '100%';
            dismissTimer = setTimeout(dismiss, 3000);
        });
        audio.addEventListener('play',  () => { radioPlayBtn.textContent = '⏸ Pause'; });
        audio.addEventListener('pause', () => { radioPlayBtn.textContent = '▶ Play'; });
        radioPlayBtn.onclick = () => { audio.paused ? audio.play() : audio.pause(); };

        radioPopup.classList.remove('hidden');
        audio.play().catch(() => {});
        if (dismissTimer) clearTimeout(dismissTimer);
        dismissTimer = setTimeout(dismiss, 15000);
    }

    radioClose?.addEventListener('click', dismiss);

    function check(t, allRadioData) {
        if (t < lastRadioSimTime - 5000) { radioIndex = 0; dismiss(); }
        lastRadioSimTime = t;
        while (radioIndex < allRadioData.length) {
            const entry  = allRadioData[radioIndex];
            const entryT = new Date(entry.date).getTime();
            if (entryT <= t) { show(entry); radioIndex++; break; }
            else break;
        }
    }

    return { check, dismiss };
}
