import { buildTowerRow } from './tower-base.js';

export function updatePracticeTower(currentSimTime, intervalRows, allLapData, driverInfoMap) {
    const bestLap = {};
    const lastLap = {};
    const lapCount = {};

    for (const lap of allLapData) {
        if (!lap.date_start || !lap.lap_duration) continue;
        const lapStart = new Date(lap.date_start).getTime();
        const lapEnd = lapStart + lap.lap_duration * 1000;
        if (lapEnd > currentSimTime) continue;

        const dn = lap.driver_number;
        lapCount[dn] = (lapCount[dn] || 0) + 1;

        if (!bestLap[dn] || lap.lap_duration < bestLap[dn]) {
            bestLap[dn] = lap.lap_duration;
        }
        if (!lastLap[dn] || lapStart > new Date(lastLap[dn].date_start).getTime()) {
            lastLap[dn] = lap;
        }
    }

    const driverNums = Object.keys(bestLap).map(Number);
    if (driverNums.length === 0) {
        intervalRows.innerHTML = '<div class="tower-empty">No lap times yet</div>';
        return;
    }

    driverNums.sort((a, b) => bestLap[a] - bestLap[b]);
    const fastestLap = bestLap[driverNums[0]];

    function formatLapTime(sec) {
        const mins = Math.floor(sec / 60);
        const secs = (sec % 60).toFixed(3).padStart(6, '0');
        return `${mins}:${secs}`;
    }

    intervalRows.innerHTML = '';
    driverNums.forEach((dn, i) => {
        const info = driverInfoMap[dn] || { acronym: '#' + dn, colour: '#fff' };
        const isFastest = i === 0;
        const best = bestLap[dn];
        const last = lastLap[dn]?.lap_duration;
        const laps = lapCount[dn] || 0;

        const delta = isFastest ? formatLapTime(best) : '+' + (best - fastestLap).toFixed(3);
        const lastStr = last ? formatLapTime(last) : '—';
        const isPersonalBest = last && last === best;

        const rowEl = buildTowerRow({
            position: i + 1,
            colour: info.colour,
            acronym: info.acronym,
            mainText: delta,
            mainColor: isFastest ? '#f0c040' : '#ccc',
            subText: lastStr,
            subColor: isPersonalBest ? '#a855f7' : '#555',
        });

        // inject lap count badge after acronym
        const acronymEl = rowEl.querySelectorAll('span')[2];
        const lapBadge = document.createElement('span');
        lapBadge.style.cssText = 'font-size:10px;color:#555;min-width:20px;text-align:center;';
        lapBadge.textContent = `L${laps}`;
        acronymEl.after(lapBadge);

        intervalRows.appendChild(rowEl);
    });
}