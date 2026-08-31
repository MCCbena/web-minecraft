import { chromium } from '@playwright/test';
import path from 'node:path';

const URL = 'http://localhost:4173/';
const OUT = path.resolve('docs');
const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader-webgl'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.click('.play-button');
  await page.waitForTimeout(4000);

  const out = await page.evaluate(() => {
    const g = window.game;
    const p = g.player.state.position;
    // Use a THREE.Raycaster from the player position looking DOWN to find the
    // nearest RENDERED block. This tells us the true rendered world position.
    const THREE = g.scene.children[0]?.constructor ? null : null;
    // Build a raycaster manually using the scene's renderer is complex; instead
    // check: is there an opaque mesh whose bounding box contains the player pos?
    let hitMesh = null;
    let hitDist = Infinity;
    g.scene.traverse((o) => {
      if (o.isMesh && o.geometry) {
        o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox;
        if (!bb) return;
        // transform bb to world
        const min = new o.position.constructor(bb.min.x, bb.min.y, bb.min.z);
        // Use matrixWorld to transform
        o.updateWorldMatrix(true, false);
        const m = o.matrixWorld;
        const corners = [
          [bb.min.x, bb.min.y, bb.min.z], [bb.max.x, bb.min.y, bb.min.z],
          [bb.min.x, bb.max.y, bb.min.z], [bb.max.x, bb.max.y, bb.min.z],
          [bb.min.x, bb.min.y, bb.max.z], [bb.max.x, bb.min.y, bb.max.z],
          [bb.min.x, bb.max.y, bb.max.z], [bb.max.x, bb.max.y, bb.max.z],
        ];
        let wmin = [Infinity, Infinity, Infinity], wmax = [-Infinity, -Infinity, -Infinity];
        for (const c of corners) {
          const v = { x: c[0], y: c[1], z: c[2] };
          // apply matrixWorld (translation + no rotation expected)
          const wx = m.elements[0]*v.x + m.elements[4]*v.y + m.elements[8]*v.z + m.elements[12];
          const wy = m.elements[1]*v.x + m.elements[5]*v.y + m.elements[9]*v.z + m.elements[13];
          const wz = m.elements[2]*v.x + m.elements[6]*v.y + m.elements[10]*v.z + m.elements[14];
          wmin[0] = Math.min(wmin[0], wx); wmin[1] = Math.min(wmin[1], wy); wmin[2] = Math.min(wmin[2], wz);
          wmax[0] = Math.max(wmax[0], wx); wmax[1] = Math.max(wmax[1], wy); wmax[2] = Math.max(wmax[2], wz);
        }
        const px = p.x, py = p.y, pz = p.z;
        if (px >= wmin[0] && px <= wmax[0] && py >= wmin[1] && py <= wmax[1] && pz >= wmin[2] && pz <= wmax[2]) {
          hitMesh = { wmin, wmax };
          hitDist = 0;
        }
      }
    });
    return {
      player: [p.x, p.y, p.z],
      playerInsideRenderedMesh: !!hitMesh,
      hitMeshBounds: hitMesh,
    };
  });
  console.log(JSON.stringify(out, null, 2));
  // Also take a screenshot from spawn looking forward
  await page.evaluate(() => {
    const g = window.game;
    g.player.state.position.set(32.5, 16, 32.5);
    g.player.state.yaw = 0;
    g.player.state.pitch = 0;
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'screenshot-spawn.png') });
} finally {
  await browser.close();
}
