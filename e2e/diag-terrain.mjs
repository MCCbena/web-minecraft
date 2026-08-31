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

// Scan terrain heights to find land areas (above water level y=30)
const result = await page.evaluate(() => {
  const g = window.game;
  const w = g.world;
  const landSpots = [];
  const waterLevel = 30;
  
  // Scan every 4 blocks for performance
  for (let x = 0; x < 128; x += 4) {
    for (let z = 0; z < 128; z += 4) {
      // Find the highest non-air, non-water block
      let highest = 0;
      for (let y = 63; y >= 0; y--) {
        const block = w.getBlock(x, y, z);
        if (block !== 0 && block !== 9) { // not air, not water
          highest = y;
          break;
        }
      }
      if (highest >= waterLevel) {
        landSpots.push({ x, z, height: highest });
      }
    }
  }
  
  // Also check the current spawn and demo locations
  const spawnHeight = (() => {
    for (let y = 63; y >= 0; y--) {
      const b = w.getBlock(32, y, 32);
      if (b !== 0 && b !== 9) return y;
    }
    return -1;
  })();
  
  const demoHeight = (() => {
    for (let y = 63; y >= 0; y--) {
      const b = w.getBlock(32, y, 26);
      if (b !== 0 && b !== 9) return y;
    }
    return -1;
  })();
  
  return {
    landCount: landSpots.length,
    totalScanned: Math.ceil(128/4) * Math.ceil(128/4),
    spawnTerrainHeight: spawnHeight,
    demoTerrainHeight: demoHeight,
    // Return spots sorted by height, top 20
    topSpots: landSpots.sort((a,b) => b.height - a.height).slice(0, 20),
    // Return spots near center for convenience
    nearCenter: landSpots.filter(s => 
      Math.abs(s.x - 64) < 32 && Math.abs(s.z - 64) < 32
    ).slice(0, 10)
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
