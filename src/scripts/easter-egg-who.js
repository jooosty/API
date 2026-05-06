/**
 * easter-egg-who.js
 *
 * Triggered when the user types "who".
 *
 * - Actor characters: portrait fetched from Wikipedia pageimages API (CORS-open)
 * - Creature/prop characters: hardcoded Wikimedia Commons URLs
 * - Randomly shuffles all 20 across however many drivers are on the grid
 * - Replaces acronym, lastName, colour, headshotUrl in driverInfoMap in-place
 * - Reloads Three.js dot textures live
 * - Type "who" again to regenerate back to normal
 */

import * as THREE from 'three';

// ── Character pool ────────────────────────────────────────────
// wiki: Wikipedia article title for pageimages API (actors only)
// img:  hardcoded URL (creatures/props where API picks wrong image)
const WHO_CHARACTERS = [
    { name: 'The Doctor',    abbr: 'DOC',  colour: '#003B6F', wiki: 'Tenth_Doctor',               img: null },
    { name: 'The Master',    abbr: 'MST',  colour: '#8B0000', wiki: 'The_Master_(Doctor_Who)',     img: null },
    { name: 'Rose Tyler',    abbr: 'RSE',  colour: '#D81B60', wiki: 'Rose_Tyler',                  img: null },
    { name: 'Donna Noble',   abbr: 'DON',  colour: '#E65100', wiki: 'Donna_Noble',                 img: null },
    { name: 'Amy Pond',      abbr: 'AMY',  colour: '#C62828', wiki: 'Amy_Pond',                    img: null },
    { name: 'Clara Oswald',  abbr: 'CLA',  colour: '#1565C0', wiki: 'Clara_Oswald',                img: null },
    { name: 'River Song',    abbr: 'RIV',  colour: '#6A1B9A', wiki: 'River_Song_(Doctor_Who)',     img: null },
    { name: 'Capt. Jack',    abbr: 'JAK',  colour: '#0D47A1', wiki: 'Jack_Harkness',               img: null },
    { name: 'Martha Jones',  abbr: 'MAR',  colour: '#1B5E20', wiki: 'Martha_Jones_(Doctor_Who)',   img: null },
    { name: 'Sarah Jane',    abbr: 'SJA',  colour: '#4A148C', wiki: 'Sarah_Jane_Smith',            img: null },
    { name: 'Rory Williams', abbr: 'ROR',  colour: '#00695C', wiki: 'Rory_Williams',               img: null },
    { name: 'Bill Potts',    abbr: 'BIL',  colour: '#BF360C', wiki: 'Bill_Potts',                  img: null },
    { name: 'The 11th Dr',   abbr: '11TH', colour: '#1A237E', wiki: 'Eleventh_Doctor',             img: null },
    { name: 'The 12th Dr',   abbr: '12TH', colour: '#212121', wiki: 'Twelfth_Doctor',              img: null },
    { name: 'The 13th Dr',   abbr: '13TH', colour: '#F9A825', wiki: 'Thirteenth_Doctor',           img: null },
    { name: 'The 15th Dr',   abbr: '15TH', colour: '#880E4F', wiki: 'Fifteenth_Doctor',            img: null },
    // Creatures & props — hardcoded because Wikipedia picks wrong lead images for these
    {
        name: 'The Dalek',     abbr: 'DAL',  colour: '#B8860B', wiki: null,
        img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Dalek_comic_opera.jpg/200px-Dalek_comic_opera.jpg',
    },
    {
        name: 'Cyberman',      abbr: 'CYB',  colour: '#607D8B', wiki: null,
        img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Cyberman_BBC_Television_Centre_2013.jpg/200px-Cyberman_BBC_Television_Centre_2013.jpg',
    },
    {
        name: 'Weeping Angel', abbr: 'ANG',  colour: '#78909C', wiki: null,
        img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Weeping_Angel_cosplay_(Doctor_Who).jpg/200px-Weeping_Angel_cosplay_(Doctor_Who).jpg',
    },
    {
        name: 'The TARDIS',    abbr: 'TRD',  colour: '#1565C0', wiki: null,
        img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/TARDIS_Dublin.jpg/200px-TARDIS_Dublin.jpg',
    },
];

// ── Fetch actor portraits from Wikipedia pageimages API ───────
async function fetchWikiThumbnails(wikiTitles) {
    if (wikiTitles.length === 0) return {};
    const url = 'https://en.wikipedia.org/w/api.php?action=query'
        + '&titles=' + encodeURIComponent(wikiTitles.join('|'))
        + '&prop=pageimages&pithumbsize=250&pilimit=50&format=json&origin=*';
    try {
        const data = await fetch(url).then(r => r.json());
        const out  = {};
        for (const page of Object.values(data?.query?.pages || {})) {
            if (page.thumbnail?.source) {
                out[page.title.replace(/ /g, '_')] = page.thumbnail.source;
            }
        }
        return out;
    } catch (e) {
        console.warn('[WHO] Wikipedia API failed:', e);
        return {};
    }
}

// ── Fisher-Yates shuffle ──────────────────────────────────────
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── Reload a driver dot texture in Three.js ───────────────────
function reloadDotTexture(dotGroup, imageUrl, colour) {
    const hexColor = parseInt(colour.replace('#', ''), 16);

    // Update ring colour
    const ring = dotGroup.children[0];
    if (ring?.material) ring.material.color.setHex(hexColor);

    // Remove all inner meshes (everything after the ring)
    while (dotGroup.children.length > 1) {
        const child = dotGroup.children[1];
        child.geometry?.dispose();
        child.material?.map?.dispose();
        child.material?.dispose();
        dotGroup.remove(child);
    }

    const geo  = new THREE.CircleGeometry(5, 32);
    const mat  = new THREE.MeshBasicMaterial({ color: imageUrl ? 0xffffff : 0x111111 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, 0.1);
    dotGroup.add(mesh);

    if (imageUrl) {
        new THREE.TextureLoader().load(
            imageUrl,
            (tex) => { tex.center.set(0.5, 0.5); mat.map = tex; mat.needsUpdate = true; },
            undefined,
            ()    => { mat.color.setHex(0x111111); } // fallback on load error
        );
    }
}

// ── Banner ────────────────────────────────────────────────────
function showBanner(line1, line2, colour) {
    let el = document.getElementById('who-egg-banner');
    if (!el) {
        el = document.createElement('div');
        el.id = 'who-egg-banner';
        el.style.cssText = [
            'position:fixed', 'top:50%', 'left:50%',
            'transform:translate(-50%,-50%)',
            'background:#000', 'border-radius:8px',
            'padding:18px 32px', 'text-align:center',
            'z-index:10000', 'font-family:var(--mono,monospace)',
            'pointer-events:none', 'transition:opacity 0.5s',
        ].join(';');
        document.body.appendChild(el);
    }
    el.style.border    = `2px solid ${colour}`;
    el.style.boxShadow = `0 0 40px ${colour}88`;
    el.style.opacity   = '1';
    el.innerHTML = `
        <div style="font-size:26px;font-weight:900;letter-spacing:0.12em;color:${colour};">${line1}</div>
        <div style="font-size:12px;color:#888;margin-top:6px;letter-spacing:0.08em;">${line2}</div>
    `;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.opacity = '0'; }, 2800);
}

// ── Main setup ────────────────────────────────────────────────
export function setupWhoEasterEgg(driverInfoMap, driverDots, allDriverLocationData) {
    let active          = false;
    let originalInfoMap = null;

    async function activate() {
        showBanner('DOCTOR WHO', 'The TARDIS has landed on the grid…', '#003B6F');

        // Snapshot originals so we can restore later
        originalInfoMap = {};
        for (const [dn, info] of Object.entries(driverInfoMap)) {
            originalInfoMap[dn] = { ...info };
        }

        const driverNums = Object.keys(driverInfoMap).map(Number);
        const pool       = shuffle(WHO_CHARACTERS).slice(0, driverNums.length);

        // Batch-fetch Wikipedia thumbnails for actor characters only
        const wikiTitles = pool.filter(c => c.wiki !== null).map(c => c.wiki);
        const thumbs     = await fetchWikiThumbnails(wikiTitles);

        // Assign characters to drivers
        driverNums.forEach((dn, i) => {
            const char        = pool[i];
            const resolvedImg = char.img ?? thumbs[char.wiki] ?? null;
            Object.assign(driverInfoMap[dn], {
                acronym:     char.abbr,
                lastName:    char.name,
                colour:      char.colour,
                headshotUrl: resolvedImg,
            });
        });

        // Reload Three.js dots
        driverDots.forEach((dot, idx) => {
            const driver = allDriverLocationData[idx]?.driver;
            if (!driver) return;
            const info = driverInfoMap[driver.driver_number];
            if (info) reloadDotTexture(dot.dotMesh, info.headshotUrl, info.colour);
        });

        active = true;
    }

    function deactivate() {
        if (!originalInfoMap) return;
        showBanner('REGENERATING…', 'Restoring the timeline', '#C62828');

        // Restore original driver info
        for (const [dn, info] of Object.entries(originalInfoMap)) {
            Object.assign(driverInfoMap[Number(dn)], info);
        }

        // Restore Three.js dots
        driverDots.forEach((dot, idx) => {
            const driver = allDriverLocationData[idx]?.driver;
            if (!driver) return;
            const info = driverInfoMap[driver.driver_number];
            if (info) reloadDotTexture(dot.dotMesh, info.headshotUrl, info.colour);
        });

        originalInfoMap = null;
        active          = false;
    }

    return {
        toggle() { if (active) deactivate(); else activate(); },
    };
}