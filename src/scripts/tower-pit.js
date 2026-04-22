/**
 * Pit stop tower
 *
 * Renders a scrollable list of all pit stops that have occurred up to
 * the current sim time, newest first. Each row shows:
 *   - Driver colour dot + acronym
 *   - Lap number
 *   - Stop duration (orange)
 *   - Compound out → compound in (colour-coded dots + short labels)
 *
 * Usage:
 *   import { buildPitTowerState, updatePitTower } from './tower-pit.js';
 *
 *   // Once after data is loaded:
 *   const pitState = buildPitTowerState(allStintData);
 *
 *   // Each tick:
 *   updatePitTower(currentSimTime, pitTowerRowsEl, allPitData, pitState, driverInfoMap);
 */

const COMPOUND_COLOR = {
    SOFT:   { bg: '#c0392b', text: '#fff' },
    MEDIUM: { bg: '#d4ac0d', text: '#000' },
    HARD:   { bg: '#e0e0e0', text: '#000' },
    INTER:  { bg: '#27ae60', text: '#fff' },
    WET:    { bg: '#2980b9', text: '#fff' },
};

const COMPOUND_SHORT = {
    SOFT:         'SOFT',
    MEDIUM:       'MED',
    HARD:         'HARD',
    INTERMEDIATE: 'INTER',
    INTER:        'INTER',
    WET:          'WET',
};

function compoundShort(name) {
    return COMPOUND_SHORT[(name || '').toUpperCase()] || (name || '?');
}

function compoundStyle(name) {
    return COMPOUND_COLOR[(name || '').toUpperCase()] || { bg: '#555', text: '#fff' };
}

/**
 * Build a per-driver map of stints sorted by stint_number.
 * Call once after stint data is loaded.
 *
 * @param {object[]} allStintData
 * @returns {object}  driverNumber → sorted stint[]
 */
export function buildPitTowerState(allStintData) {
    const map = {};
    for (const s of allStintData) {
        const dn = s.driver_number;
        if (!map[dn]) map[dn] = [];
        map[dn].push(s);
    }
    for (const dn of Object.keys(map)) {
        map[dn].sort((a, b) => a.stint_number - b.stint_number);
    }
    return map;
}

/**
 * Given a driver and the lap they pitted on, return the compounds
 * for the outgoing and incoming stints.
 *
 * The pit lap is the LAST lap of the outgoing stint (lap_end === pitLap).
 * The incoming stint starts on pitLap + 1.
 */
function getCompoundsForPit(stintsByDriver, driverNum, pitLap) {
    const stints = stintsByDriver[driverNum] || [];
    let stintOut = null;
    let stintIn  = null;

    // Primary: find the stint that ends on the pit lap
    stintOut = stints.find(s => s.lap_end === pitLap) || null;

    // Fallback: stint whose range contains the pit lap
    if (!stintOut) {
        stintOut = stints.find(s => {
            const start = s.lap_start ?? 1;
            const end   = s.lap_end   ?? Infinity;
            return pitLap >= start && pitLap <= end;
        }) || null;
    }

    if (stintOut) {
        stintIn = stints.find(s => s.stint_number === stintOut.stint_number + 1) || null;
    }

    return {
        compoundOut: stintOut?.compound || '?',
        compoundIn:  stintIn?.compound  || '?',
    };
}

/**
 * Render all pit stops up to currentSimTime into the given container,
 * newest first.
 *
 * @param {number}   currentSimTime   - playback timestamp (ms)
 * @param {Element}  pitRows          - #pit-tower-rows container element
 * @param {object[]} allPitData       - all pit entries for the session (sorted by date)
 * @param {object}   stintsByDriver   - result of buildPitTowerState()
 * @param {object}   driverInfoMap    - { driverNumber: { acronym, colour } }
 */
export function updatePitTower(currentSimTime, pitRows, allPitData, stintsByDriver, driverInfoMap) {
    if (!pitRows) return;

    const occurred = allPitData.filter(p => new Date(p.date).getTime() <= currentSimTime);

    if (occurred.length === 0) {
        pitRows.innerHTML = '<div class="tower-empty">No stops yet</div>';
        return;
    }

    pitRows.innerHTML = '';

    // Newest first
    for (let i = occurred.length - 1; i >= 0; i--) {
        const pit  = occurred[i];
        const info = driverInfoMap[pit.driver_number] || { acronym: '#' + pit.driver_number, colour: '#fff' };
        const { compoundOut, compoundIn } = getCompoundsForPit(stintsByDriver, pit.driver_number, pit.lap_number);
        const styleOut = compoundStyle(compoundOut);
        const styleIn  = compoundStyle(compoundIn);
        const dur      = pit.pit_duration;

        const row = document.createElement('div');
        row.style.cssText = 'padding:4px 6px 3px;border-bottom:1px solid #1e1e1e;';

        // Top line: dot · acronym · lap · duration
        const topLine = document.createElement('div');
        topLine.style.cssText = 'display:flex;align-items:center;gap:5px;';

        const dot = document.createElement('span');
        dot.style.cssText = `display:inline-block;width:7px;height:7px;border-radius:50%;background:${info.colour};flex-shrink:0;`;

        const acronym = document.createElement('span');
        acronym.style.cssText = 'font-weight:bold;font-size:11px;min-width:30px;letter-spacing:0.04em;';
        acronym.textContent = info.acronym;

        const lapEl = document.createElement('span');
        lapEl.style.cssText = 'font-size:10px;color:#555;';
        lapEl.textContent = pit.lap_number != null ? 'L' + pit.lap_number : '';

        const durEl = document.createElement('span');
        durEl.style.cssText = 'margin-left:auto;font-size:11px;color:#ff9f1a;font-family:var(--mono,monospace);';
        durEl.textContent = dur != null ? dur.toFixed(1) + 's' : '—';

        topLine.appendChild(dot);
        topLine.appendChild(acronym);
        topLine.appendChild(lapEl);
        topLine.appendChild(durEl);

        // Bottom line: compound out → compound in
        const bottomLine = document.createElement('div');
        bottomLine.style.cssText = 'display:flex;align-items:center;gap:4px;padding:3px 0 1px 12px;';

        const dotOut = document.createElement('span');
        dotOut.style.cssText = `display:inline-block;width:9px;height:9px;border-radius:50%;background:${styleOut.bg};flex-shrink:0;border:1px solid rgba(255,255,255,0.15);`;

        const lblOut = document.createElement('span');
        lblOut.style.cssText = `font-size:9px;color:${styleOut.bg};letter-spacing:0.04em;`;
        lblOut.textContent = compoundShort(compoundOut);

        const arrow = document.createElement('span');
        arrow.style.cssText = 'font-size:9px;color:#444;margin:0 2px;';
        arrow.textContent = '→';

        const dotIn = document.createElement('span');
        dotIn.style.cssText = `display:inline-block;width:9px;height:9px;border-radius:50%;background:${styleIn.bg};flex-shrink:0;border:1px solid rgba(255,255,255,0.15);`;

        const lblIn = document.createElement('span');
        lblIn.style.cssText = `font-size:9px;color:${styleIn.bg};letter-spacing:0.04em;`;
        lblIn.textContent = compoundShort(compoundIn);

        bottomLine.appendChild(dotOut);
        bottomLine.appendChild(lblOut);
        bottomLine.appendChild(arrow);
        bottomLine.appendChild(dotIn);
        bottomLine.appendChild(lblIn);

        row.appendChild(topLine);
        row.appendChild(bottomLine);
        pitRows.appendChild(row);
    }
}
