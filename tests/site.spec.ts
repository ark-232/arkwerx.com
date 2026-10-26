import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const HEADINGS = ['Selected work', 'Also building', 'Community and earlier', 'Security practice', 'Writing', 'Education', 'Contact'];

async function fillValid(page: Page) {
  await page.getByLabel('Name').fill('Ada Lovelace');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('A question about my work').check();
  await page.getByLabel('Message').fill('Does quillify read XFA forms?');
}

test('loads every resource from its own origin and sets no cookies', async ({ page, context, baseURL }) => {
  const origins = new Set<string>();
  page.on('request', (r) => origins.add(new URL(r.url()).origin));
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForLoadState('networkidle');
  expect([...origins]).toEqual([new URL(baseURL!).origin]);
  expect(await context.cookies()).toEqual([]);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`has no axe violations or console errors in ${colorScheme} mode`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('does not scroll sideways at 320 px', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 320, height: 640 } });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.close();
});

test('reads in full with JavaScript off', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  for (const name of HEADINGS) await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
  await expect(page.locator('.hero-art')).toBeHidden();
  await expect(page.locator('form.contact-form')).toBeHidden();
  await expect(page.getByText('The form needs JavaScript.')).toBeVisible();
  await context.close();
});

test('serves the 404 page for unknown paths', async ({ page }) => {
  const response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Nothing is filed at this address.' })).toBeVisible();
});

test.describe('contact form', () => {
  test('names each missing field and sends nothing', async ({ page }) => {
    let posted = false;
    await page.route('**/api/contact', (route) => {
      posted = true;
      return route.fulfill({ json: { ok: true } });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('#c-name-error')).toHaveText('Enter your name.');
    await expect(page.locator('#c-email-error')).toHaveText('Enter an email address I can reply to.');
    await expect(page.locator('#c-topic-error')).toHaveText('Pick what it is about.');
    await expect(page.locator('#c-message-error')).toHaveText('Write a message.');
    await expect(page.getByLabel('Name')).toBeFocused();
    expect(posted).toBe(false);
  });

  test('shows the sent panel after a successful post', async ({ page }) => {
    let body = '';
    await page.route('**/api/contact', (route) => {
      body = route.request().postData() ?? '';
      return route.fulfill({ json: { ok: true } });
    });
    await page.goto('/');
    await fillValid(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('heading', { name: 'Message sent' })).toBeFocused();
    await expect(page.locator('form.contact-form')).toBeHidden();
    const sent = new URLSearchParams(body);
    expect(sent.get('topic')).toBe('question');
    expect(Number(sent.get('elapsed'))).toBeGreaterThan(0);
  });

  test('explains a rate limit and a dropped connection, and keeps the text', async ({ page }) => {
    await page.goto('/');
    await fillValid(page);
    await page.route('**/api/contact', (route) => route.fulfill({ status: 429, json: { error: 'rate_limited' } }));
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('status')).toContainText('Too many messages');
    await page.unroute('**/api/contact');
    await page.route('**/api/contact', (route) => route.abort());
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('status')).toContainText('did not send');
    await expect(page.getByLabel('Message')).toHaveValue('Does quillify read XFA forms?');
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
  });

  test('treats a filled honeypot as sent without posting', async ({ page }) => {
    let posted = false;
    await page.route('**/api/contact', (route) => {
      posted = true;
      return route.fulfill({ json: { ok: true } });
    });
    await page.goto('/');
    await fillValid(page);
    await page.locator('#c-botcheck').fill('bot', { force: true });
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('heading', { name: 'Message sent' })).toBeVisible();
    expect(posted).toBe(false);
  });
});

test('the local Worker accepts a same-origin message and refuses a cross-origin one', async ({ request, baseURL }) => {
  const form = { name: 'Ada', email: 'ada@example.com', topic: 'other', message: 'Hello', elapsed: '9000', botcheck: '' };
  const ok = await request.post('/api/contact', { form, headers: { Origin: baseURL! } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toEqual({ ok: true });
  const forbidden = await request.post('/api/contact', { form, headers: { Origin: 'https://evil.example' } });
  expect(forbidden.status()).toBe(403);
});

test('the hero frame at a given t does not depend on the frames drawn before it', async ({ page }) => {
  const source = stripTypeScriptTypes(readFileSync('src/hero/scene.ts', 'utf8'));
  await page.setContent('<canvas width="960" height="640"></canvas>');
  await page.addScriptTag({ type: 'module', content: `${source}\nwindow.__seek = seek;` });
  await page.waitForFunction(() => 'seek' in window || '__seek' in window);
  const frames = await page.evaluate(() => {
    const palette = { sheet: '#FFFFFF', desk: '#F1F4F7', ink: '#12233D', muted: '#4A5A70', form: '#2B4FA8', rule: '#8FA3BF', canary: '#F5C542', onCanary: '#12233D' };
    const canvas = document.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;
    const seek = (window as unknown as { __seek: (c: CanvasRenderingContext2D, t: number, p: object, l: string) => void }).__seek;
    const at = (t: number) => {
      seek(ctx, t, palette, 'wide');
      return canvas.toDataURL();
    };
    const cold = at(0.62);
    for (let t = 0; t <= 1; t += 0.05) at(t);
    const afterForward = at(0.62);
    for (let t = 1; t >= 0; t -= 0.05) at(t);
    const afterBackward = at(0.62);
    return { cold, afterForward, afterBackward };
  });
  expect(frames.afterForward).toBe(frames.cold);
  expect(frames.afterBackward).toBe(frames.cold);
});
