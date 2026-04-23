/**
 * Live lap tracker tower
 *
 * Only shows drivers on a FLYING lap — filters out:
 *   - Out laps  (first lap of a stint, or is_pit_out_lap === true)
 *   - In laps   (last lap of a stint, i.e. the driver pits at the end)
 *
 * Stint data is used as the primary signal. is_pit_out_lap is a fallback.
 *
 * Each row shows:
 *   - Driver dot + acronym
 *   - Elapsed lap time (ticking, yellow)
 *   - Delta vs personal best (purple / green / yellow)
 *   - S1 / S2 / S3 with colour + "···" for the current sector
 */

import { computeBestSectors } from './tower-sectors.js';

const COLOR = {
    purple: '#cc44ff',
    green:  '#3ecf5a',
    yellow: '#e6c619',
    dim:    '#555',
    muted:  '#444',
};

const EPSILON = 0.0005;

function fmtSec(sec) {
    if (sec == null || sec === Infinity) return '—';
    const mins = Math.floor(sec / 60);
    const s    = (sec % 60).toFixed(3).padStart(6, '0');
    return mins > 0 ? `${mins}:${s}` : s;
}

function sectorColor(dur, sessionBest) {
    if (dur == null) return COLOR.muted;
    if (sessionBest < Infinity && Math.abs(dur - sessionBest) < EPSILON) return COLOR.purple;
    return COLOR.green;
}

/**
 * Build a set of lap numbers that are flying laps for each driver,
 * derived from stint boundaries.
 *
 * A lap is a flying lap if:
 *   - It is NOT the first lap of a stint  (out lap)
 *   - It is NOT the last lap of a stint   (in lap, driver pits after)
 *
 * For the last stint of a session there is no pit-in, so only the first
 * lap (out lap) is excluded.
 *
 * @param {object[]} allStintData  - stints for the session
 * @returns {Map<number, Set<number>>}  driverNumber → Set of flying lap numbers
 */
function buildFlyingLapSets(allStintData) {
    // Group stints by driver
    const stintsByDriver = {};
    for (const s of allStintData) {
        const dn = s.driver_number;
        if (!stintsByDriver[dn]) stintsByDriver[dn] = [];
        stintsByDriver[dn].push(s);
    }

    const flyingLaps = new Map();

    for (const [dn, stints] of Object.entries(stintsByDriver)) {
        stints.sort((a, b) => a.stint_number - b.stint_number);
        const flying = new Set();

        for (let si = 0; si < stints.length; si++) {
            const stint = stints[si];
            const lapStart = stint.lap_start;
            const lapEnd   = stint.lap_end; // may be null for the last stint

            // Out lap = lapStart (first lap of stint) — always skip
            // In lap  = lapEnd   (last lap of stint)  — skip if there's a next stint
            const hasNextStint = si < stints.length - 1;

            for (let ln = lapStart; ln <= (lapEnd ?? lapStart + 99); ln++) {
                if (ln === lapStart) continue;           // out lap
                if (hasNextStint && ln === lapEnd) continue; // in lap
                flying.add(ln);
            }
        }

        flyingLaps.set(Number(dn), flying);
    }

    return flyingLaps;
}

/**
 * @param {number}   currentSimTime  - current playback time (ms)
 * @param {Element}  liveRows        - container element to render into
 * @param {object[]} allLapData      - all laps for the session
 * @param {object[]} allStintData    - all stints for the session
 * @param {object}   driverInfoMap   - { driverNumber: { acronym, colour } }
 */
export function updateLiveLapTower(currentSimTime, liveRows, allLapData, allStintData, driverInfoMap) {

    const flyingLapSets = buildFlyingLapSets(allStintData);

    /**
     * Returns true if this lap is a flying lap.
     * Falls back to is_pit_out_lap when stint data is unavailable.
     */
    function isFlyingLap(lap) {
        // Hard exclude: pit out laps flagged directly on the lap
        if (lap.is_pit_out_lap === true) return false;

        const driverFlying = flyingLapSets.get(lap.driver_number);
        if (driverFlying && driverFlying.size > 0) {
            // Stint data available — trust it
            return driverFlying.has(lap.lap_number);
        }

        // No stint data for this driver — only is_pit_out_lap was our filter,
        // which already passed above, so treat as flying
        return true;
    }

    // ── Separate completed from in-progress laps ──────────────
    const completedLaps = [];
    const inProgressLap = {}; // driverNumber → lap object

    for (const lap of allLapData) {
        if (!lap.date_start) continue;
        const lapStart = new Date(lap.date_start).getTime();

        if (lap.lap_duration) {
            const lapEnd = lapStart + lap.lap_duration * 1000;
            if (lapEnd <= currentSimTime) {
                completedLaps.push(lap);
            } else if (lapStart <= currentSimTime) {
                // Started but not yet finished
                const existing = inProgressLap[lap.driver_number];
                if (!existing || lapStart > new Date(existing.date_start).getTime()) {
                    inProgressLap[lap.driver_number] = lap;
                }
            }
        } else {
            if (lapStart <= currentSimTime) {
                const existing = inProgressLap[lap.driver_number];
                if (!existing || lapStart > new Date(existing.date_start).getTime()) {
                    inProgressLap[lap.driver_number] = lap;
                }
            }
        }
    }

    // ── Drop stale in-progress entries ───────────────────────
    // If a driver has a completed lap that started *after* their supposed
    // in-progress lap, the in-progress entry is a stale no-duration artifact.
    // Also drop if their in-progress lap has a duration and is actually done.
    const latestCompletedStart = {};
    for (const lap of completedLaps) {
        const dn = lap.driver_number;
        const t  = new Date(lap.date_start).getTime();
        if (!latestCompletedStart[dn] || t > latestCompletedStart[dn]) {
            latestCompletedStart[dn] = t;
        }
    }

    for (const dn of Object.keys(inProgressLap).map(Number)) {
        const lap      = inProgressLap[dn];
        const lapStart = new Date(lap.date_start).getTime();
        const lastDone = latestCompletedStart[dn] ?? -Infinity;

        // A newer completed lap exists → this entry is stale
        if (lastDone >= lapStart) {
            delete inProgressLap[dn];
        }
    }

    // ── Filter to flying laps only ────────────────────────────
    const liveDrivers = Object.keys(inProgressLap)
        .map(Number)
        .filter(dn => isFlyingLap(inProgressLap[dn]));

    if (liveDrivers.length === 0) {
        liveRows.innerHTML = '<div class="tower-empty">No flying lap</div>';
        return;
    }

    // ── Session-best sectors (from completed flying laps only) ─
    const completedFlyingLaps = completedLaps.filter(isFlyingLap);
    const bestSectors = computeBestSectors(completedFlyingLaps);

    // ── Personal best lap per driver (flying laps only) ────────
    const personalBest = {};
    for (const lap of completedFlyingLaps) {
        if (!lap.lap_duration) continue;
        const dn = lap.driver_number;
        if (!personalBest[dn] || lap.lap_duration < personalBest[dn]) {
            personalBest[dn] = lap.lap_duration;
        }
    }

    // Sort by elapsed time descending (furthest into their lap first)
    liveDrivers.sort((a, b) => {
        const elA = currentSimTime - new Date(inProgressLap[a].date_start).getTime();
        const elB = currentSimTime - new Date(inProgressLap[b].date_start).getTime();
        return elB - elA;
    });

    liveRows.innerHTML = '';

    for (const dn of liveDrivers) {
        const lap        = inProgressLap[dn];
        const info       = driverInfoMap[dn] || { acronym: '#' + dn, colour: '#fff' };
        const lapStartMs = new Date(lap.date_start).getTime();
        const elapsed    = (currentSimTime - lapStartMs) / 1000;

        const s1Done = lap.duration_sector_1 != null;
        const s2Done = lap.duration_sector_2 != null;
        const s3Done = lap.duration_sector_3 != null;

        // ── Delta vs personal best ────────────────────────────
        const pb = personalBest[dn];
        let deltaStr  = '—';
        let deltaColor = COLOR.dim;

        if (pb) {
            const delta = elapsed - pb;
            deltaStr   = (delta >= 0 ? '+' : '') + delta.toFixed(3);
            deltaColor = delta < 0 ? COLOR.purple : delta < 0.5 ? COLOR.green : COLOR.yellow;
        }

        // ── Row ───────────────────────────────────────────────
        const row = document.createElement('div');
        row.style.cssText = 'padding:6px 8px 2px;';

        // Header: dot · acronym · elapsed · delta
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:6px;';

        const dot = document.createElement('span');
        dot.style.cssText = `display:inline-block;width:7px;height:7px;border-radius:50%;background:${info.colour};flex-shrink:0;`;

        const acronymEl = document.createElement('span');
        acronymEl.style.cssText = 'font-weight:bold;font-size:14px;min-width:34px;letter-spacing:0.04em;color:#fff;';
        acronymEl.textContent = info.acronym;

        const elapsedEl = document.createElement('span');
        elapsedEl.style.cssText = 'font-size:13px;color:#f0c040;font-family:var(--mono,monospace);margin-left:auto;';
        elapsedEl.textContent = fmtSec(elapsed);

        const deltaEl = document.createElement('span');
        deltaEl.style.cssText = `font-size:12px;color:${deltaColor};font-family:var(--mono,monospace);min-width:52px;text-align:right;`;
        deltaEl.textContent = deltaStr;

        header.appendChild(dot);
        header.appendChild(acronymEl);
        header.appendChild(elapsedEl);
        header.appendChild(deltaEl);
        row.appendChild(header);

        // Sector strip
        const sectors = document.createElement('div');
        sectors.style.cssText = 'display:flex;gap:4px;padding:3px 0 4px 13px;';

        const sectorDefs = [
            { label: 'S1', dur: s1Done ? lap.duration_sector_1 : null, best: bestSectors.s1, live: !s1Done },
            { label: 'S2', dur: s2Done ? lap.duration_sector_2 : null, best: bestSectors.s2, live: s1Done && !s2Done },
            { label: 'S3', dur: s3Done ? lap.duration_sector_3 : null, best: bestSectors.s3, live: s2Done && !s3Done },
        ];

        for (const { label, dur, best, live } of sectorDefs) {
            const col = document.createElement('div');
            col.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:1px;';

            const lbl = document.createElement('span');
            lbl.style.cssText = 'font-size:11px;color:#444;letter-spacing:0.06em;';
            lbl.textContent = label;

            const val = document.createElement('span');
            val.style.cssText = 'font-size:12px;font-family:var(--mono,monospace);';

            if (live) {
                val.style.color = '#666';
                val.textContent = '···';
            } else if (dur != null) {
                val.style.color = sectorColor(dur, best);
                val.textContent = fmtSec(dur);
            } else {
                val.style.color = COLOR.muted;
                val.textContent = '—';
            }

            col.appendChild(lbl);
            col.appendChild(val);
            sectors.appendChild(col);
        }

        row.appendChild(sectors);

        const divider = document.createElement('div');
        divider.style.cssText = 'height:1px;background:#1e1e1e;';
        row.appendChild(divider);

        liveRows.appendChild(row);
    }
}