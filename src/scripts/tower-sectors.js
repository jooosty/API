/**
 * Sector strip helper
 *
 * Colour logic (takes precedence in this order):
 *   1. If this driver's sector time === session best  → purple
 *   2. If segment flags say purple (2051) but it's no longer the best → green
 *      (it was the best when set, now beaten — personal best only)
 *   3. Segment flag 2049 (green / personal best)     → green
 *   4. Segment flag 2048 (yellow / normal)            → yellow
 *   5. Segment flag 2064 (pit lane)                   → blue
 *   6. Fallback                                       → dim grey
 *
 * This means a driver whose sector was purple keeps it purple only as long as
 * no one else has beaten it. The moment a faster sector exists, it drops to green.
 */

const COLOR = {
    purple: '#cc44ff',
    green:  '#3ecf5a',
    yellow: '#e6c619',
    pit:    '#4a9eff',
    dim:    '#444',
};

const EPSILON = 0.0005; // tolerance for floating-point equality

function dominantSegment(segments) {
    if (!segments || segments.length === 0) return null;
    const priority = [2051, 2049, 2048, 2064];
    for (const p of priority) {
        if (segments.includes(p)) return p;
    }
    return null;
}

/**
 * Determine the display colour for one sector.
 *
 * @param {number|null} dur         - this driver's sector duration (seconds)
 * @param {number[]|null} segs      - segment flags for this sector
 * @param {number} sessionBest      - fastest sector time across all drivers so far
 */
function sectorColor(dur, segs, sessionBest) {
    if (dur == null) return COLOR.dim;

    // 1. Still the session best → purple
    if (sessionBest < Infinity && Math.abs(dur - sessionBest) < EPSILON) {
        return COLOR.purple;
    }

    const seg = dominantSegment(segs);

    // 2. Was flagged as purple but has been beaten → demote to green
    if (seg === 2051) return COLOR.green;

    // 3. Personal best (green flag)
    if (seg === 2049) return COLOR.green;

    // 4. Normal (yellow flag)
    if (seg === 2048) return COLOR.yellow;

    // 5. Pit lane
    if (seg === 2064) return COLOR.pit;

    return COLOR.dim;
}

function fmtSec(sec) {
    if (sec == null) return '—';
    const mins = Math.floor(sec / 60);
    const s    = (sec % 60).toFixed(3).padStart(6, '0');
    return mins > 0 ? `${mins}:${s}` : s;
}

/**
 * Build a compact S1 / S2 / S3 strip element to append after a tower row.
 *
 * @param {object} lap          - lap object from allLapData
 * @param {object} bestSectors  - { s1: number, s2: number, s3: number } session bests
 */
export function buildSectorStrip(lap, bestSectors) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;gap:4px;padding:0 6px 5px 26px;';

    const sectors = [
        { label: 'S1', dur: lap.duration_sector_1, segs: lap.segments_sector_1, best: bestSectors.s1 },
        { label: 'S2', dur: lap.duration_sector_2, segs: lap.segments_sector_2, best: bestSectors.s2 },
        { label: 'S3', dur: lap.duration_sector_3, segs: lap.segments_sector_3, best: bestSectors.s3 },
    ];

    sectors.forEach(({ label, dur, segs, best }) => {
        const col = document.createElement('div');
        col.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:1px;';

        const labelEl = document.createElement('span');
        labelEl.style.cssText = 'font-size:9px;color:#444;letter-spacing:0.06em;';
        labelEl.textContent = label;

        const valEl = document.createElement('span');
        valEl.style.cssText = `font-size:10px;font-family:var(--mono, monospace);color:${sectorColor(dur, segs, best)};`;
        valEl.textContent = fmtSec(dur);

        col.appendChild(labelEl);
        col.appendChild(valEl);
        wrap.appendChild(col);
    });

    return wrap;
}

/**
 * Compute the session-best time for each sector across a set of laps.
 * Returns { s1: number, s2: number, s3: number }
 */
export function computeBestSectors(laps) {
    const best = { s1: Infinity, s2: Infinity, s3: Infinity };
    for (const lap of laps) {
        if (lap.duration_sector_1 && lap.duration_sector_1 < best.s1) best.s1 = lap.duration_sector_1;
        if (lap.duration_sector_2 && lap.duration_sector_2 < best.s2) best.s2 = lap.duration_sector_2;
        if (lap.duration_sector_3 && lap.duration_sector_3 < best.s3) best.s3 = lap.duration_sector_3;
    }
    return best;
}