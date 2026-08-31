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
    const atlas = g.meshBuilder.atlas;
    const canvas = atlas.texture.image; // the canvas
    const ctx = canvas.getContext('2d');
    // Tile is 16x16, atlas 512x512, 32 tiles/row.
    // planks at (9,0): pixel center (9*16+8, 0*16+8) = (152, 8)
    // water at (10,0): pixel center (10*16+8, 8) = (168, 8)
    // stone at (3,0): pixel center (3*16+8, 8) = (56, 8)
    const px = (col, row) => {
      const d = ctx.getImageData(col * 16 + 8, row * 16 + 8, 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    return {
      canvasSize: [canvas.width, canvas.height],
      planks_9_0: px(9, 0),
      water_10_0: px(10, 0),
      stone_3_0: px(3, 0),
      // Also check the UV map entries
      planksUV: atlas.uvMap.get('planks'),
      waterUV: atlas.uvMap.get('water'),
    };
  });
  console.log(JSON.stringify(out, null, 2));
} finally {
  await browser.close();
}
