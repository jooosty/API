/**
 * track-data.js
 * Rate-limited API fetcher and all session data loading.
 */
import { BASE_URL } from './constants.js';
import { teamLogoUrl } from './tower-base.js';

export function createApiFetcher(onRateLimitMessage) {
    const requestLog = [];
    const PER_SEC = 3, PER_MIN = 28;
    const delay = ms => new Promise(r => setTimeout(r, ms));

    return async function apiFetch(url) {
        while (true) {
            const t = Date.now();
            while (requestLog.length && requestLog[0] < t - 60_000) requestLog.shift();
            const recentSec = requestLog.filter(ts => ts > t - 1_000).length;
            const recentMin = requestLog.length;

            if (recentSec >= PER_SEC) {
                const oldest1s = requestLog.find(ts => ts > t - 1_000);
                await delay(1_000 - (t - oldest1s) + 50);
                continue;
            }
            if (recentMin >= PER_MIN) {
                await delay(60_000 - (t - requestLog[0]) + 50);
                continue;
            }

            requestLog.push(Date.now());
            const res = await fetch(url);
            if (res.status === 429) {
                requestLog.pop();
                if (onRateLimitMessage) onRateLimitMessage('Rate limited — waiting 10s...');
                await delay(10_000);
                continue;
            }
            return res.json();
        }
    };
}

export async function fetchSessionData(apiFetch, sessionKey, setLoadingText) {
    setLoadingText('Fetching session...');
    const sessionData = await apiFetch(`${BASE_URL}/sessions?session_key=${sessionKey}`);
    setLoadingText('Fetching drivers...');
    const driversData = await apiFetch(`${BASE_URL}/drivers?session_key=${sessionKey}`);

    const sessionType  = (sessionData[0].session_type || '').toLowerCase();
    const isPractice   = sessionType.includes('practice');
    const isQualifying = sessionType.includes('qualifying');

    return { sessionData, driversData, isPractice, isQualifying };
}

export async function fetchTowerData(apiFetch, sessionKey, isPractice, isQualifying, setLoadingText) {
    let allIntervalData = [], allPositionData = [], allLapData = [];
    let allStintData = [], allPitData = [], allOvertakeData = [], allRaceControlData = [];
    let allSessionResultData = [];
    let qualPhaseBoundaries = [];
    const dnfDrivers = new Set();

    if (isPractice) {
        setLoadingText('Fetching lap times...');
        allLapData = (await apiFetch(`${BASE_URL}/laps?session_key=${sessionKey}`)) || [];

        setLoadingText('Fetching stints...');
        allStintData = (await apiFetch(`${BASE_URL}/stints?session_key=${sessionKey}`)) || [];

        setLoadingText('Fetching pit stops...');
        const pitRaw = await apiFetch(`${BASE_URL}/pit?session_key=${sessionKey}`);
        allPitData = Array.isArray(pitRaw) ? pitRaw.sort((a, b) => new Date(a.date) - new Date(b.date)) : [];

        setLoadingText('Fetching race control...');
        const rcPracticeRaw = await apiFetch(`${BASE_URL}/race_control?session_key=${sessionKey}`);
        allRaceControlData = Array.isArray(rcPracticeRaw) ? rcPracticeRaw.sort((a, b) => new Date(a.date) - new Date(b.date)) : [];

    } else if (isQualifying) {
        setLoadingText('Fetching lap times...');
        allLapData = (await apiFetch(`${BASE_URL}/laps?session_key=${sessionKey}`)) || [];

        setLoadingText('Fetching stints...');
        allStintData = (await apiFetch(`${BASE_URL}/stints?session_key=${sessionKey}`)) || [];

        setLoadingText('Fetching pit stops...');
        const pitRaw = await apiFetch(`${BASE_URL}/pit?session_key=${sessionKey}`);
        allPitData = Array.isArray(pitRaw) ? pitRaw.sort((a, b) => new Date(a.date) - new Date(b.date)) : [];

        setLoadingText('Fetching race control...');
        const rcData = (await apiFetch(`${BASE_URL}/race_control?session_key=${sessionKey}`)) || [];
        const phaseStartTimes = {};
        for (const event of rcData) {
            if (!event.qualifying_phase || !event.date) continue;
            const phase = Number(event.qualifying_phase);
            const t = new Date(event.date).getTime();
            if (!phaseStartTimes[phase] || t < phaseStartTimes[phase]) phaseStartTimes[phase] = t;
        }
        for (let p = 1; p <= 2; p++) {
            if (phaseStartTimes[p + 1]) qualPhaseBoundaries.push(phaseStartTimes[p + 1]);
        }
        allRaceControlData = Array.isArray(rcData) ? rcData.sort((a, b) => new Date(a.date) - new Date(b.date)) : [];

    } else {
        setLoadingText('Fetching intervals...');
        allIntervalData = (await apiFetch(`${BASE_URL}/intervals?session_key=${sessionKey}`)) || [];

        setLoadingText('Fetching positions...');
        allPositionData = (await apiFetch(`${BASE_URL}/position?session_key=${sessionKey}`)) || [];

        setLoadingText('Fetching results...');
        const sessionResultData = (await apiFetch(`${BASE_URL}/session_result?session_key=${sessionKey}`)) || [];
        sessionResultData.filter(r => r.dnf || r.dns || r.dsq).forEach(r => dnfDrivers.add(r.driver_number));
        allSessionResultData = sessionResultData;

        setLoadingText('Fetching lap times...');
        allLapData = (await apiFetch(`${BASE_URL}/laps?session_key=${sessionKey}`)) || [];

        setLoadingText('Fetching pit stops...');
        const pitRaw = await apiFetch(`${BASE_URL}/pit?session_key=${sessionKey}`);
        allPitData = Array.isArray(pitRaw) ? pitRaw.sort((a, b) => new Date(a.date) - new Date(b.date)) : [];

        setLoadingText('Fetching stints...');
        allStintData = (await apiFetch(`${BASE_URL}/stints?session_key=${sessionKey}`)) || [];

        setLoadingText('Fetching overtakes...');
        const overtakeRaw = await apiFetch(`${BASE_URL}/overtakes?session_key=${sessionKey}`);
        allOvertakeData = Array.isArray(overtakeRaw) ? overtakeRaw.sort((a, b) => new Date(a.date) - new Date(b.date)) : [];

        setLoadingText('Fetching race control...');
        const rcRaceRaw = await apiFetch(`${BASE_URL}/race_control?session_key=${sessionKey}`);
        allRaceControlData = Array.isArray(rcRaceRaw) ? rcRaceRaw.sort((a, b) => new Date(a.date) - new Date(b.date)) : [];
    }

    setLoadingText('Fetching weather...');
    const wxRaw = await apiFetch(`${BASE_URL}/weather?session_key=${sessionKey}`);
    const allWeatherData = Array.isArray(wxRaw) ? wxRaw.sort((a, b) => new Date(a.date) - new Date(b.date)) : [];

    setLoadingText('Fetching team radio...');
    const radioRaw = await apiFetch(`${BASE_URL}/team_radio?session_key=${sessionKey}`);
    const allRadioData = Array.isArray(radioRaw) ? radioRaw.sort((a, b) => new Date(a.date) - new Date(b.date)) : [];

    return {
        allIntervalData, allPositionData, allLapData, allStintData,
        allPitData, allOvertakeData, allRaceControlData, allWeatherData, allRadioData,
        qualPhaseBoundaries, dnfDrivers, allSessionResultData,
    };
}

export function buildDriverInfoMap(driversData) {
    const map = {};
    driversData.forEach(d => {
        map[d.driver_number] = {
            acronym:     d.name_acronym || ('#' + d.driver_number),
            colour:      d.team_colour ? '#' + d.team_colour : '#ffffff',
            headshotUrl: d.headshot_url || null,
            teamName:    d.team_name   || null,
            teamLogoUrl: teamLogoUrl(d.team_name),
        };
    });
    return map;
}

export async function fetchLocationData(apiFetch, sessionKey, sessionData, driversData, setLoadingText) {
    const sessionStart = new Date(sessionData[0].date_start).getTime();
    const sessionEnd   = sessionData[0].date_end
        ? new Date(sessionData[0].date_end).getTime()
        : sessionStart + 3 * 60 * 60 * 1000;

    const CHUNKS = 4;
    const chunkMs = Math.ceil((sessionEnd - sessionStart) / CHUNKS);
    const rawByDriver = {};

    for (let i = 0; i < CHUNKS; i++) {
        const chunkStart = new Date(sessionStart + i * chunkMs).toISOString();
        const chunkEnd   = new Date(Math.min(sessionStart + (i + 1) * chunkMs, sessionEnd)).toISOString();
        setLoadingText(`Loading track data… (${i + 1}/${CHUNKS})`);
        const pts = await apiFetch(`${BASE_URL}/location?session_key=${sessionKey}&date>=${chunkStart}&date<${chunkEnd}`);
        if (Array.isArray(pts)) {
            for (const pt of pts) {
                const dn = pt.driver_number;
                if (!rawByDriver[dn]) rawByDriver[dn] = [];
                rawByDriver[dn].push(pt);
            }
        }
    }

    const allDriverLocationData = [];
    for (const driver of driversData) {
        const pts = rawByDriver[driver.driver_number];
        if (!pts || pts.length === 0) continue;
        pts.sort((a, b) => new Date(a.date) - new Date(b.date));
        allDriverLocationData.push({ driver, points: pts });
    }
    return allDriverLocationData;
}