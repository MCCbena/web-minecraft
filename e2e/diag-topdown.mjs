import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader-webgl']
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(3000);

// Click play button
await page.evaluate(() => {
  const btn = document.querySelector('.play-button');
  if (btn) btn.click();
});
await page.waitForTimeout(8000);

// Helper: set player position + look direction, take screenshot
async function setViewAndShoot(name, px, py, pz, tx, ty, tz) {
  await page.evaluate(({ px, py, pz, tx, ty, tz }) => {
    const g = window.game;
    const s = g.player.state;
    s.position.x = px;
    s.position.y = py;
    s.position.z = pz;
    s.flying = true;
    s.velocity.x = 0;
    s.velocity.y = 0;
    s.velocity.z = 0;
    // Calculate yaw and pitch to look at target
    const dx = tx - px, dy = ty - py, dz = tz - pz;
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
    s.yaw = Math.atan2(-dx, -dz);
    s.pitch = Math.asin(dy / len);
  }, { px, py, pz, tx, ty, tz });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `docs/screenshot-${name}.png` });
  console.log(`${name} saved`);
}

// 1. Top-down: above platform looking straight down
await setViewAndShoot('topdown', 32, 50, 26, 32, 35, 26);

// 2. From spawn (underwater) looking up at demo
await setViewAndShoot('from-spawn', 32.5, 17.62, 32.5, 32, 36, 26);

// 3. From above water, 30 blocks south, looking at platform
await setViewAndShoot('from-above', 32, 40, 56, 32, 35, 26);

// 4. Close-up: 5 blocks east of platform, same height
await setViewAndShoot('closeup', 37, 36, 26, 32, 35, 26);

// 5. Wide view: 40 blocks away, elevated, looking at the whole demo area
await setViewAndShoot('wide', 32, 45, 66, 32, 35, 26);

await browser.close();
console.log('Done');
