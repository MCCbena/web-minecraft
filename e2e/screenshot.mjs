// Captures start screen + in-game world screenshots for Phase A verification.
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
  await page.screenshot({ path: path.join(OUT, 'screenshot-phaseA-start.png') });
  console.log('saved start screen');

  // Start the game (triggers pointer lock + render loop)
  await page.click('.play-button');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(OUT, 'screenshot-phaseA-world.png') });
  console.log('saved world screen');

  // Report whether HUD elements are visible
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
      startScreen: vis('start-screen'),
    };
  });
  console.log('HUD display states: ' + JSON.stringify(hud));
  if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
  else console.log('no page errors');
} finally {
  await browser.close();
}
