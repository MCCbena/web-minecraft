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
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.click('.play-button');
  await page.waitForTimeout(4000);

  // Diagnostic: verify demo blocks + lamp states, and aim the camera.
  const diag = await page.evaluate(() => {
    const g = window.game;
    if (!g || !g.demoCenter) return { error: 'no demoCenter' };
    const [dx, cy, dz] = g.demoCenter;
    const get = (x, y, z) => g.world.getBlock(x, y, z);
    const lampOn = (x, y, z) => { const s = g.redstoneSystem.getComponentState(x, y, z); return s ? s.on : null; };
    // Find the water surface at the demo location (Water = 9).
    let waterTop = -1;
    for (let y = 63; y >= 0; y--) { if (get(dx, y, dz) === 9) { waterTop = y; break; } }
    // 3/4 elevated view of the demo platform (clear, above water).
    const camX = dx + 5, camZ = dz + 7;
    const camY = Math.max(cy + 6, waterTop + 10);
    const dirX = dx - camX, dirY = cy - camY, dirZ = dz - camZ;
    const dist = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
    g.player.state.flying = true;
    g.player.state.position.set(camX, camY, camZ);
    g.player.state.yaw = Math.atan2(-dirX, -dirZ);
    g.player.state.pitch = Math.asin(dirY / dist);
    return {
      demoCenter: [dx, cy, dz], waterTop, camY,
      A_redstoneBlock: get(dx - 5, cy, dz), A_dust: get(dx - 4, cy, dz), A_lamp: get(dx - 2, cy, dz), A_lampOn: lampOn(dx - 2, cy, dz),
      B_torch: get(dx + 1, cy, dz), B_lamp: get(dx + 2, cy, dz), B_lampOn: lampOn(dx + 2, cy, dz),
      C_lever: get(dx + 4, cy, dz), C_dust: get(dx + 5, cy, dz), C_lamp: get(dx + 6, cy, dz), C_lampOn: lampOn(dx + 6, cy, dz),
      types: { dust: 13, torch: 14, lamp: 15, lever: 16, rblock: 18 },
    };
  });
  console.log('DIAG: ' + JSON.stringify(diag));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'screenshot-phaseC-demo.png') });
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
} finally {
  await browser.close();
}
