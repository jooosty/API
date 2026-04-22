import { buildTowerRow } from './tower-base.js';

const COMPOUND_COLOR = {
    SOFT:         '#c0392b',
    MEDIUM:       '#d4ac0d',
    HARD:         '#e0e0e0',
    INTERMEDIATE: '#27ae60',
    INTER:        '#27ae60',
    WET:          '#2980b9',
};

const COMPOUND_SHORT = {
    SOFT:         'SOFT',
    MEDIUM:       'MED',
    HARD:         'HARD',
    INTERMEDIATE: 'INTER',
    INTER:        'INTER',
    WET:          'WET',
};

export function updateRaceTower(currentSimTime, intervalRows, allIntervalData, allPositionData, driverInfoMap, dnfDrivers, allStintData = [], selectedDriverNum = null, onDriverClick = null) {
    if (allIntervalData.length === 0) return;

    const latestInterval = {};
    for (const entry of allIntervalData) {
        const t = new Date(entry.date).getTime();
        if (t > currentSimTime) continue;
        const dn = entry.driver_number;
        if (!latestInterval[dn] || t > new Date(latestInterval[dn].date).getTime()) {
            latestInterval[dn] = entry;
        }
    }

    const latestPosition = {};
    for (const entry of allPositionData) {
        const t = new Date(entry.date).getTime();
        if (t > currentSimTime) continue;
        const dn = entry.driver_number;
        if (!latestPosition[dn] || t > new Date(latestPosition[dn].date).getTime()) {
            latestPosition[dn] = entry;
        }
    }

    const currentTyre = {};
    if (allStintData.length > 0) {
        const byDriver = {};
        for (const s of allStintData) {
            if (!byDriver[s.driver_number]) byDriver[s.driver_number] = [];
            byDriver[s.driver_number].push(s);
        }
        for (const dn of Object.keys(byDriver)) {
            const stints = byDriver[dn].sort((a, b) => a.stint_number - b.stint_number);
            currentTyre[Number(dn)] = stints[stints.length - 1].compound || null;
        }
    }

    const driverNums = Object.keys(latestInterval).map(Number);
    if (driverNums.length === 0) return;

    driverNums.sort((a, b) => {
        const posA = latestPosition[a]?.position ?? 999;
        const posB = latestPosition[b]?.position ?? 999;
        if (posA !== posB) return posA - posB;
        return (latestInterval[a]?.gap_to_leader ?? Infinity) - (latestInterval[b]?.gap_to_leader ?? Infinity);
    });

    intervalRows.innerHTML = '';
    driverNums.forEach((dn, i) => {
        const intervalEntry = latestInterval[dn];
        const info     = driverInfoMap[dn] || { acronym: '#' + dn, colour: '#fff' };
        const isLeader = i === 0;
        const isSelected = dn === selectedDriverNum;
        const gapRaw   = intervalEntry?.gap_to_leader;
        const ivlRaw   = intervalEntry?.interval;

        const isRetired = dnfDrivers.has(dn) && (() => {
            if (!intervalEntry) return true;
            return (currentSimTime - new Date(intervalEntry.date).getTime()) > 3 * 60 * 1000;
        })();

        let intervalText;
        if (isLeader)                        intervalText = 'LEADER';
        else if (isRetired)                  intervalText = 'RET';
        else if (typeof ivlRaw === 'string') intervalText = ivlRaw;
        else if (typeof ivlRaw === 'number') intervalText = '+' + ivlRaw.toFixed(3);
        else                                 intervalText = '—';

        let gapText;
        if (isLeader)                        gapText = '';
        else if (isRetired)                  gapText = '';
        else if (typeof gapRaw === 'string') gapText = gapRaw;
        else if (typeof gapRaw === 'number') gapText = '+' + gapRaw.toFixed(3);
        else                                 gapText = '—';

        const rowEl = buildTowerRow({
            position:    i + 1,
            colour:      info.colour,
            acronym:     info.acronym,
            teamLogoUrl: info.teamLogoUrl || null,
            headshotUrl: null,
            mainText:    intervalText,
            mainColor:   isLeader ? '#f0c040' : isRetired ? '#666' : '#ccc',
            subText:     isLeader ? '' : gapText,
            subColor:    '#555',
        });

        // Selected highlight
        if (isSelected) {
            rowEl.style.background = 'rgba(255,255,255,0.06)';
            rowEl.style.borderLeft = `2px solid ${info.colour}`;
        }

        rowEl.style.cursor = 'pointer';
        rowEl.addEventListener('click', () => {
            if (onDriverClick) onDriverClick(dn);
        });

        // Tyre indicator
        const compound = currentTyre[dn];
        if (compound && !isRetired) {
            const key       = compound.toUpperCase();
            const tyreColor = COMPOUND_COLOR[key] || '#555';
            const tyreLabel = COMPOUND_SHORT[key] || compound;
            const acronymEl = rowEl.children[2];

            const tyreWrap = document.createElement('span');
            tyreWrap.style.cssText = 'display:inline-flex;align-items:center;gap:2px;margin-left:3px;';

            const tyreDot = document.createElement('span');
            tyreDot.style.cssText = `display:inline-block;width:7px;height:7px;border-radius:50%;background:${tyreColor};flex-shrink:0;border:1px solid rgba(255,255,255,0.15);`;

            const tyreTxt = document.createElement('span');
            tyreTxt.style.cssText = `font-size:8px;color:${tyreColor};letter-spacing:0.02em;`;
            tyreTxt.textContent = tyreLabel;

            tyreWrap.appendChild(tyreDot);
            tyreWrap.appendChild(tyreTxt);
            acronymEl.after(tyreWrap);
        }

        intervalRows.appendChild(rowEl);
    });
}