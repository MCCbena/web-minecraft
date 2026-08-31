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
  
  // Check blocks at the demo location
  const platformBlocks = [];
  for (let dx = -6; dx <= 6; dx++) {
    const x = px + dx;
    platformBlocks.push({
      x,
      platform: w.getBlock(x, cy - 1, pz),  // should be planks (8)
      component: w.getBlock(x, cy, pz)       // should be component or air
    });
  }
  
  // Check the pillar
  const pillarBlocks = [];
  for (let y = cy - 5; y <= cy; y++) {
    pillarBlocks.push({ y, block: w.getBlock(px, y, pz) });
  }
  
  // Check if the chunk mesh exists and has vertices near the demo
  const chunkX = Math.floor(px / 16);
  const chunkZ = Math.floor(pz / 16);
  const meshBuilder = g.meshBuilder;
  
  // Get all meshes and check for vertices near the demo
  let totalVerts = 0;
  let vertsNearDemo = 0;
  const meshes = g.scene.children.filter(c => c.isMesh);
  for (const mesh of meshes) {
    const pos = mesh.geometry.attributes.position;
    if (!pos) continue;
    totalVerts += pos.count;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      // Check if vertex is near the demo (within 15 blocks)
      if (Math.abs(vx - px) < 15 && Math.abs(vy - cy) < 10 && Math.abs(vz - pz) < 10) {
        vertsNearDemo++;
      }
    }
  }
  
  return {
    demoCenter: dc,
    platformBlocks: platformBlocks.slice(0, 5),
    pillarBlocks,
    chunkXZ: [chunkX, chunkZ],
    totalMeshes: meshes.length,
    totalVerts,
    vertsNearDemo
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
