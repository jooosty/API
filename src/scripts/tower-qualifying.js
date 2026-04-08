import { buildTowerRow } from './tower-base.js';

export function updateQualifyingTower(currentSimTime, intervalRows, allLapData, qualPhaseBoundaries, driverInfoMap) {
    const bestLap = {};
    const lastLapTime = {};

    for (const lap of allLapData) {
        if (!lap.date_start || !lap.lap_duration) continue;
        const lapStart = new Date(lap.date_start).getTime();
        const lapEnd = lapStart + lap.lap_duration * 1000;
        if (lapEnd > currentSimTime) continue;
        const dn = lap.driver_number;
        if (!bestLap[dn] || lap.lap_duration < bestLap[dn]) bestLap[dn] = lap.lap_duration;
        if (!lastLapTime[dn] || lapStart > lastLapTime[dn]) lastLapTime[dn] = lapStart;
    }

    const driverNums = Object.keys(bestLap).map(Number);
    if (driverNums.length === 0) {
        intervalRows.innerHTML = '<div class="tower-empty">No lap times yet</div>';
        return;
    }

    driverNums.sort((a, b) => bestLap[a] - bestLap[b]);

    let currentPhase = 0;
    for (const boundary of qualPhaseBoundaries) {
        if (currentSimTime > boundary) currentPhase++;
    }

    const phaseIndicator = document.getElementById('phase-indicator');
    if (phaseIndicator) {
        const phaseNames  = ['Q1', 'Q2', 'Q3'];
        const phaseColors = ['#4a9eff', '#ff9f1a', '#cc44ff'];
        const clampedPhase = Math.min(currentPhase, 2);
        const isLastPhase  = currentPhase >= qualPhaseBoundaries.length;
        phaseIndicator.textContent = !isLastPhase && currentPhase > clampedPhase
            ? `${phaseNames[clampedPhase]} — ENDED`
            : phaseNames[clampedPhase];
        phaseIndicator.style.color   = phaseColors[clampedPhase];
        phaseIndicator.style.opacity = '1';
    }

    const phaseStart = currentPhase === 0 ? 0 : qualPhaseBoundaries[currentPhase - 1];
    const phaseEnd   = currentPhase < qualPhaseBoundaries.length ? qualPhaseBoundaries[currentPhase] : Infinity;

    const bestLapCurrentPhase = {};
    for (const lap of allLapData) {
        if (!lap.date_start || !lap.lap_duration) continue;
        const lapStart = new Date(lap.date_start).getTime();
        const lapEnd   = lapStart + lap.lap_duration * 1000;
        if (lapEnd > currentSimTime) continue;
        if (lapStart <= phaseStart || lapStart > phaseEnd) continue;
        const dn = lap.driver_number;
        if (!bestLapCurrentPhase[dn] || lap.lap_duration < bestLapCurrentPhase[dn]) {
            bestLapCurrentPhase[dn] = lap.lap_duration;
        }
    }

    const activeThisPhase = new Set(Object.keys(bestLapCurrentPhase).map(Number));

    const eliminatedFromPrevPhase = new Set();
    if (currentPhase > 0) {
        for (const dn of driverNums) {
            if (!activeThisPhase.has(dn)) eliminatedFromPrevPhase.add(dn);
        }
    }

    const advanceCounts  = [15, 10, 999];
    const advanceCount   = advanceCounts[Math.min(currentPhase, 2)];
    const thisPhaseDrivers = [...activeThisPhase].sort((a, b) => bestLapCurrentPhase[a] - bestLapCurrentPhase[b]);
    const eliminatedThisPhase = new Set();
    const phaseEnded = qualPhaseBoundaries.length > currentPhase;

    if (phaseEnded && advanceCount < 999 && thisPhaseDrivers.length > advanceCount) {
        thisPhaseDrivers.slice(advanceCount).forEach(dn => eliminatedThisPhase.add(dn));
    }

    const sortedActive       = thisPhaseDrivers.slice(0, phaseEnded ? advanceCount : undefined);
    const sortedElimThisPhase = [...eliminatedThisPhase].sort((a, b) => (bestLapCurrentPhase[a] || 0) - (bestLapCurrentPhase[b] || 0));
    const sortedElimPrev     = [...eliminatedFromPrevPhase].sort((a, b) => (bestLap[a] || 0) - (bestLap[b] || 0));
    const noLapYet           = driverNums.filter(dn => !activeThisPhase.has(dn) && !eliminatedFromPrevPhase.has(dn));
    const orderedDriverNums  = [...sortedActive, ...noLapYet, ...sortedElimThisPhase, ...sortedElimPrev];
    const poleLap            = bestLapCurrentPhase[sortedActive[0]] ?? bestLap[driverNums[0]];

    intervalRows.innerHTML = '';
    orderedDriverNums.forEach((dn, i) => {
        const info        = driverInfoMap[dn] || { acronym: '#' + dn, colour: '#fff' };
        const isPole      = i === 0;
        const isElimPrev  = eliminatedFromPrevPhase.has(dn);
        const isElimThis  = eliminatedThisPhase.has(dn);
        const isEliminated = isElimPrev || isElimThis;
        const liveRankInPhase = thisPhaseDrivers.indexOf(dn);
        const isInDanger  = !phaseEnded && liveRankInPhase >= advanceCount;
        const showRed     = isEliminated || isInDanger;

        const lapSec    = bestLapCurrentPhase[dn] ?? bestLap[dn];
        const mins      = Math.floor(lapSec / 60);
        const secs      = (lapSec % 60).toFixed(3).padStart(6, '0');
        const lapTimeStr = `${mins}:${secs}`;
        const deltaStr  = isPole ? lapTimeStr : '+' + (lapSec - poleLap).toFixed(3);

        const rowEl = buildTowerRow({
            position:   i + 1,
            colour:     info.colour,
            acronym:    info.acronym,
            mainText:   isElimPrev ? 'OUT' : deltaStr,
            mainColor:  isPole ? '#f0c040' : showRed ? '#e03030' : '#ccc',
            subText:    (isPole || isElimPrev) ? '' : lapTimeStr,
            subColor:   showRed ? '#7a2020' : '#555',
        });

        rowEl.style.cssText = `display:flex;align-items:center;gap:6px;padding:4px 6px;border-bottom:1px solid ${showRed ? '#3a1010' : '#1e1e1e'};${showRed ? 'background:#1a0a0a;' : ''}`;
        rowEl.querySelector('span').style.color = showRed ? '#7a2020' : '#666';
        rowEl.querySelectorAll('span')[2].style.color = showRed ? '#e03030' : '#fff';

        intervalRows.appendChild(rowEl);
    });
}