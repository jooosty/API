export function buildTowerRow({ position, colour, acronym, mainText, mainColor, subText, subColor }) {
    const rowEl = document.createElement('div');
    rowEl.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;border-bottom:1px solid #1e1e1e;';

    const posEl = document.createElement('span');
    posEl.style.cssText = 'color:#666;font-size:11px;min-width:16px;text-align:right;';
    posEl.textContent = String(position);

    const dot = document.createElement('span');
    dot.style.cssText = `display:inline-block;width:7px;height:7px;border-radius:50%;background:${colour};flex-shrink:0;`;

    const acronymEl = document.createElement('span');
    acronymEl.style.cssText = 'font-weight:bold;font-size:12px;min-width:34px;letter-spacing:0.04em;';
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
    rowEl.appendChild(dot);
    rowEl.appendChild(acronymEl);
    rowEl.appendChild(rightCol);

    return rowEl;
}
