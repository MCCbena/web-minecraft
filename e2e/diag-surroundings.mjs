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
  const topY = cy - 1; // platform top y
  
  // Check terrain heights AROUND the platform (just outside its bounds)
  // Platform extends x: px-6 to px+6, z: pz-1 to pz+1
  const surroundings = [];
  
  // Check east side (x = px+7 to px+10)
  for (let x = px + 7; x <= px + 10; x++) {
    let highest = -1;
    for (let y = 63; y >= 0; y--) {
      const b = w.getBlock(x, y, pz);
      if (b !== 0 && b !== 9) { highest = y; break; }
    }
    surroundings.push({ side: 'east', x, z: pz, highest });
  }
  
  // Check west side (x = px-7 to px-10)
  for (let x = px - 7; x >= px - 10; x--) {
    let highest = -1;
    for (let y = 63; y >= 0; y--) {
      const b = w.getBlock(x, y, pz);
      if (b !== 0 && b !== 9) { highest = y; break; }
    }
    surroundings.push({ side: 'west', x, z: pz, highest });
  }
  
  // Check south side (z = pz+2 to pz+5)
  for (let z = pz + 2; z <= pz + 5; z++) {
    let highest = -1;
    for (let y = 63; y >= 0; y--) {
      const b = w.getBlock(px, y, z);
      if (b !== 0 && b !== 9) { highest = y; break; }
    }
    surroundings.push({ side: 'south', x: px, z, highest });
  }
  
  // Check north side (z = pz-2 to pz-5)
  for (let z = pz - 2; z >= pz - 5; z--) {
    let highest = -1;
    for (let y = 63; y >= 0; y--) {
      const b = w.getBlock(px, y, z);
      if (b !== 0 && b !== 9) { highest = y; break; }
    }
    surroundings.push({ side: 'north', x: px, z, highest });
  }
  
  // Also check: is there any block ABOVE the platform (y > topY) in the platform area?
  let blocksAbove = 0;
  for (let dx = -6; dx <= 6; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let y = topY + 2; y <= 63; y++) {
        const b = w.getBlock(px + dx, y, pz + dz);
        if (b !== 0) blocksAbove++;
      }
    }
  }
  
  return {
    demoCenter: dc,
    topY,
    surroundings,
    blocksAbovePlatform: blocksAbove
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
