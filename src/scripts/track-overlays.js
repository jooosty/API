/**
 * track-overlays.js
 *
 * Three visual overlays layered on top of the track:
 *
 *  1. Driver trails  — fading colour trail behind each dot (last N seconds)
 *  2. Speed heatmap  — track line coloured red→green by average speed
 *  3. DRS zones      — bright green highlighted segments on DRS straights
 *
 * All Three objects are added directly to the scene and managed here.
 */
import * as THREE from 'three';

// ── Helpers ────────────────────────────────────────────────────

function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function speedColor(norm) {
    // norm 0→1: red (slow) → yellow → green (fast)
    if (norm < 0.5) {
        return new THREE.Color(1, norm * 2, 0);
    } else {
        return new THREE.Color(1 - (norm - 0.5) * 2, 1, 0);
    }
}

// ══════════════════════════════════════════════════════════════
// 1.  DRIVER TRAILS
// ══════════════════════════════════════════════════════════════

const TRAIL_DURATION_MS = 4000;  // how many ms of history to show
const TRAIL_POINTS      = 40;    // number of segments in the trail

/**
 * Create trail objects for every driver dot and return an updater function.
 *
 * @param {THREE.Scene}  scene
 * @param {object[]}     driverDots   — array returned by buildDriverDots()
 * @param {object}       driverInfoMap
 * @returns {function}   updateTrails(currentSimTime)
 */
export function setupDriverTrails(scene, driverDots, driverInfoMap, allDriverLocationData) {
    const trails = driverDots.map((d, idx) => {
        const driver = allDriverLocationData[idx]?.driver;
        const info   = driverInfoMap[driver?.driver_number] || { colour: '#ffffff' };
        const rgb    = hexToRgb(info.colour);

        // Geometry: TRAIL_POINTS+1 vertices
        const positions = new Float32Array((TRAIL_POINTS + 1) * 3);
        const colors    = new Float32Array((TRAIL_POINTS + 1) * 3);

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

        const mat  = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
        const line = new THREE.Line(geo, mat);
        line.frustumCulled = false;
        scene.add(line);

        return { d, rgb, line, geo, positions, colors };
    });

    function updateTrails(currentSimTime) {
        for (const { d, rgb, geo, positions, colors } of trails) {
            const pts      = d.rawPoints;
            const mapped   = d.mappedPoints;
            const curTime  = new Date(pts[d.index].date).getTime();
            const startTime = curTime - TRAIL_DURATION_MS;

            // Collect up to TRAIL_POINTS past positions (newest = last)
            const history = [];
            for (let i = d.index; i >= 0 && history.length <= TRAIL_POINTS; i--) {
                const t = new Date(pts[i].date).getTime();
                if (t < startTime) break;
                history.unshift(mapped[i]);
            }

            // Pad front with current pos if short
            while (history.length < TRAIL_POINTS + 1) history.unshift(mapped[Math.max(0, d.index - history.length)]);

            for (let i = 0; i <= TRAIL_POINTS; i++) {
                const p      = history[Math.min(i, history.length - 1)];
                const alpha  = i / TRAIL_POINTS;          // 0=tail (transparent) → 1=head (opaque)
                positions[i * 3]     = p.x;
                positions[i * 3 + 1] = p.y;
                positions[i * 3 + 2] = 0.5;
                colors[i * 3]        = rgb.r * alpha;
                colors[i * 3 + 1]    = rgb.g * alpha;
                colors[i * 3 + 2]    = rgb.b * alpha;
            }

            geo.attributes.position.needsUpdate = true;
            geo.attributes.color.needsUpdate    = true;
            geo.setDrawRange(0, TRAIL_POINTS + 1);
        }
    }

    return updateTrails;
}


// ══════════════════════════════════════════════════════════════
// 3.  DRS ZONES
// ══════════════════════════════════════════════════════════════

/**
 * Build DRS zone highlights from car data.
 * Groups consecutive points where drs >= 10 into segments and draws
 * a bright green line slightly above the track.
 *
 * @param {THREE.Scene}  scene
 * @param {object[]}     rawPoints
 * @param {object[]}     mappedPoints
 * @param {object[]}     allCarDataFlat   — sorted car data entries
 * @returns {THREE.Group}
 */
export function buildDrsZones(scene, rawPoints, mappedPoints, allCarDataFlat) {
    const group = new THREE.Group();
    if (!allCarDataFlat || allCarDataFlat.length === 0) { scene.add(group); return group; }

    const n      = mappedPoints.length;
    const sorted = [...allCarDataFlat].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Map drs state to rawPoint indices
    const drsActive = new Uint8Array(n);
    let rpIdx = 0;
    for (const entry of sorted) {
        const t = new Date(entry.date).getTime();
        while (rpIdx < n - 1 && Math.abs(new Date(rawPoints[rpIdx + 1].date).getTime() - t) < Math.abs(new Date(rawPoints[rpIdx].date).getTime() - t)) {
            rpIdx++;
        }
        if ((entry.drs ?? 0) >= 10) drsActive[rpIdx] = 1;
    }

    // Find contiguous DRS-on segments
    const segments = [];
    let segStart = -1;
    for (let i = 0; i < n; i++) {
        if (drsActive[i] && segStart === -1) segStart = i;
        if (!drsActive[i] && segStart !== -1) { segments.push([segStart, i - 1]); segStart = -1; }
    }
    if (segStart !== -1) segments.push([segStart, n - 1]);

    const DRS_COLOR   = new THREE.Color(0x00ff88);
    const GLOW_COLOR  = new THREE.Color(0x00ff88);

    for (const [s, e] of segments) {
        if (e - s < 3) continue; // skip tiny noise segments

        const pts = mappedPoints.slice(s, e + 1).map(p => new THREE.Vector3(p.x, p.y, 0.8));

        // Main bright line
        const mainGeo = new THREE.BufferGeometry().setFromPoints(pts);
        group.add(new THREE.Line(mainGeo, new THREE.LineBasicMaterial({ color: DRS_COLOR, linewidth: 3 })));

        // Wider semi-transparent glow
        const glowPts = pts.map(p => new THREE.Vector3(p.x, p.y, 0.7));
        const glowGeo = new THREE.BufferGeometry().setFromPoints(glowPts);
        group.add(new THREE.Line(glowGeo, new THREE.LineBasicMaterial({ color: GLOW_COLOR, transparent: true, opacity: 0.2, linewidth: 8 })));
    }

    group.frustumCulled = false;
    scene.add(group);
    return group;
}