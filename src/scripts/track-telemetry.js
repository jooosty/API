/**
 * track-telemetry.js
 * Driver telemetry HUD — HTML canvas overlay at bottom of the WebGL canvas.
 */
import { BASE_URL } from './constants.js';

function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);
    ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
    ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);
    ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

function arcBar(ctx, cx, cy, radius, startAng, endAng, frac, trackCol, fillCol, width) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAng, endAng);
    ctx.strokeStyle = trackCol;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
    const fillEnd = startAng + (endAng - startAng) * Math.min(1, Math.max(0, frac));
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAng, fillEnd);
    ctx.strokeStyle = fillCol;
    ctx.lineWidth = width;
    ctx.stroke();
}

function drawHUD(hudCanvas, hudCtx, entry, info) {
    const W = hudCanvas.width, H = hudCanvas.height;
    hudCtx.clearRect(0, 0, W, H);

    hudCtx.fillStyle = 'rgba(6,8,14,0.96)';
    hudCtx.fillRect(0, 0, W, H);
    hudCtx.fillStyle = info.colour;
    hudCtx.fillRect(0, 0, W, 4);

    if (!entry) {
        hudCtx.fillStyle = '#444';
        hudCtx.font = 'bold 11px monospace';
        hudCtx.textAlign = 'center';
        hudCtx.fillText('Loading…', W/2, H/2 + 4);
        return;
    }

    const speed    = entry.speed    ?? 0;
    const rpm      = entry.rpm      ?? 0;
    const throttle = (entry.throttle ?? 0) / 100;
    const brakeFrac= (entry.brake    ?? 0) / 100;
    const gear     = entry.n_gear   ?? 0;
    const drsOn    = (entry.drs     ?? 0) >= 10;
    const rpmFrac  = Math.min(1, rpm / 15000);
    const rpmCol   = rpmFrac > 0.9 ? '#ff2244' : rpmFrac > 0.75 ? '#f0c040' : '#00aaff';

    const cx = W / 2, cy = H / 2 + 10;
    const R  = 58;

    const aStart = Math.PI * 0.75, aEnd = Math.PI * 2.25;
    arcBar(hudCtx, cx, cy, R,      aStart, aEnd, 1,        'rgba(255,255,255,0.07)', 'rgba(255,255,255,0.07)', 8);
    arcBar(hudCtx, cx, cy, R,      aStart, aEnd, rpmFrac,  'rgba(0,0,0,0)',          rpmCol,                  8);
    arcBar(hudCtx, cx, cy, R - 13, aStart, aEnd, 1,        'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)', 5);
    if (throttle > 0) arcBar(hudCtx, cx, cy, R - 13, aStart, aEnd, throttle, 'rgba(0,0,0,0)', '#3ecf5a', 5);
    if (brakeFrac > 0) arcBar(hudCtx, cx, cy, R - 22, aStart, aEnd, brakeFrac, 'rgba(0,0,0,0)', '#e03030', 4);

    hudCtx.fillStyle = '#ffffff';
    hudCtx.font = `bold ${speed >= 100 ? 26 : 28}px monospace`;
    hudCtx.textAlign = 'center';
    hudCtx.fillText(speed, cx, cy - 8);

    hudCtx.fillStyle = 'rgba(255,255,255,0.3)';
    hudCtx.font = '9px monospace';
    hudCtx.fillText('KM/H', cx, cy + 4);

    hudCtx.fillStyle = rpmFrac > 0.9 ? '#ff2244' : '#00ccff';
    hudCtx.font = 'bold 16px monospace';
    hudCtx.fillText(gear || 'N', cx, cy + 20);

    // DRS
    hudCtx.beginPath();
    hudCtx.arc(cx, cy + 34, 5, 0, Math.PI * 2);
    hudCtx.fillStyle = drsOn ? '#3ecf5a' : 'rgba(255,255,255,0.1)';
    hudCtx.fill();
    if (drsOn) {
        hudCtx.fillStyle = '#3ecf5a';
        hudCtx.font = 'bold 7px monospace';
        hudCtx.fillText('DRS', cx, cy + 47);
    }

    // Driver acronym
    hudCtx.fillStyle = info.colour;
    hudCtx.font = 'bold 16px monospace';
    hudCtx.textAlign = 'left';
    hudCtx.fillText(info.acronym, 6, 18);
}

export function setupTelemetry(driverInfoMap, apiFetch, sessionKey, renderer, camera, scene) {
    const hudCanvas = document.getElementById('telemetry-hud');
    const hudCtx    = hudCanvas.getContext('2d');

    let selectedDriverNum = null;
    let allCarData        = {};
    let telemetryFetching = false;
    let _simulatedTime    = 0;

    function getAtTime(driverNum, t) {
        const entries = allCarData[driverNum];
        if (!entries || entries.length === 0) return null;
        let best = entries[0];
        for (const e of entries) {
            if (new Date(e.date).getTime() <= t) best = e;
            else break;
        }
        return best;
    }

    async function select(driverNum) {
        if (selectedDriverNum === driverNum) {
            selectedDriverNum = null;
            hudCanvas.style.display = 'none';
            renderer.render(scene, camera);
            return;
        }
        selectedDriverNum = driverNum;
        hudCanvas.style.display = 'block';
        const info = driverInfoMap[driverNum] || { acronym: '#' + driverNum, colour: '#fff' };
        drawHUD(hudCanvas, hudCtx, getAtTime(driverNum, _simulatedTime), info);
        renderer.render(scene, camera);

        if (!allCarData[driverNum] && !telemetryFetching) {
            telemetryFetching = true;
            try {
                const raw = await apiFetch(`${BASE_URL}/car_data?session_key=${sessionKey}&driver_number=${driverNum}`);
                allCarData[driverNum] = Array.isArray(raw) ? raw.sort((a, b) => new Date(a.date) - new Date(b.date)) : [];
            } catch(e) {
                allCarData[driverNum] = [];
            } finally {
                telemetryFetching = false;
            }
            drawHUD(hudCanvas, hudCtx, getAtTime(driverNum, _simulatedTime), info);
            renderer.render(scene, camera);
        }
    }

    function update(t) {
        _simulatedTime = t;
        if (selectedDriverNum === null || hudCanvas.style.display === 'none') return;
        const info = driverInfoMap[selectedDriverNum] || { acronym: '#' + selectedDriverNum, colour: '#fff' };
        drawHUD(hudCanvas, hudCtx, getAtTime(selectedDriverNum, t), info);
    }

    return { select, update, getSelectedDriver: () => selectedDriverNum };
}
