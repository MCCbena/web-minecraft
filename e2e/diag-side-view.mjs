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

const dc = await page.evaluate(() => window.game.demoCenter);
console.log('Demo center:', JSON.stringify(dc));

// Camera at platform height, 10 blocks east, looking west at the demo
await page.evaluate((dc) => {
  const g = window.game;
  const s = g.player.state;
  s.position.x = dc[0] + 10;
  s.position.y = dc[1];  // same height as components
  s.position.z = dc[2];
  s.flying = true;
  s.velocity.x = 0; s.velocity.y = 0; s.velocity.z = 0;
  // Look west (toward -x) at the demo
  const dx = dc[0] - s.position.x;
  const dy = dc[1] - s.position.y;
  const dz = dc[2] - s.position.z;
  const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
  s.yaw = Math.atan2(-dx, -dz);
  s.pitch = Math.asin(dy / len);
}, dc);
await page.waitForTimeout(500);
await page.screenshot({ path: 'docs/screenshot-side-view.png' });
console.log('Side view saved');

// Also try: directly above, looking down
await page.evaluate((dc) => {
  const g = window.game;
  const s = g.player.state;
  s.position.x = dc[0];
  s.position.y = dc[1] + 15;
  s.position.z = dc[2];
  s.flying = true;
  s.velocity.x = 0; s.velocity.y = 0; s.velocity.z = 0;
  s.yaw = 0;
  s.pitch = -Math.PI / 2;  // straight down
}, dc);
await page.waitForTimeout(500);
await page.screenshot({ path: 'docs/screenshot-top-view.png' });
console.log('Top view saved');

// Check camera FOV
const fov = await page.evaluate(() => window.game.player.camera.fov);
console.log('Camera FOV:', fov);

await browser.close();
