import { chromium } from '@playwright/test';

const URL = 'http://localhost:4173/';
const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader-webgl'],
});
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.click('.play-button');
  await page.waitForTimeout(3000);

  const out = await page.evaluate(() => {
    const g = window.game;
    const mb = g.meshBuilder;
    const p = g.player.state.position;
    // Platform is at world (38, 35, 26) in data. In chunk (2,1) geometry it's at (38,35,26).
    // Rendered position = geometry + mesh.position = (38+32, 35, 26+16) = (70, 35, 42)
    const platformRendered = [38 + 32, 35, 26 + 16];
    const platformData = [38, 35, 26];
    // Distance from player to platform (data pos and rendered pos)
    const dist = (a, b) => Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
    const player = [p.x, p.y, p.z];
    // Check a few chunk meshes' positions to see the offset pattern
    const chunkPositions = {};
    for (const key of ['0,0', '1,1', '2,1', '3,3']) {
      const m = mb.getChunkMesh(key);
      if (m?.opaque) chunkPositions[key] = [m.opaque.position.x, m.opaque.position.y, m.opaque.position.z];
    }
    return {
      player,
      platformData,
      platformRendered,
      distPlayerToPlatformData: Math.round(dist(player, platformData) * 10) / 10,
      distPlayerToPlatformRendered: Math.round(dist(player, platformRendered) * 10) / 10,
      chunkPositions,
    };
  });
  console.log(JSON.stringify(out, null, 2));
} finally {
  await browser.close();
}
