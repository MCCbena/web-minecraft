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
  await page.waitForTimeout(4000);

  const out = await page.evaluate(() => {
    const g = window.game;
    const [dx, cy, dz] = g.demoCenter;
    const get = (x, y, z) => g.world.getBlock(x, y, z);
    const names = { 0:'air',1:'grass',2:'dirt',3:'stone',4:'sand',5:'gravel',6:'log',7:'leaves',8:'planks',9:'water',10:'cobble',11:'bedrock',12:'lava',13:'dust',14:'torch',15:'lamp',16:'lever',17:'button',18:'rblock',19:'repeater',20:'comp',21:'obs',22:'piston' };
    const nm = (b) => names[b] ?? b;
    // Horizontal slice at component level (cy), x from dx-7..dx+7, z from dz-2..dz+2
    let hz = `--- horizontal slice at y=${cy} (x ${dx-7}..${dx+7}, z ${dz-2}..${dz+2}) ---\n`;
    for (let z = dz + 2; z >= dz - 2; z--) {
      let row = `z=${z}: `;
      for (let x = dx - 7; x <= dx + 7; x++) {
        row += nm(get(x, cy, z)) + ' ';
      }
      hz += row + '\n';
    }
    // Vertical slice at demo x,z, y from cy-6..cy+2
    let vs = `--- vertical slice at x=${dx},z=${dz} (y ${cy-6}..${cy+2}) ---\n`;
    for (let y = cy + 2; y >= cy - 6; y--) {
      vs += `y=${y}: ${nm(get(dx, y, dz))}\n`;
    }
    // Water level scan at demo and nearby
    const waterAt = (x, z) => { for (let y = 63; y >= 0; y--) { if (get(x, y, z) === 9) return y; } return -1; };
    const wl = { demo: waterAt(dx, dz), east8: waterAt(dx + 8, dz), west8: waterAt(dx - 8, dz), south8: waterAt(dx, dz + 8) };
    // Lamp states
    const lampOn = (x, y, z) => { const s = g.redstoneSystem.getComponentState(x, y, z); return s ? s.on : null; };
    const lamps = { A: lampOn(dx - 2, cy, dz), B: lampOn(dx + 2, cy, dz), C: lampOn(dx + 6, cy, dz) };
    return { demoCenter: [dx, cy, dz], hz, vs, waterLevels: wl, lamps };
  });
  console.log('CENTER', JSON.stringify(out.demoCenter));
  console.log(out.hz);
  console.log(out.vs);
  console.log('WATER', JSON.stringify(out.waterLevels));
  console.log('LAMPS', JSON.stringify(out.lamps));
} finally {
  await browser.close();
}
