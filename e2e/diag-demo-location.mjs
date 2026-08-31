import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader-webgl']
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(3000);
await page.evaluate(() => {
  const btn = document.querySelector('.play-button');
  if (btn) btn.click();
});
await page.waitForTimeout(8000);

const info = await page.evaluate(() => {
  const g = window.game;
  const w = g.world;
  const dc = g.demoCenter;
  const px = dc[0], cy = dc[1], pz = dc[2];

  // Find surface and water at demo location
  let surfaceY = -1, waterTop = -1;
  for (let y = 63; y >= 0; y--) {
    const b = w.getBlock(px, y, pz);
    if (b !== 0 && b !== 9) { surfaceY = y; break; }
  }
  for (let y = 63; y >= 0; y--) {
    if (w.getBlock(px, y, pz) === 9) { waterTop = y; break; }
  }

  // Check the platform row (center z)
  const centerCol = [];
  for (let dx = -6; dx <= 6; dx++) {
    const x = px + dx;
    const blocks = [];
    for (let y = cy - 2; y <= cy + 1; y++) {
      blocks.push(w.getBlock(x, y, pz));
    }
    centerCol.push({ x, blocks });
  }

  // Check the pillar
  const pillar = [];
  for (let y = surfaceY + 1; y <= cy; y++) {
    pillar.push({ y, block: w.getBlock(px, y, pz) });
  }

  return {
    demoCenter: dc,
    surfaceY,
    waterTop,
    centerCol,
    pillar
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
