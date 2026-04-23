/**
 * track-scene.js
 * Three.js scene, renderer, track geometry and driver dots.
 */
import * as THREE from 'three';
import { teamLogoUrl } from './tower-base.js';

export function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    return scene;
}

export function createCamera() {
    const camera = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 1000);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    return camera;
}

export function createRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(800, 600);
    renderer.setPixelRatio(window.devicePixelRatio);
    return renderer;
}

// No-op kept for import compatibility
export function resizeRenderer() {}

export function createLoadingSprite(scene, camera, renderer) {
    const canvas  = document.createElement('canvas');
    canvas.width  = 1024;
    canvas.height = 80;
    const ctx     = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    const sprite  = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
    sprite.scale.set(700, 55, 1);
    sprite.position.set(0, 0, 1);
    scene.add(sprite);

    function setText(text) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, 56);
        texture.needsUpdate = true;
        renderer.render(scene, camera);
    }

    return { sprite, setText };
}

export function buildTrackGeometry(scene, allDriverLocationData, toTrackPoint) {
    const mostPoints = allDriverLocationData.reduce((best, cur) =>
        cur.points.length > best.points.length ? cur : best
    );
    scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(mostPoints.points.map(toTrackPoint)),
        new THREE.LineBasicMaterial({ color: 0x333333 })
    ));
    // Return the reference driver so overlays can reuse its point arrays
    return mostPoints;
}

export function buildDriverDots(scene, allDriverLocationData, driverInfoMap, toTrackPoint) {
    return allDriverLocationData.map(({ driver, points }) => {
        const teamColor   = driver.team_colour ? parseInt(driver.team_colour, 16) : 0xffffff;
        const headshotUrl = driverInfoMap[driver.driver_number]?.headshotUrl;
        const dotGroup    = new THREE.Group();

        // Outer ring — team colour
        const ringMesh = new THREE.Mesh(
            new THREE.CircleGeometry(6.5, 32),
            new THREE.MeshBasicMaterial({ color: teamColor })
        );
        ringMesh.position.set(0, 0, 0);
        dotGroup.add(ringMesh);

        if (headshotUrl) {
            const loader = new THREE.TextureLoader();
            loader.load(
                headshotUrl,
                (texture) => {
                    texture.center.set(0.5, 0.5);
                    const inner = new THREE.Mesh(
                        new THREE.CircleGeometry(5, 32),
                        new THREE.MeshBasicMaterial({ map: texture })
                    );
                    inner.position.set(0, 0, 0.1);
                    dotGroup.add(inner);
                },
                undefined,
                () => {
                    const inner = new THREE.Mesh(
                        new THREE.CircleGeometry(4.5, 32),
                        new THREE.MeshBasicMaterial({ color: 0x111111 })
                    );
                    inner.position.set(0, 0, 0.1);
                    dotGroup.add(inner);
                }
            );
        } else {
            const inner = new THREE.Mesh(
                new THREE.CircleGeometry(4.5, 32),
                new THREE.MeshBasicMaterial({ color: 0x111111 })
            );
            inner.position.set(0, 0, 0.1);
            dotGroup.add(inner);
        }

        const mappedPoints = points.map(toTrackPoint);
        dotGroup.position.set(mappedPoints[0].x, mappedPoints[0].y, 1);
        scene.add(dotGroup);
        return { dotMesh: dotGroup, mappedPoints, rawPoints: points, index: 0 };
    });
}

export function buildCoordTransform(allDriverLocationData) {
    const allPoints = allDriverLocationData.flatMap(d => d.points);
    const minX = allPoints.reduce((m, p) => p.x < m ? p.x : m, Infinity);
    const maxX = allPoints.reduce((m, p) => p.x > m ? p.x : m, -Infinity);
    const minY = allPoints.reduce((m, p) => p.y < m ? p.y : m, Infinity);
    const maxY = allPoints.reduce((m, p) => p.y > m ? p.y : m, -Infinity);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const scale   = Math.min(700 / ((maxX - minX) * 0.1), 500 / ((maxY - minY) * 0.1)) * 0.9;

    return function toTrackPoint(point) {
        return new THREE.Vector3(
            (point.x - centerX) * 0.1 * scale,
            (point.y - centerY) * 0.1 * scale,
            0
        );
    };
}

/**
 * Set up raycasting so clicking a driver dot fires onDriverClick(driverNumber).
 * Clicking empty space fires onBackgroundClick().
 */
export function setupDotClickDetection(renderer, camera, driverDots, allDriverLocationData, onDriverClick, onBackgroundClick) {
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();

    renderer.domElement.addEventListener('click', e => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Collect all meshes from driver dot groups
        const meshes = [];
        driverDots.forEach((d, idx) => {
            d.dotMesh.traverse(child => {
                if (child.isMesh) {
                    child.userData._dotIdx = idx;
                    meshes.push(child);
                }
            });
        });

        const hits = raycaster.intersectObjects(meshes, false);
        if (hits.length > 0) {
            const idx    = hits[0].object.userData._dotIdx;
            const driver = allDriverLocationData[idx]?.driver;
            if (driver) onDriverClick(driver.driver_number, driverDots[idx]);
        } else {
            if (onBackgroundClick) onBackgroundClick();
        }
    });
}