/**
 * track-playback.js
 * Timeline scrubber, animation loop, weather overlay and tower dispatch.
 */
import { updatePracticeTower }   from './tower-practice.js';
import { updateQualifyingTower } from './tower-qualifying.js';
import { updateRaceTower }       from './tower-race.js';
import { updateLiveLapTower }    from './tower-live-lap.js';
import { buildPitTowerState, updatePitTower } from './tower-pit.js';
import { updateOvertakeTower }   from './tower-overtakes.js';
import { updateRaceControlTower } from './tower-race-control.js';

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
}

function updateWeather(t, allWeatherData) {
    if (allWeatherData.length === 0) return;
    let wx = allWeatherData[0];
    for (const entry of allWeatherData) {
        if (new Date(entry.date).getTime() <= t) wx = entry;
        else break;
    }
    const windDir = typeof wx.wind_direction === 'number'
        ? ['N','NE','E','SE','S','SW','W','NW'][Math.round(wx.wind_direction / 45) % 8]
        : '—';

    document.getElementById('wx-track').textContent  = wx.track_temperature != null ? wx.track_temperature.toFixed(1) + '°' : '—';
    document.getElementById('wx-air').textContent    = wx.air_temperature   != null ? wx.air_temperature.toFixed(1)   + '°' : '—';
    document.getElementById('wx-humid').textContent  = wx.humidity          != null ? wx.humidity.toFixed(0)           + '%' : '—';
    document.getElementById('wx-wind').textContent   = wx.wind_speed        != null ? wx.wind_speed.toFixed(1) + ' ' + windDir : '—';
    const rainEl = document.getElementById('wx-rain');
    if (rainEl) {
        const raining = wx.rainfall === true || wx.rainfall === 1;
        rainEl.textContent   = raining ? 'WET' : 'DRY';
        rainEl.style.background  = raining ? '#1a3a5c' : '#1a2a1a';
        rainEl.style.color       = raining ? '#4a9eff' : '#4caf50';
        rainEl.style.borderColor = raining ? '#4a9eff' : '#4caf50';
    }
}

export function setupPlayback({ scene, camera, renderer, driverDots, allDriverLocationData, allLapData, allStintData, allIntervalData, allPositionData, allPitData, allOvertakeData, allRaceControlData = [], allWeatherData, allRadioData, driverInfoMap, dnfDrivers, isPractice, isQualifying, qualPhaseBoundaries, radio, telemetry }) {
    const stintsByDriver = buildPitTowerState(allStintData);

    const firstLocationTime = Math.min(...allDriverLocationData.map(d => new Date(d.points[0].date).getTime()));
    const firstLapTime = allLapData.length > 0
        ? Math.min(...allLapData.filter(l => l.date_start).map(l => new Date(l.date_start).getTime()))
        : Infinity;
    const earliestTime  = firstLapTime < Infinity ? Math.max(firstLocationTime, firstLapTime - 60_000) : firstLocationTime;
    const latestTime    = Math.max(...allDriverLocationData.map(d => new Date(d.points[d.points.length - 1].date).getTime()));
    const totalDuration = latestTime - earliestTime;

    let simulatedTime = earliestTime;
    let isPlaying = true, isScrubbing = false, lastRealTime = null;

    const timelineScrubber = document.getElementById('timeline-scrubber');
    const timeDisplay      = document.getElementById('time-display');
    const timeTotal        = document.getElementById('time-total');
    timelineScrubber.disabled = false;
    timeTotal.textContent = formatTime(totalDuration);

    // ── Stationary detection ──────────────────────────────────
    const STATIONARY_HIDE_MS = 2 * 60 * 1000, STATIONARY_MOVE_THRESHOLD = 5;
    function isDriverStationary(driverDot, idx) {
        const cur    = driverDot.rawPoints[idx];
        const cutoff = new Date(cur.date).getTime() - STATIONARY_HIDE_MS;
        let lookback = idx;
        while (lookback > 0 && new Date(driverDot.rawPoints[lookback].date).getTime() > cutoff) lookback--;
        const past = driverDot.rawPoints[lookback];
        return Math.sqrt((cur.x - past.x) ** 2 + (cur.y - past.y) ** 2) < STATIONARY_MOVE_THRESHOLD;
    }

    // ── Tower dispatch ────────────────────────────────────────
    function updateIntervalTower(t) {
        const intervalRows = document.getElementById('interval-rows');
        if (!intervalRows) return;
        const phaseEl      = document.getElementById('phase-indicator');
        const lapCounterEl = document.getElementById('lap-counter');

        if (isPractice) {
            if (phaseEl) phaseEl.textContent = '';
            if (lapCounterEl) lapCounterEl.textContent = '';
            updatePracticeTower(t, intervalRows, allLapData, driverInfoMap);
        } else if (isQualifying) {
            if (lapCounterEl) lapCounterEl.textContent = '';
            updateQualifyingTower(t, intervalRows, allLapData, qualPhaseBoundaries, driverInfoMap);
        } else {
            if (phaseEl) phaseEl.textContent = '';
            if (lapCounterEl && allLapData.length > 0) {
                const completed  = allLapData.filter(l => l.date_start && l.lap_duration && new Date(l.date_start).getTime() + l.lap_duration * 1000 <= t);
                const currentLap = completed.length > 0 ? Math.max(...completed.map(l => l.lap_number)) : 0;
                const totalLaps  = Math.max(...allLapData.map(l => l.lap_number || 0));
                lapCounterEl.textContent = currentLap > 0 ? `L${currentLap}${totalLaps > 0 ? '/' + totalLaps : ''}` : '';
            }
            updateRaceTower(t, intervalRows, allIntervalData, allPositionData, driverInfoMap, dnfDrivers, allStintData, telemetry.getSelectedDriver(), telemetry.select);
        }

        if (isPractice || isQualifying) {
            const liveTower = document.getElementById('live-lap-tower');
            if (liveTower) liveTower.style.display = 'block';
            const liveRows = document.getElementById('live-lap-rows');
            if (liveRows) updateLiveLapTower(t, liveRows, allLapData, allStintData, driverInfoMap);
        } else {
            const liveTower = document.getElementById('live-lap-tower');
            if (liveTower) liveTower.style.display = 'none';
        }

        updateWeather(t, allWeatherData);
        radio.check(t, allRadioData);
        updatePitTower(t, document.getElementById('pit-tower-rows'), allPitData, stintsByDriver, driverInfoMap);
        updateOvertakeTower(t, document.getElementById('overtake-rows'), allOvertakeData, driverInfoMap, allLapData);
        updateRaceControlTower(t, document.getElementById('race-control-rows'), allRaceControlData, driverInfoMap);
        telemetry.update(t);
    }

    // ── Scrubber ──────────────────────────────────────────────
    function updateAllDriversToTime(targetTime) {
        for (const d of driverDots) {
            if (new Date(d.rawPoints[d.index].date).getTime() > targetTime) d.index = 0;
            while (d.index < d.rawPoints.length - 1 && new Date(d.rawPoints[d.index + 1].date).getTime() < targetTime) d.index++;
            const p = d.mappedPoints[d.index];
            d.dotMesh.position.set(p.x, p.y, 1);
            d.dotMesh.visible = !isDriverStationary(d, d.index);
        }
        const elapsed = targetTime - earliestTime;
        timeDisplay.textContent = formatTime(elapsed);
        timelineScrubber.value  = String(Math.round((elapsed / totalDuration) * 1000));
        updateIntervalTower(targetTime);
        renderer.render(scene, camera);
    }

    timelineScrubber.addEventListener('mousedown', () => {
        isScrubbing = true; isPlaying = false; lastRealTime = null;
        document.getElementById('play-pause-button').textContent = 'Play';
        radio.dismiss();
    });
    timelineScrubber.addEventListener('input', () => {
        simulatedTime = earliestTime + (Number(timelineScrubber.value) / 1000) * totalDuration;
        updateAllDriversToTime(simulatedTime);
    });
    timelineScrubber.addEventListener('mouseup', () => { isScrubbing = false; });

    document.getElementById('play-pause-button')?.addEventListener('click', () => {
        isPlaying = !isPlaying; lastRealTime = null;
        document.getElementById('play-pause-button').textContent = isPlaying ? 'Pause' : 'Play';
    });

    // ── Animation loop ────────────────────────────────────────
    let lastTowerUpdate = 0;

    function animate(ts) {
        requestAnimationFrame(animate);
        if (!isPlaying || isScrubbing) return;
        if (lastRealTime === null) lastRealTime = ts;
        simulatedTime += (ts - lastRealTime) * Number(document.getElementById('speed-select').value);
        lastRealTime = ts;

        let reachedEnd = true;
        for (const d of driverDots) {
            while (d.index < d.rawPoints.length - 1 && new Date(d.rawPoints[d.index + 1].date).getTime() < simulatedTime) d.index++;
            if (d.index < d.rawPoints.length - 1) reachedEnd = false;
            const p = d.mappedPoints[d.index];
            d.dotMesh.position.set(p.x, p.y, 1);
            d.dotMesh.visible = !isDriverStationary(d, d.index);
        }

        if (reachedEnd) {
            isPlaying = false; lastRealTime = null;
            document.getElementById('play-pause-button').textContent = 'Play';
        }

        const elapsed = simulatedTime - earliestTime;
        timeDisplay.textContent = formatTime(elapsed);
        timelineScrubber.value  = String(Math.round((elapsed / totalDuration) * 1000));

        if (ts - lastTowerUpdate > 500) {
            updateIntervalTower(simulatedTime);
            lastTowerUpdate = ts;
        }
        renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
}