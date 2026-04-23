/**
 * session-comparison.js
 *
 * Session comparison panel rendered below the track visualiser.
 *
 * Features:
 *  - Lap time bar chart per selected driver, with compound colour strip
 *  - Sector comparison table when exactly 2 drivers are selected
 *
 * Usage:
 *   import { setupComparison } from './session-comparison.js';
 *   const comparison = setupComparison(allLapData, allStintData, driverInfoMap);
 *   comparison.selectDriver(driverNum);   // toggle selection
 *   comparison.render(currentSimTime);    // call on tick or on selection change
 */

const COMPOUND_COLOR = {
    SOFT:         '#c0392b',
    MEDIUM:       '#d4ac0d',
    HARD:         '#e0e0e0',
    INTERMEDIATE: '#27ae60',
    INTER:        '#27ae60',
    WET:          '#2980b9',
};

function compoundColor(name) {
    return COMPOUND_COLOR[(name || '').toUpperCase()] || '#555';
}

function fmtLap(sec) {
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(3).padStart(6, '0');
    return `${m}:${s}`;
}

function fmtSec(sec) {
    if (sec == null) return '—';
    return sec.toFixed(3);
}

/** Find the compound a driver was on for a given lap number */
function getCompoundForLap(allStintData, driverNum, lapNum) {
    const stints = allStintData
        .filter(s => s.driver_number === driverNum)
        .sort((a, b) => a.stint_number - b.stint_number);
    for (const s of stints) {
        const start = s.lap_start ?? 1;
        const end   = s.lap_end   ?? Infinity;
        if (lapNum >= start && lapNum <= end) return s.compound || null;
    }
    return null;
}

export function setupComparison(allLapData, allStintData, driverInfoMap) {
    const panel = document.getElementById('comparison-rows');
    if (!panel) return { selectDriver: () => {}, render: () => {} };

    const selectedDrivers = []; // max 2

    function selectDriver(driverNum) {
        const idx = selectedDrivers.indexOf(driverNum);
        if (idx !== -1) {
            selectedDrivers.splice(idx, 1);
        } else {
            if (selectedDrivers.length >= 2) selectedDrivers.shift();
            selectedDrivers.push(driverNum);
        }
        render();
    }

    function render(currentSimTime = Infinity) {
        panel.innerHTML = '';
        if (selectedDrivers.length === 0) {
            panel.innerHTML = '<div class="comp-empty">Right-click a driver in the tower to compare</div>';
            return;
        }

        // ── Lap time charts ───────────────────────────────────
        const chartsRow = document.createElement('div');
        chartsRow.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;';

        for (const dn of selectedDrivers) {
            const info = driverInfoMap[dn] || { acronym: '#' + dn, colour: '#fff' };
            const laps = allLapData
                .filter(l => l.driver_number === dn && l.lap_duration && l.date_start
                    && new Date(l.date_start).getTime() + l.lap_duration * 1000 <= currentSimTime)
                .sort((a, b) => a.lap_number - b.lap_number)
                .slice(-5);  // last 5 laps only

            const chart = buildLapChart(laps, allStintData, dn, info);
            chartsRow.appendChild(chart);
        }
        panel.appendChild(chartsRow);

        // ── Sector comparison (2 drivers only) ───────────────
        if (selectedDrivers.length === 2) {
            const sectorEl = buildSectorComparison(
                selectedDrivers[0], selectedDrivers[1],
                allLapData, currentSimTime
            );
            panel.appendChild(sectorEl);
        }
    }

    // ── Lap time bar chart ────────────────────────────────────
    function buildLapChart(laps, allStintData, driverNum, info) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'flex:1;min-width:280px;';

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;';
        const dot = document.createElement('span');
        dot.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:50%;background:${info.colour};`;
        const title = document.createElement('span');
        title.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:0.06em;color:#fff;';
        title.textContent = info.acronym + ' — Lap Times';
        header.appendChild(dot);
        header.appendChild(title);
        wrap.appendChild(header);

        if (laps.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'font-size:12px;color:#555;padding:8px 0;';
            empty.textContent = 'No completed laps yet';
            wrap.appendChild(empty);
            return wrap;
        }

        const validLaps = laps.filter(l => l.lap_duration > 10);
        const minTime   = Math.min(...validLaps.map(l => l.lap_duration));
        const maxTime   = Math.max(...validLaps.map(l => l.lap_duration));
        const range     = maxTime - minTime || 1;

        // Canvas bar chart
        const BAR_H    = 12;
        const GAP      = 3;
        const LEFT_PAD = 28;
        const RIGHT_PAD= 60;
        const W        = 320;
        const H        = validLaps.length * (BAR_H + GAP) + 20;

        const canvas  = document.createElement('canvas');
        canvas.width  = W;
        canvas.height = H;
        canvas.style.cssText = 'width:100%;max-width:320px;display:block;';
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(0, 0, W, H);

        validLaps.forEach((lap, i) => {
            const y        = i * (BAR_H + GAP) + 16;
            const barW     = Math.max(2, ((lap.lap_duration - minTime) / range) * (W - LEFT_PAD - RIGHT_PAD));
            const compound = getCompoundForLap(allStintData, driverNum, lap.lap_number);
            const col      = compoundColor(compound);
            const isBest   = lap.lap_duration === minTime;

            // Lap number
            ctx.fillStyle = '#555';
            ctx.font      = '8px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(lap.lap_number, LEFT_PAD - 4, y + BAR_H - 2);

            // Bar background
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(LEFT_PAD, y, W - LEFT_PAD - RIGHT_PAD, BAR_H);

            // Bar fill — team colour for best, compound colour for others
            ctx.fillStyle = isBest ? info.colour : col + '99';
            ctx.fillRect(LEFT_PAD, y, barW, BAR_H);

            // Compound strip on left of bar
            ctx.fillStyle = col;
            ctx.fillRect(LEFT_PAD, y, 3, BAR_H);

            // Lap time label
            ctx.fillStyle = isBest ? '#fff' : '#888';
            ctx.font      = isBest ? 'bold 9px monospace' : '9px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(fmtLap(lap.lap_duration), LEFT_PAD + barW + 5, y + BAR_H - 2);
        });

        wrap.appendChild(canvas);
        return wrap;
    }

    // ── Sector comparison table ───────────────────────────────
    function buildSectorComparison(dn1, dn2, allLapData, currentSimTime) {
        const info1 = driverInfoMap[dn1] || { acronym: '#' + dn1, colour: '#fff' };
        const info2 = driverInfoMap[dn2] || { acronym: '#' + dn2, colour: '#fff' };

        const wrap = document.createElement('div');
        wrap.style.cssText = 'margin-top:16px;';

        const title = document.createElement('div');
        title.style.cssText = 'font-size:12px;color:#555;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;';
        title.textContent = 'Sector Comparison — Best Sectors';
        wrap.appendChild(title);

        // Get best sector times per driver from completed laps
        function bestSectors(dn) {
            const laps = allLapData.filter(l =>
                l.driver_number === dn && l.date_start && l.lap_duration &&
                new Date(l.date_start).getTime() + l.lap_duration * 1000 <= currentSimTime
            );
            const best = { s1: Infinity, s2: Infinity, s3: Infinity };
            const bestLapData = { s1: null, s2: null, s3: null };
            for (const lap of laps) {
                if (lap.duration_sector_1 && lap.duration_sector_1 < best.s1) { best.s1 = lap.duration_sector_1; bestLapData.s1 = lap.lap_number; }
                if (lap.duration_sector_2 && lap.duration_sector_2 < best.s2) { best.s2 = lap.duration_sector_2; bestLapData.s2 = lap.lap_number; }
                if (lap.duration_sector_3 && lap.duration_sector_3 < best.s3) { best.s3 = lap.duration_sector_3; bestLapData.s3 = lap.lap_number; }
            }
            return { best, bestLapData };
        }

        const { best: b1 } = bestSectors(dn1);
        const { best: b2 } = bestSectors(dn2);

        const table = document.createElement('table');
        table.style.cssText = 'width:100%;border-collapse:collapse;font-family:var(--mono);font-size:12px;';

        // Header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr style="color:#555;letter-spacing:0.06em;">
                <th style="text-align:left;padding:4px 8px;width:30px;">SEC</th>
                <th style="text-align:right;padding:4px 8px;color:${info1.colour};">${info1.acronym}</th>
                <th style="text-align:center;padding:4px 8px;width:20px;"></th>
                <th style="text-align:left;padding:4px 8px;color:${info2.colour};">${info2.acronym}</th>
                <th style="text-align:right;padding:4px 8px;">DELTA</th>
            </tr>`;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (const [label, key] of [['S1', 's1'], ['S2', 's2'], ['S3', 's3']]) {
            const v1    = b1[key] < Infinity ? b1[key] : null;
            const v2    = b2[key] < Infinity ? b2[key] : null;
            const delta = v1 && v2 ? v1 - v2 : null;
            const winner = delta === null ? null : delta < 0 ? 1 : delta > 0 ? 2 : 0;

            const tr = document.createElement('tr');
            tr.style.cssText = 'border-top:1px solid #1e1e1e;';

            const deltaStr = delta !== null
                ? (delta > 0 ? '+' : '') + delta.toFixed(3)
                : '—';
            const deltaColor = delta === null ? '#555' : delta < 0 ? info1.colour : delta > 0 ? info2.colour : '#555';

            tr.innerHTML = `
                <td style="padding:5px 8px;color:#666;font-weight:700;">${label}</td>
                <td style="text-align:right;padding:5px 8px;color:${winner===1?'#fff':'#666'};font-weight:${winner===1?'700':'400'};">${fmtSec(v1)}</td>
                <td style="text-align:center;padding:5px 4px;color:#333;font-size:10px;">vs</td>
                <td style="text-align:left;padding:5px 8px;color:${winner===2?'#fff':'#666'};font-weight:${winner===2?'700':'400'};">${fmtSec(v2)}</td>
                <td style="text-align:right;padding:5px 8px;color:${deltaColor};font-weight:700;">${deltaStr}</td>`;
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        wrap.appendChild(table);
        return wrap;
    }

    // Initial render
    render();

    return { selectDriver, render, getSelected: () => [...selectedDrivers] };
}