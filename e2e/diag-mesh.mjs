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
    const [dx, cy, dz] = g.demoCenter;
    const get = (x, y, z) => g.world.getBlock(x, y, z);
    // Demo is at [32,35,26] -> chunk (2,1) covers x 32..47, z 16..31
    const cx = Math.floor(32 / 16), cz = Math.floor(26 / 16);
    const key = `${cx},${cz}`;
    const chunkMesh = mb.getChunkMesh(key);
    // Check the opaque mesh geometry for vertices near the platform (world x~38, y~35)
    let nearPlatformVerts = 0;
    let totalVerts = 0;
    if (chunkMesh?.opaque) {
      const pos = chunkMesh.opaque.geometry.getAttribute('position');
      totalVerts = pos.count;
      // mesh position is at chunk origin (worldX = cx*16, worldZ = cz*16)
      const ox = cx * 16, oz = cz * 16;
      for (let i = 0; i < pos.count; i++) {
        const wx = pos.getX(i) + ox, wy = pos.getY(i), wz = pos.getZ(i) + oz;
        if (wx > 37 && wx < 40 && wy > 34 && wy < 37 && wz > 24 && wz < 28) nearPlatformVerts++;
      }
    }
    // Scene mesh count
    let sceneMeshCount = 0;
    g.scene.traverse((o) => { if (o.isMesh) sceneMeshCount++; });
    // Is the chunk mesh in the scene?
    let chunkInScene = false;
    g.scene.traverse((o) => { if (o === chunkMesh?.opaque) chunkInScene = true; });
    return {
      demoCenter: [dx, cy, dz],
      blockAtEastFace: get(38, 35, 26),
      blockAtCenter: get(32, 35, 26),
      chunkKey: key,
      chunkHasOpaque: !!chunkMesh?.opaque,
      chunkOpaqueVerts: totalVerts,
      nearPlatformVerts,
      sceneMeshCount,
      chunkInScene,
    };
  });
  console.log(JSON.stringify(out, null, 2));
} finally {
  await browser.close();
}
