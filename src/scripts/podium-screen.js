/**
 * podium-screen.js
 *
 * Shows a podium overlay when the session playback reaches the end.
 * Displays P1/P2/P3 with driver headshots and team colours,
 * plus the fastest lap holder.
 */

export function showPodium(allSessionResultData, allLapData, driverInfoMap) {
    const overlay = document.getElementById('podium-overlay');
    if (!overlay) return;

    // ── Podium positions ──────────────────────────────────────
    const sorted = [...allSessionResultData]
        .filter(r => r.position && !r.dnf && !r.dns && !r.dsq)
        .sort((a, b) => a.position - b.position);

    const p1 = sorted.find(r => r.position === 1);
    const p2 = sorted.find(r => r.position === 2);
    const p3 = sorted.find(r => r.position === 3);

    // ── Fastest lap ───────────────────────────────────────────
    // First check fastest_lap_rank field, fallback to deriving from lap data
    let fastestLapEntry = allSessionResultData.find(r => r.fastest_lap_rank === 1);
    let fastestLapTime  = null;

    if (!fastestLapEntry) {
        // Derive from lap data
        let best = Infinity, bestDn = null;
        for (const lap of allLapData) {
            if (lap.lap_duration && lap.lap_duration < best) {
                best = lap.lap_duration;
                bestDn = lap.driver_number;
            }
        }
        if (bestDn) fastestLapEntry = { driver_number: bestDn };
        fastestLapTime = best < Infinity ? best : null;
    } else {
        // Get time from lap data
        const laps = allLapData.filter(l => l.driver_number === fastestLapEntry.driver_number && l.lap_duration);
        fastestLapTime = laps.length ? Math.min(...laps.map(l => l.lap_duration)) : null;
    }

    function fmtLap(sec) {
        if (!sec) return '—';
        const m = Math.floor(sec / 60);
        const s = (sec % 60).toFixed(3).padStart(6, '0');
        return `${m}:${s}`;
    }

    function driverCard(result, label, height) {
        if (!result) return '';
        const info   = driverInfoMap[result.driver_number] || { acronym: '?', colour: '#fff', headshotUrl: null };
        const imgTag = info.headshotUrl
            ? `<img src="${info.headshotUrl}" class="podium-headshot" style="border-color:${info.colour};" onerror="this.style.display='none'">`
            : `<div class="podium-headshot podium-headshot--placeholder" style="border-color:${info.colour};"></div>`;

        return `
            <div class="podium-card" style="height:${height}px;border-top-color:${info.colour};">
                <div class="podium-position">${label}</div>
                ${imgTag}
                <div class="podium-acronym" style="color:${info.colour};">${info.acronym}</div>
            </div>`;
    }

    const fastInfo = fastestLapEntry ? (driverInfoMap[fastestLapEntry.driver_number] || { acronym: '?', colour: '#cc44ff' }) : null;

    overlay.innerHTML = `
        <div class="podium-screen">
            <div class="podium-title">RACE RESULT</div>
            <div class="podium-stage">
                ${driverCard(p2, 'P2', 160)}
                ${driverCard(p1, 'P1', 200)}
                ${driverCard(p3, 'P3', 130)}
            </div>
            ${fastInfo ? `
            <div class="podium-fastest">
                <span class="podium-fastest-label">FASTEST LAP</span>
                <span class="podium-fastest-driver" style="color:${fastInfo.colour};">${fastInfo.acronym}</span>
                <span class="podium-fastest-time">${fmtLap(fastestLapTime)}</span>
            </div>` : ''}
            <button class="podium-close" onclick="document.getElementById('podium-overlay').classList.add('tower-hidden')">✕ Close</button>
        </div>`;

    overlay.classList.remove('tower-hidden');
}

export function hidePodium() {
    const overlay = document.getElementById('podium-overlay');
    if (overlay) overlay.classList.add('tower-hidden');
}
