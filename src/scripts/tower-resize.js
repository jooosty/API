/**
 * tower-resize.js
 *
 * Adds to every side tower:
 *  - A ✕ button to collapse/expand the tower
 *  - A drag handle on the left edge to resize the width
 *
 * Call setupTowerResize() once after the DOM is ready.
 */

const TOWER_IDS = [
    'live-lap-tower',
    'pit-tower',
    'overtake-tower',
    'race-control-tower',
    'comparison-panel',
];

const MIN_W = 80;
const MAX_W = 500;
const BASE_FONT = 13;  // px — matches the font-size set in CSS

// Default widths match CSS definitions
const DEFAULT_WIDTHS = {
    'live-lap-tower':     190,
    'pit-tower':          180,
    'overtake-tower':     150,
    'race-control-tower': 175,
    'comparison-panel':   340,
};

export function setupTowerResize() {
    TOWER_IDS.forEach(id => {
        const tower = document.getElementById(id);
        if (!tower) return;

        const header = tower.querySelector('.tower-header');
        if (!header) return;

        // ── Close / expand button ─────────────────────────────
        const closeBtn = document.createElement('button');
        closeBtn.className   = 'tower-close-btn';
        closeBtn.textContent = '−';
        closeBtn.title = 'Collapse tower';
        header.appendChild(closeBtn);

        let collapsed = false;

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            collapsed = !collapsed;
            tower.classList.toggle('tower-collapsed', collapsed);
            closeBtn.textContent = collapsed ? '＋' : '−';
            closeBtn.title = collapsed ? 'Expand tower' : 'Collapse tower';
        });

        // Click header to re-expand when collapsed
        header.addEventListener('click', () => {
            if (collapsed) {
                collapsed = false;
                tower.classList.remove('tower-collapsed');
                closeBtn.textContent = '−';
                closeBtn.title = 'Close tower';
            }
        });

        // ── Resize drag handle ────────────────────────────────
        const handle = document.createElement('div');
        handle.className = 'tower-resize-handle';
        tower.appendChild(handle);

        let dragging   = false;
        let startX     = 0;
        let startWidth = 0;

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            dragging   = true;
            startX     = e.clientX;
            startWidth = tower.offsetWidth;
            document.body.style.cursor   = 'ew-resize';
            document.body.style.userSelect = 'none';
        });

        window.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const delta   = e.clientX - startX;
            const newW    = Math.min(MAX_W, Math.max(MIN_W, startWidth + delta));
            const defaultW = DEFAULT_WIDTHS[id] || 175;
            const newFont  = Math.max(9, Math.min(16, Math.round(BASE_FONT * (newW / defaultW))));
            tower.style.width    = newW + 'px';
            tower.style.fontSize = newFont + 'px';
        });

        window.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.cursor    = '';
            document.body.style.userSelect = '';
        });

        // Touch resize
        handle.addEventListener('touchstart', (e) => {
            dragging   = true;
            startX     = e.touches[0].clientX;
            startWidth = tower.offsetWidth;
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (!dragging) return;
            const delta    = e.touches[0].clientX - startX;
            const newW     = Math.min(MAX_W, Math.max(MIN_W, startWidth + delta));
            const defaultW = DEFAULT_WIDTHS[id] || 175;
            const newFont  = Math.max(9, Math.min(16, Math.round(BASE_FONT * (newW / defaultW))));
            tower.style.width    = newW + 'px';
            tower.style.fontSize = newFont + 'px';
        }, { passive: true });

        window.addEventListener('touchend', () => { dragging = false; });
    });
}