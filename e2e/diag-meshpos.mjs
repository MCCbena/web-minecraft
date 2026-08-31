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
    const mesh = mb.getChunkMesh(key).opaque;
    mesh.updateWorldMatrix(true, false);
    const pos = mesh.geometry.getAttribute('position');
    // First vertex in local coords
    const local = new (Object.getPrototypeOf(mesh).constructor === Object ? Object : Object)();
    // Use THREE.Vector3 via the mesh's geometry
    const v = { x: pos.getX(0), y: pos.getY(0), z: pos.getZ(0) };
    // Manually apply the mesh transform: world = local + position (no rotation/scale)
    const world = {
      x: v.x + mesh.position.x,
      y: v.y + mesh.position.y,
      z: v.z + mesh.position.z,
    };
    // Find a vertex near the platform in LOCAL coords (local x = 38-32=6, y=35, z=26-16=10)
    let platformLocal = 0;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i), ly = pos.getY(i), lz = pos.getZ(i);
      // local coords: platform at lx=6, ly=35, lz=10 (if local) OR lx=38, ly=35, lz=26 (if world)
      if ((Math.abs(lx - 6) < 2 && Math.abs(ly - 35) < 2 && Math.abs(lz - 10) < 2) ||
          (Math.abs(lx - 38) < 2 && Math.abs(ly - 35) < 2 && Math.abs(lz - 26) < 2)) {
        platformLocal++;
      }
    }
    return {
      meshPosition: [mesh.position.x, mesh.position.y, mesh.position.z],
      firstVertexLocal: v,
      firstVertexWorld: world,
      platformLocalVerts: platformLocal,
      totalVerts: pos.count,
    };
  });
  console.log(JSON.stringify(out, null, 2));
} finally {
  await browser.close();
}
