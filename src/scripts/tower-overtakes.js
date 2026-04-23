/**
 * Overtakes tower
 *
 * Shows all overtakes that have occurred up to the current sim time,
 * newest first. Each row shows:
 *   - Position gained
 *   - Overtaking driver (dot + acronym) → overtaken driver (dot + acronym)
 *
 * Usage:
 *   import { updateOvertakeTower } from './tower-overtakes.js';
 *   // each tick:
 *   updateOvertakeTower(currentSimTime, containerEl, allOvertakeData, driverInfoMap);
 */

export function updateOvertakeTower(currentSimTime, container, allOvertakeData, driverInfoMap, allLapData = []) {
    if (!container) return;

    const occurred = allOvertakeData.filter(o => new Date(o.date).getTime() <= currentSimTime);

    if (occurred.length === 0) {
        container.innerHTML = '<div class="tower-empty">No overtakes yet</div>';
        return;
    }

    container.innerHTML = '';

    // Newest first
    for (let i = occurred.length - 1; i >= 0; i--) {
        const o       = occurred[i];
        const passer  = driverInfoMap[o.overtaking_driver_number] || { acronym: '#' + o.overtaking_driver_number, colour: '#fff' };
        const passed  = driverInfoMap[o.overtaken_driver_number]  || { acronym: '#' + o.overtaken_driver_number,  colour: '#fff' };

        // Find the lap number at the time of this overtake
        const overtakeT = new Date(o.date).getTime();
        let lapNum = null;
        if (allLapData.length > 0) {
            const activeLaps = allLapData.filter(l => {
                if (!l.date_start) return false;
                const start = new Date(l.date_start).getTime();
                const end   = l.lap_duration ? start + l.lap_duration * 1000 : Infinity;
                return start <= overtakeT && overtakeT <= end;
            });
            if (activeLaps.length > 0) {
                lapNum = Math.max(...activeLaps.map(l => l.lap_number));
            }
        }

        const row = document.createElement('div');
        row.style.cssText = 'padding:4px 6px 3px;border-bottom:1px solid #1e1e1e;';

        // Top line: position badge + lap number
        const topLine = document.createElement('div');
        topLine.style.cssText = 'display:flex;align-items:center;gap:5px;margin-bottom:3px;';

        const posBadge = document.createElement('span');
        posBadge.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.1em;padding:1px 5px;border-radius:3px;background:#1a1a00;color:#f0c040;border:1px solid #3a3a00;flex-shrink:0;';
        posBadge.textContent = 'P' + o.position;

        topLine.appendChild(posBadge);

        if (lapNum !== null) {
            const lapEl = document.createElement('span');
            lapEl.style.cssText = 'font-size:11px;color:#555;letter-spacing:0.06em;';
            lapEl.textContent = 'L' + lapNum;
            topLine.appendChild(lapEl);
        }
        row.appendChild(topLine);

        // Bottom line: overtaking → overtaken
        const driverLine = document.createElement('div');
        driverLine.style.cssText = 'display:flex;align-items:center;gap:4px;padding-left:2px;';

        // Overtaking driver
        const dotPasser = document.createElement('span');
        dotPasser.style.cssText = `display:inline-block;width:7px;height:7px;border-radius:50%;background:${passer.colour};flex-shrink:0;`;

        const namePasser = document.createElement('span');
        namePasser.style.cssText = 'font-weight:700;font-size:13px;letter-spacing:0.03em;color:#fff;';
        namePasser.textContent = passer.acronym;

        // Arrow
        const arrow = document.createElement('span');
        arrow.style.cssText = 'font-size:12px;color:#3ecf5a;flex-shrink:0;';
        arrow.textContent = '↑';

        // Overtaken driver
        const dotPassed = document.createElement('span');
        dotPassed.style.cssText = `display:inline-block;width:7px;height:7px;border-radius:50%;background:${passed.colour};flex-shrink:0;`;

        const namePassed = document.createElement('span');
        namePassed.style.cssText = 'font-size:13px;letter-spacing:0.03em;color:#666;';
        namePassed.textContent = passed.acronym;

        driverLine.appendChild(dotPasser);
        driverLine.appendChild(namePasser);
        driverLine.appendChild(arrow);
        driverLine.appendChild(dotPassed);
        driverLine.appendChild(namePassed);

        row.appendChild(driverLine);
        container.appendChild(row);
    }
}