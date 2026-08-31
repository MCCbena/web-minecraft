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

// Get new spawn info
const info = await page.evaluate(() => {
  const g = window.game;
  const s = g.player.state;
  return {
    pos: { x: s.position.x, y: s.position.y, z: s.position.z },
    demoCenter: g.demoCenter,
    started: g.started
  };
});
console.log('Spawn:', JSON.stringify(info));

// Screenshot 1: Default view from new spawn (should see demo in front)
await page.screenshot({ path: 'docs/screenshot-new-spawn.png' });
console.log('1. New spawn default view saved');

// Screenshot 2: Look directly at the demo
await page.evaluate(() => {
  const g = window.game;
  const s = g.player.state;
  const dc = g.demoCenter;
  const dx = dc[0] - s.position.x;
  const dy = dc[1] - (s.position.y + s.eyeHeight);
  const dz = dc[2] - s.position.z;
  const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
  s.yaw = Math.atan2(-dx, -dz);
  s.pitch = Math.asin(dy / len);
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'docs/screenshot-look-demo.png' });
console.log('2. Looking at demo saved');

// Screenshot 3: Close-up of demo (fly to it)
await page.evaluate(() => {
  const g = window.game;
  const s = g.player.state;
  const dc = g.demoCenter;
  s.position.x = dc[0] + 8;
  s.position.y = dc[1] + 2;
  s.position.z = dc[2];
  s.flying = true;
  s.velocity.x = 0; s.velocity.y = 0; s.velocity.z = 0;
  const dx = dc[0] - s.position.x;
  const dy = dc[1] - s.position.y;
  const dz = dc[2] - s.position.z;
  const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
  s.yaw = Math.atan2(-dx, -dz);
  s.pitch = Math.asin(dy / len);
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'docs/screenshot-demo-closeup.png' });
console.log('3. Demo closeup saved');

await browser.close();
console.log('Done');
