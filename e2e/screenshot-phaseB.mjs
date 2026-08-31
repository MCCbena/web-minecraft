// Captures Phase B screenshots: world with pigs, water, and save/load buttons.
import { chromium } from '@playwright/test';
import path from 'node:path';

const URL = 'http://localhost:4173/';
const OUT = path.resolve('docs');

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader-webgl'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  // Start the game
  await page.click('.play-button');
  await page.waitForTimeout(4000);

  // Screenshot the world
  await page.screenshot({ path: path.join(OUT, 'screenshot-phaseB-world.png') });
  console.log('saved screenshot-phaseB-world.png');

  // Check HUD elements
  const hud = await page.evaluate(() => {
    const vis = (id) => {
      const el = document.getElementById(id);
      if (!el) return 'missing';
      return getComputedStyle(el).display;
    };
    return {
      crosshair: vis('crosshair'),
      hotbar: vis('hotbar'),
      coords: vis('coords'),
      fps: vis('fps'),
      blockName: vis('block-name'),
      saveBtn: vis('save-btn'),
      loadBtn: vis('load-btn'),
      startScreen: vis('start-screen'),
    };
  });
  console.log('HUD display states: ' + JSON.stringify(hud));

  if (errors.length) {
    console.log('PAGE ERRORS:\n' + errors.join('\n'));
  } else {
    console.log('no page errors');
  }

  // Try to break a block for particles screenshot
  // Move mouse to center and click to break
  await page.mouse.move(640, 360);
  await page.waitForTimeout(500);
  // Left click to break block
  await page.mouse.click(640, 360);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'screenshot-phaseB-particles.png') });
  console.log('saved screenshot-phaseB-particles.png');

} finally {
  await browser.close();
}
