import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const output = 'docs/screenshots';
const sizes = [{ name: 'mobile-375', width: 375, height: 812 }, { name: 'tablet-768', width: 768, height: 1024 }, { name: 'desktop-1280', width: 1280, height: 900 }];
const browser = await chromium.launch({ headless: true });
await mkdir(output, { recursive: true });

async function signIn(page, email, password) {
  await page.goto('http://localhost:4173');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('heading', { name: email.includes('admin') ? 'Survey dashboard' : 'Your assigned surveys' }).waitFor();
  await page.waitForTimeout(2900);
}
async function capture(role, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  if (role === 'login') {
    await page.goto('http://localhost:4173');
    await page.getByRole('heading', { name: 'Sign in to your workspace' }).waitFor();
    await page.screenshot({ path: `${output}/login-${viewport.name}.png`, fullPage: false });
  } else if (role === 'worker') {
    await signIn(page, 'amina@fieldsync.demo', 'WorkerDemo123!');
    await page.screenshot({ path: `${output}/worker-collect-${viewport.name}.png`, fullPage: false });
    await page.getByRole('button', { name: 'My responses' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('heading', { name: 'My responses' }).waitFor();
    await page.screenshot({ path: `${output}/worker-responses-${viewport.name}.png`, fullPage: false });
  } else {
    await signIn(page, 'admin@fieldsync.demo', 'AdminDemo123!');
    await page.screenshot({ path: `${output}/admin-dashboard-${viewport.name}.png`, fullPage: false });
    if (viewport.width <= 640) await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.getByRole('button', { name: 'Forms' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('heading', { name: 'Form builder' }).waitFor();
    await page.screenshot({ path: `${output}/form-builder-${viewport.name}.png`, fullPage: false });
  }
  await context.close();
}
for (const viewport of sizes) {
  await capture('login', viewport);
  await capture('worker', viewport);
  await capture('admin', viewport);
}
await browser.close();
console.log(`Saved 15 screenshots in ${output}`);
