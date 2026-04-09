import { buildTowerRow } from './tower-base.js';

export function updateRaceTower(currentSimTime, intervalRows, allIntervalData, allPositionData, driverInfoMap, dnfDrivers) {
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

        intervalRows.appendChild(buildTowerRow({
            position:  i + 1,
            colour:    info.colour,
            acronym:   info.acronym,
            mainText:  intervalText,
            mainColor: isLeader ? '#f0c040' : isRetired ? '#666' : '#ccc',
            subText:   isLeader ? '' : gapText,
            subColor:  '#555',
        }));
    });
}