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

  // Close-up 3/4 view of the demo platform.
  const diag = await page.evaluate(() => {
    const g = window.game;
    if (!g || !g.demoCenter) return { error: 'no demoCenter' };
    const [dx, cy, dz] = g.demoCenter;
    // Camera: right next to the platform east face, looking straight at it.
    // Platform spans x=dx-6..dx+6 at y=cy-1. East face at x=dx+6.
    const camX = dx + 9, camY = cy - 1, camZ = dz;
    const targetX = dx + 6, targetY = cy - 1, targetZ = dz;
    const dirX = targetX - camX, dirY = targetY - camY, dirZ = targetZ - camZ;
    const dist = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
    g.player.state.flying = true;
    g.player.state.position.set(camX, camY, camZ);
    g.player.state.yaw = Math.atan2(-dirX, -dirZ);
    g.player.state.pitch = Math.asin(dirY / dist);
    // Report what the platform is made of + surrounding terrain height.
    const get = (x, y, z) => g.world.getBlock(x, y, z);
    const platformBlock = get(dx, cy - 1, dz);
    // surface height a few blocks away
    let nearbySurface = -1;
    for (let y = 63; y >= 0; y--) { if (get(dx + 8, y, dz) !== 0 && get(dx + 8, y, dz) !== 9) { nearbySurface = y; break; } }
    return { demoCenter: [dx, cy, dz], camY, platformBlock, nearbySurface, planks: 5, stone: 3, water: 9, air: 0 };
  });
  console.log('DIAG: ' + JSON.stringify(diag));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'screenshot-demo-close.png') });
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
} finally {
  await browser.close();
}
