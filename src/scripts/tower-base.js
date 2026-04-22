const TEAM_SLUGS = {
    // 2025
    'Red Bull Racing':              'red-bull-racing',
    'Ferrari':                      'ferrari',
    'Mercedes':                     'mercedes',
    'McLaren':                      'mclaren',
    'Aston Martin':                 'aston-martin',
    'Alpine':                       'alpine',
    'Williams':                     'williams',
    'Racing Bulls':                 'racing-bulls',
    'Kick Sauber':                  'kick-sauber',
    'Haas F1 Team':                 'haas',
    'Visa Cash App RB F1 Team':     'rb',
    'Stake F1 Team Kick Sauber':    'kick-sauber',
    'RB':                           'rb',
    'AlphaTauri':                   'alphatauri',
    'Alfa Romeo':                   'alfa-romeo',
    'Racing Point':                 'racing-point',
    'Renault':                      'renault',
    'Toro Rosso':                   'toro-rosso',
};

export function teamLogoUrl(teamName, year = 2025) {
    const slug = TEAM_SLUGS[teamName];
    if (!slug) {
        if (teamName) console.warn('[teamLogoUrl] unmapped team name:', teamName);
        return null;
    }
    return `https://media.formula1.com/content/dam/fom-website/teams/${year}/${slug}.png`;
}

export function buildTowerRow({ position, colour, acronym, mainText, mainColor, subText, subColor, teamLogoUrl: logoUrl, headshotUrl }) {
    const rowEl = document.createElement('div');
    rowEl.style.cssText = 'display:flex;align-items:center;gap:4px;padding:4px 5px;border-bottom:1px solid #1e1e1e;';

    const posEl = document.createElement('span');
    posEl.style.cssText = 'color:#666;font-size:10px;min-width:14px;text-align:right;flex-shrink:0;';
    posEl.textContent = String(position);

    let avatar;
    if (headshotUrl) {
        avatar = document.createElement('img');
        avatar.src = headshotUrl;
        avatar.style.cssText = `width:20px;height:20px;border-radius:50%;object-fit:cover;object-position:top center;flex-shrink:0;border:2px solid ${colour};background:#222;`;
        avatar.onerror = () => avatar.replaceWith(_makeLogoOrDot(logoUrl, colour));
    } else if (logoUrl) {
        avatar = _makeLogoOrDot(logoUrl, colour);
    } else {
        avatar = _makeDot(colour);
    }

    const acronymEl = document.createElement('span');
    acronymEl.style.cssText = 'font-weight:bold;font-size:11px;min-width:28px;letter-spacing:0.03em;';
    acronymEl.textContent = acronym;

    const rightCol = document.createElement('div');
    rightCol.style.cssText = 'margin-left:auto;text-align:right;display:flex;flex-direction:column;gap:1px;';

    const mainEl = document.createElement('span');
    mainEl.style.cssText = `font-size:11px;color:${mainColor};`;
    mainEl.textContent = mainText;

    const subEl = document.createElement('span');
    subEl.style.cssText = `font-size:10px;color:${subColor || '#555'};`;
    subEl.textContent = subText || '';

    rightCol.appendChild(mainEl);
    if (subText) rightCol.appendChild(subEl);

    rowEl.appendChild(posEl);
    rowEl.appendChild(avatar);
    rowEl.appendChild(acronymEl);
    rowEl.appendChild(rightCol);

    return rowEl;
}

function _makeLogoOrDot(logoUrl, colour) {
    if (!logoUrl) return _makeDot(colour);
    const img = document.createElement('img');
    img.src = logoUrl;
    img.style.cssText = 'width:20px;height:14px;object-fit:contain;flex-shrink:0;';
    img.onerror = () => img.replaceWith(_makeDot(colour));
    return img;
}

function _makeDot(colour) {
    const dot = document.createElement('span');
    dot.style.cssText = `display:inline-block;width:7px;height:7px;border-radius:50%;background:${colour};flex-shrink:0;`;
    return dot;
}