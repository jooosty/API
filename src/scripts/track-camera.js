/**
 * track-camera.js
 * Orthographic zoom + pan controls, with optional driver focus mode.
 *
 * Focus mode: camera smoothly follows a driver dot each frame.
 * Pan/zoom still work while focused (pan temporarily overrides follow).
 */

export function setupCameraControls(camera, renderer, onUpdate) {
    let zoomLevel     = 1;
    let isPanning     = false;
    let panStartX     = 0, panStartY = 0;
    let cameraOffsetX = 0, cameraOffsetY = 0;

    // Focus state
    let focusedDot    = null;   // { mappedPoints, index } reference
    let panOverride   = false;  // user dragged while focused → pause follow briefly

    function updateCamera(cx = cameraOffsetX, cy = cameraOffsetY) {
        camera.left   = -400 / zoomLevel + cx;
        camera.right  =  400 / zoomLevel + cx;
        camera.top    =  300 / zoomLevel + cy;
        camera.bottom = -300 / zoomLevel + cy;
        camera.updateProjectionMatrix();
        if (onUpdate) onUpdate();
    }

    /** Call every animation frame to keep the camera on the focused driver. */
    function tickFocus() {
        if (!focusedDot || panOverride) return;
        const p = focusedDot.mappedPoints[focusedDot.index];
        // Smooth lerp towards driver position
        cameraOffsetX += (p.x - cameraOffsetX) * 0.12;
        cameraOffsetY += (p.y - cameraOffsetY) * 0.12;
        updateCamera(cameraOffsetX, cameraOffsetY);
    }

    /** Lock camera onto a driverDot object. */
    function focusDriver(dot) {
        focusedDot  = dot;
        panOverride = false;
    }

    /** Release focus and return to free camera. */
    function unfocus() {
        focusedDot  = null;
        panOverride = false;
    }

    // ── Mouse / wheel ─────────────────────────────────────────
    renderer.domElement.addEventListener('wheel', e => {
        e.preventDefault();
        zoomLevel = Math.max(0.5, Math.min(20, zoomLevel * (e.deltaY < 0 ? 1.1 : 0.9)));
        updateCamera();
    });

    renderer.domElement.addEventListener('mousedown', e => {
        isPanning  = true;
        panStartX  = e.clientX;
        panStartY  = e.clientY;
        panOverride = !!focusedDot; // dragging while focused → brief override
    });

    renderer.domElement.addEventListener('mousemove', e => {
        if (!isPanning) return;
        cameraOffsetX -= (e.clientX - panStartX) / zoomLevel;
        cameraOffsetY += (e.clientY - panStartY) / zoomLevel;
        panStartX = e.clientX;
        panStartY = e.clientY;
        updateCamera();
    });

    renderer.domElement.addEventListener('mouseup',    () => { isPanning = false; panOverride = false; });
    renderer.domElement.addEventListener('mouseleave', () => { isPanning = false; panOverride = false; });

    return { updateCamera, tickFocus, focusDriver, unfocus };
}