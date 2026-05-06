/**
 * tower-context-menu.js
 *
 * A lightweight right-click context menu for tower rows.
 * One singleton menu is shared across all towers.
 *
 * Usage:
 *   import { attachRowContextMenu } from './tower-context-menu.js';
 *
 *   attachRowContextMenu(rowEl, driverNum, {
 *       onTelemetry: (dn) => { ... },
 *       onCompare:   (dn) => { ... },
 *       onFocus:     (dn) => { ... },   // optional — omit to hide the item
 *   });
 */

// ── Singleton menu element ────────────────────────────────────
let _menu   = null;
let _onHide = null;

function getMenu() {
    if (_menu) return _menu;

    _menu = document.createElement('div');
    _menu.id = 'tower-context-menu';
    _menu.style.cssText = `
        position: fixed;
        z-index: 9999;
        min-width: 150px;
        background: #141414;
        border: 1px solid #2a2a2a;
        border-radius: 6px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.7);
        padding: 4px 0;
        display: none;
        font-family: var(--sans, sans-serif);
        font-size: 13px;
        user-select: none;
    `;
    document.body.appendChild(_menu);

    // Close on any outside click or Escape
    document.addEventListener('mousedown', (e) => {
        if (!_menu.contains(e.target)) hideMenu();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideMenu();
    });
    // Close if the page scrolls
    document.addEventListener('scroll', hideMenu, { passive: true });

    return _menu;
}

function hideMenu() {
    if (_menu) _menu.style.display = 'none';
    if (_onHide) { _onHide(); _onHide = null; }
}

function makeItem(label, color, onClick) {
    const item = document.createElement('div');
    item.style.cssText = `
        display: flex;
        align-items: center;
        padding: 7px 14px;
        cursor: pointer;
        color: ${color || '#ccc'};
        transition: background 0.12s;
        white-space: nowrap;
        font-size: 13px;
        letter-spacing: 0.03em;
    `;
    item.textContent = label;
    item.addEventListener('mouseenter', () => { item.style.background = '#222'; });
    item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
    item.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        hideMenu();
        onClick();
    });
    return item;
}

function makeSeparator() {
    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:#222;margin:3px 0;';
    return sep;
}

/**
 * Show the context menu near a mouse event.
 *
 * @param {MouseEvent} e
 * @param {number}     driverNum
 * @param {object}     handlers   — { onTelemetry, onCompare, onFocus?, driverAcronym, driverColour }
 */
function showMenu(e, driverNum, { onTelemetry, onCompare, onFocus, driverAcronym, driverLastName, driverColour }) {
    e.preventDefault();
    e.stopPropagation();

    const menu = getMenu();
    menu.innerHTML = '';

    // Header: coloured driver name
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 6px 14px 5px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: ${driverColour || '#888'};
        border-bottom: 1px solid #222;
        margin-bottom: 3px;
    `;
    header.textContent = driverLastName || driverAcronym || ('#' + driverNum);
    menu.appendChild(header);

    if (onTelemetry) {
        menu.appendChild(makeItem('Telemetry', '#4a9eff', () => onTelemetry(driverNum)));
    }
    if (onCompare) {
        menu.appendChild(makeItem('Compare', '#cc44ff', () => onCompare(driverNum)));
    }
    if (onFocus) {
        menu.appendChild(makeSeparator());
        menu.appendChild(makeItem('Focus camera', '#3ecf5a', () => onFocus(driverNum)));
    }

    // Position — keep inside viewport
    menu.style.display = 'block';
    const vw = window.innerWidth, vh = window.innerHeight;
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let x = e.clientX + 4, y = e.clientY + 4;
    if (x + mw > vw) x = vw - mw - 8;
    if (y + mh > vh) y = vh - mh - 8;
    menu.style.left = x + 'px';
    menu.style.top  = y + 'px';
}

/**
 * Attach a right-click context menu to a tower row element.
 *
 * @param {HTMLElement} rowEl
 * @param {number}      driverNum
 * @param {object}      handlers  — { onTelemetry, onCompare, onFocus?, driverAcronym, driverColour }
 */
export function attachRowContextMenu(rowEl, driverNum, handlers) {
    rowEl.addEventListener('contextmenu', (e) => {
        showMenu(e, driverNum, handlers);
    });
}