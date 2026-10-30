// Renders public/og.png from the running preview: `npm run preview`, then `node scripts/render-og.mjs`.
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ bypassCSP: true, viewport: { width: 1200, height: 630 }, colorScheme: 'light', reducedMotion: 'reduce' });
await page.goto('http://127.0.0.1:8788/', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'public/og.png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
