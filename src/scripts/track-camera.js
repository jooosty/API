/**
 * track-camera.js
 * Orthographic zoom + pan controls for the track canvas.
 */

export function setupCameraControls(camera, renderer, onUpdate) {
    let zoomLevel    = 1;
    let isPanning    = false;
    let panStartX    = 0, panStartY = 0;
    let cameraOffsetX = 0, cameraOffsetY = 0;

    function updateCamera() {
        camera.left   = -400 / zoomLevel + cameraOffsetX;
        camera.right  =  400 / zoomLevel + cameraOffsetX;
        camera.top    =  300 / zoomLevel + cameraOffsetY;
        camera.bottom = -300 / zoomLevel + cameraOffsetY;
        camera.updateProjectionMatrix();
        if (onUpdate) onUpdate();
    }

    renderer.domElement.addEventListener('wheel', e => {
        e.preventDefault();
        zoomLevel = Math.max(0.5, Math.min(20, zoomLevel * (e.deltaY < 0 ? 1.1 : 0.9)));
        updateCamera();
    });

    renderer.domElement.addEventListener('mousedown', e => {
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
    });

    renderer.domElement.addEventListener('mousemove', e => {
        if (!isPanning) return;
        cameraOffsetX -= (e.clientX - panStartX) / zoomLevel;
        cameraOffsetY += (e.clientY - panStartY) / zoomLevel;
        panStartX = e.clientX;
        panStartY = e.clientY;
        updateCamera();
    });

    renderer.domElement.addEventListener('mouseup',    () => { isPanning = false; });
    renderer.domElement.addEventListener('mouseleave', () => { isPanning = false; });
}
