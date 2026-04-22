/**
 * tower-race-control.js
 *
 * Shows all race control messages up to the current sim time, newest first.
 * Each row shows a coloured category badge, the message, and optionally
 * a driver/sector tag.
 *
 * Usage:
 *   import { updateRaceControlTower } from './tower-race-control.js';
 *   updateRaceControlTower(currentSimTime, containerEl, allRaceControlData, driverInfoMap);
 */

const CATEGORY_STYLE = {
    Flag:       { bg: '#1a1a00', color: '#f0c040', label: 'FLAG'  },
    SafetyCar:  { bg: '#1a1000', color: '#ff9f1a', label: 'SC'    },
    Drs:        { bg: '#001a0d', color: '#3ecf5a', label: 'DRS'   },
    PitEntry:   { bg: '#0a0a1a', color: '#4a9eff', label: 'PIT'   },
    Other:      { bg: '#1a1a1a', color: '#888888', label: 'INFO'  },
};

const FLAG_COLOR = {
    GREEN:        '#3ecf5a',
    YELLOW:       '#f0c040',
    DOUBLE_YELLOW:'#f0c040',
    RED:          '#e03030',
    BLUE:         '#4a9eff',
    BLACK:        '#888888',
    CHEQUERED:    '#ffffff',
    CLEAR:        '#3ecf5a',
};

function categoryStyle(category) {
    if (!category) return CATEGORY_STYLE.Other;
    const key = Object.keys(CATEGORY_STYLE).find(k => category.toLowerCase().includes(k.toLowerCase()));
    return CATEGORY_STYLE[key] || CATEGORY_STYLE.Other;
}

function flagColor(flag) {
    if (!flag) return null;
    return FLAG_COLOR[flag.toUpperCase().replace(' ', '_')] || null;
}

export function updateRaceControlTower(currentSimTime, container, allRaceControlData, driverInfoMap) {
    if (!container) return;

    const occurred = allRaceControlData.filter(e => new Date(e.date).getTime() <= currentSimTime);

    if (occurred.length === 0) {
        container.innerHTML = '<div class="tower-empty">No messages yet</div>';
        return;
    }

    container.innerHTML = '';

    // Newest first
    for (let i = occurred.length - 1; i >= 0; i--) {
        const e      = occurred[i];
        const style  = categoryStyle(e.category);
        const fColor = flagColor(e.flag);
        const accentColor = fColor || style.color;

        const row = document.createElement('div');
        row.style.cssText = `padding:4px 6px 4px;border-bottom:1px solid #1e1e1e;border-left:2px solid ${accentColor};`;

        // Top line: badge + scope/sector/driver tag
        const topLine = document.createElement('div');
        topLine.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:2px;';

        const badge = document.createElement('span');
        badge.style.cssText = `font-size:8px;font-weight:700;letter-spacing:0.1em;padding:1px 4px;border-radius:2px;background:${style.bg};color:${style.color};border:1px solid ${style.color};flex-shrink:0;`;
        badge.textContent = style.label;
        topLine.appendChild(badge);

        // Flag colour dot if applicable
        if (fColor) {
            const flagDot = document.createElement('span');
            flagDot.style.cssText = `display:inline-block;width:6px;height:6px;border-radius:50%;background:${fColor};flex-shrink:0;`;
            topLine.appendChild(flagDot);
        }

        // Scope tag (Track / Sector N / driver acronym)
        if (e.scope === 'Driver' && e.driver_number) {
            const info = driverInfoMap[e.driver_number];
            if (info) {
                const driverTag = document.createElement('span');
                driverTag.style.cssText = `display:inline-flex;align-items:center;gap:3px;`;
                const dot = document.createElement('span');
                dot.style.cssText = `display:inline-block;width:5px;height:5px;border-radius:50%;background:${info.colour};flex-shrink:0;`;
                const name = document.createElement('span');
                name.style.cssText = 'font-size:9px;color:#aaa;font-weight:600;';
                name.textContent = info.acronym;
                driverTag.appendChild(dot);
                driverTag.appendChild(name);
                topLine.appendChild(driverTag);
            }
        } else if (e.scope === 'Sector' && e.sector) {
            const sectorTag = document.createElement('span');
            sectorTag.style.cssText = 'font-size:9px;color:#555;';
            sectorTag.textContent = 'S' + e.sector;
            topLine.appendChild(sectorTag);
        }

        row.appendChild(topLine);

        // Message text
        if (e.message) {
            const msg = document.createElement('div');
            msg.style.cssText = 'font-size:9px;color:#bbb;line-height:1.3;word-break:break-word;';
            msg.textContent = e.message;
            row.appendChild(msg);
        }

        container.appendChild(row);
    }
}
