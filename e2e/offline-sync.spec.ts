import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
process.env.DATABASE_URL ??= 'postgresql://fieldsync:fieldsync_dev@localhost:5433/fieldsync';
import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
test.afterAll(async () => { await prisma.$disconnect(); });

test('production PWA collects offline, rejects and repairs an invalid answer, and syncs UUIDs once', async ({ page, context, request }) => {
  const runId = `e2e-${Date.now()}`;
  const clinics = [`${runId}-valid-one`, `${runId}-invalid-then-fixed`, `${runId}-valid-two`];
  let workerId = '';

  try {
    await page.goto('/');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await page.getByLabel('Email').fill('amina@fieldsync.demo');
    await page.getByLabel('Password').fill('WorkerDemo123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Your assigned surveys' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Community Health Check' })).toBeVisible();

    const session = await page.evaluate(() => JSON.parse(localStorage.getItem('fieldsync.session') ?? 'null'));
    const me = await request.get('http://127.0.0.1:3001/api/auth/me', { headers: { Authorization: `Bearer ${session.accessToken}` } });
    expect(me.ok()).toBeTruthy();
    workerId = (await me.json()).id;

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText('● Offline')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Community Health Check' })).toBeVisible();

    const formCard = page.locator('.card').filter({ has: page.getByRole('heading', { name: 'Community Health Check' }) });
    for (const clinic of clinics) {
      await formCard.getByLabel('Nearest clinic').fill(clinic);
      await formCard.getByLabel('Children under 5').fill('2');
      await formCard.getByLabel('Visit date').fill('2026-10-08');
      await formCard.getByRole('button', { name: 'Save response' }).click();
    }
    await expect(page.locator('.status.PENDING')).toHaveCount(3);

    // Simulate a corrupted/imported local record. The UI accepted the original
    // answer; the exact-version server validator must still reject this edit.
    const rejectedClientId = await page.evaluate(async (clinic) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('fieldsync');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return await new Promise<string>((resolve, reject) => {
        const tx = db.transaction('outbox', 'readwrite');
        const store = tx.objectStore('outbox');
        const all = store.getAll();
        all.onsuccess = () => {
          const row = all.result.find((item: any) => item.answers?.clinic === clinic);
          if (!row) return reject(new Error('Could not locate the offline outbox record'));
          row.answers.children = -1;
          store.put(row);
          resolve(row.clientId);
        };
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error);
      });
    }, clinics[1]);

    await context.setOffline(false);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
      const button = [...document.querySelectorAll('button')].find(item => item.textContent?.includes('Sync now'));
      button?.click();
      button?.click();
    });

    await expect(page.locator('.status.SYNCED')).toHaveCount(2, { timeout: 20_000 });
    await expect(page.locator('.status.REJECTED')).toHaveCount(1, { timeout: 20_000 });
    await expect(page.getByText('Children under 5 must be at least 0')).toBeVisible();

    const rejectedItem = page.locator('.status.REJECTED').locator('..');
    page.on('dialog', dialog => dialog.accept(dialog.message().includes('Children under 5') ? '3' : dialog.defaultValue()));
    await rejectedItem.getByRole('button', { name: 'Edit and resubmit' }).click();
    await expect.poll(async () => prisma.response.count({ where: { workerId, clientId: rejectedClientId } }), { timeout: 10_000 }).toBe(1);
    await expect(page.locator('.status.SYNCED')).toHaveCount(3, { timeout: 20_000 });

    for (const clinic of clinics) {
      const rows = await prisma.response.findMany({ where: { workerId }, select: { answers: true } });
      expect(rows.filter(row => (row.answers as any)?.clinic === clinic)).toHaveLength(1);
    }
  } finally {
    if (workerId) {
      const rows = await prisma.response.findMany({ where: { workerId }, select: { id: true, answers: true } });
      const ids = rows.filter(row => clinics.includes(String((row.answers as any)?.clinic))).map(row => row.id);
      if (ids.length) await prisma.response.deleteMany({ where: { id: { in: ids } } });
    }
  }
});

test('admin edits a form in the UI and a pending v1 submission still uses v1 validation', async ({ page, request }) => {
  const login = async (email: string, password: string) => request.post('http://127.0.0.1:3001/api/auth/login', { data: { email, password } });
  const admin = await login('admin@fieldsync.demo', 'AdminDemo123!');
  const worker = await login('amina@fieldsync.demo', 'WorkerDemo123!');
  const adminSession = await admin.json();
  const workerSession = await worker.json();
  let formId = '';
  let versionOneId = '';
  const clientId = crypto.randomUUID();

  try {
    const definitionV1 = { title: `Version test ${Date.now()}`, fields: [{ id: 'sample', label: 'Sample count', type: 'number', required: true, min: 0, max: 10 }] };
    const created = await request.post('http://127.0.0.1:3001/api/forms', { headers: { Authorization: `Bearer ${adminSession.accessToken}` }, data: definitionV1 });
    expect(created.status()).toBe(201);
    const form = await created.json();
    formId = form.id;
    versionOneId = form.versions[0].id;
    const workerId = workerSession.user.id;
    await request.put(`http://127.0.0.1:3001/api/forms/${formId}/assignments`, { headers: { Authorization: `Bearer ${adminSession.accessToken}` }, data: { workerIds: [workerId] } });

    const definitionV2 = { ...definitionV1, fields: [{ ...definitionV1.fields[0], min: 5 }] };
    const update = await request.put(`http://127.0.0.1:3001/api/forms/${formId}`, { headers: { Authorization: `Bearer ${adminSession.accessToken}` }, data: definitionV2 });
    expect(update.ok()).toBeTruthy();

    const submit = await request.post('http://127.0.0.1:3001/api/sync', { headers: { Authorization: `Bearer ${workerSession.accessToken}` }, data: { submissions: [{ clientId, formVersionId: versionOneId, answers: { sample: 2 }, collectedAt: new Date().toISOString() }] } });
    expect((await submit.json()).results[0].status).toBe('ACCEPTED');
    const history = await request.get('http://127.0.0.1:3001/api/forms', { headers: { Authorization: `Bearer ${adminSession.accessToken}` } });
    const savedForm = (await history.json()).find((item: any) => item.id === formId);
    expect(savedForm.versions.map((item: any) => item.version)).toEqual([2, 1]);
    expect(await prisma.response.count({ where: { clientId, formVersionId: versionOneId } })).toBe(1);

    await page.goto('/');
    await page.getByLabel('Email').fill('admin@fieldsync.demo');
    await page.getByLabel('Password').fill('AdminDemo123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Forms' }).click();
    let formCard = page.locator('.card').filter({ hasText: definitionV1.title });
    await expect(formCard).toContainText('v2');
    await expect(formCard).toContainText('v1');
    await formCard.getByRole('button', { name: 'Edit form / assignments' }).click();
    await expect(page.getByLabel('Form title')).toHaveValue(definitionV1.title);
    await expect(page.locator('input[type=checkbox]').first()).toBeChecked();
    await page.getByLabel('Minimum').fill('6');
    await page.getByRole('button', { name: 'Save new version' }).click();
    await expect(page.getByText('New form version published')).toBeVisible();
    formCard = page.locator('.card').filter({ hasText: definitionV1.title });
    await expect(formCard).toContainText('v3');
  } finally {
    if (formId) {
      await prisma.response.deleteMany({ where: { clientId } });
      await prisma.form.deleteMany({ where: { id: formId } });
    }
  }
});
