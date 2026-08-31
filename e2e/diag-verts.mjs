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
    const cx = 2, cz = 1;
    const key = `${cx},${cz}`;
    const chunkMesh = mb.getChunkMesh(key);
    const ox = cx * 16, oz = cz * 16;
    const pos = chunkMesh.opaque.geometry.getAttribute('position');
    let minY = Infinity, maxY = -Infinity;
    const samples = [];
    for (let i = 0; i < pos.count; i++) {
      const wy = pos.getY(i);
      if (wy < minY) minY = wy;
      if (wy > maxY) maxY = wy;
      // sample every 200th vertex
      if (i % 200 === 0) {
        samples.push([Math.round(pos.getX(i) + ox), Math.round(pos.getY(i)), Math.round(pos.getZ(i) + oz)]);
      }
    }
    // Count vertices in the platform y-range (34..37)
    let platformYRange = 0;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 34 && pos.getY(i) < 37) platformYRange++;
    }
    return {
      totalVerts: pos.count,
      minY: Math.round(minY), maxY: Math.round(maxY),
      platformYRange,
      samples: samples.slice(0, 12),
    };
  });
  console.log(JSON.stringify(out, null, 2));
} finally {
  await browser.close();
}
