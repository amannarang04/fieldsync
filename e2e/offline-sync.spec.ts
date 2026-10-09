import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
process.env.DATABASE_URL ??= 'postgresql://fieldsync:fieldsync_dev@localhost:5433/fieldsync';
import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { readFile } from 'node:fs/promises';

const prisma = new PrismaClient();
test.afterAll(async () => { await prisma.$disconnect(); });

test('offline login is not attempted and shows a useful connection message', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  let loginRequests = 0;
  page.on('request', request => { if (request.url().endsWith('/api/auth/login')) loginRequests++; });
  await context.setOffline(true);
  await page.getByLabel('Email').fill('amina@fieldsync.demo');
  await page.getByLabel('Password').fill('WorkerDemo123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Cannot reach server. Your data is safe on this device and will sync later.')).toBeVisible();
  expect(loginRequests).toBe(0);
  await context.setOffline(false);
  await page.route('**/api/auth/login', route => route.abort('failed'));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Cannot reach server. Your data is safe on this device and will sync later.')).toBeVisible();
  expect(loginRequests).toBe(1);
});

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
    await page.locator('.survey-card').filter({ has: page.getByRole('heading', { name: 'Community Health Check' }) }).getByRole('button', { name: 'Start survey' }).click();

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

    const expiredAccessToken = jwt.sign({ id: workerId, role: 'WORKER' }, process.env.JWT_ACCESS_SECRET ?? 'local-e2e-access-secret-at-least-32-chars', { expiresIn: -1 });
    await page.evaluate(token => {
      const session = JSON.parse(localStorage.getItem('fieldsync.session')!);
      session.accessToken = token;
      localStorage.setItem('fieldsync.session', JSON.stringify(session));
    }, expiredAccessToken);
    // Reload while offline so the API module initializes from the expired token.
    await page.reload();
    await expect(page.getByText('● Offline')).toBeVisible();

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
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fieldsync.session')!).accessToken)).not.toBe(expiredAccessToken);

    const rejectedItem = page.locator('.outbox-item').filter({ has: page.locator('.status.REJECTED') });
    await rejectedItem.getByRole('button', { name: 'Edit and resubmit' }).click();
    const editor = page.locator('.card').filter({ hasText: 'Edit rejected response' });
    await editor.getByLabel('Children under 5').fill('3');
    await editor.getByRole('button', { name: 'Save and resubmit' }).click();
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

test('rejected response editor supports choices, conditions, dates, and GPS', async ({ page, request }) => {
  const runId = `editor-${Date.now()}`;
  const title = `Editor test ${runId}`;
  const clientId = crypto.randomUUID();
  const admin = await request.post('http://127.0.0.1:3001/api/auth/login', { data: { email: 'admin@fieldsync.demo', password: 'AdminDemo123!' } });
  const worker = await request.post('http://127.0.0.1:3001/api/auth/login', { data: { email: 'amina@fieldsync.demo', password: 'WorkerDemo123!' } });
  const adminSession = await admin.json();
  const workerSession = await worker.json();
  const fields = [
    { id: 'source', label: 'Source', type: 'single_choice', required: true, options: ['Well', 'Pipe'] },
    { id: 'details', label: 'Well details', type: 'text', required: true, condition: { fieldId: 'source', equals: 'Well' } },
    { id: 'checks', label: 'Checks completed', type: 'multiple_choice', required: true, options: ['Water test', 'Cover check'] },
    { id: 'visit', label: 'Visit date', type: 'date', required: true },
    { id: 'location', label: 'Location', type: 'gps', required: true },
    { id: 'count', label: 'Households', type: 'number', required: true, min: 1, max: 50 }
  ];
  let formId = '';
  try {
    const created = await request.post('http://127.0.0.1:3001/api/forms', { headers: { Authorization: `Bearer ${adminSession.accessToken}` }, data: { title, fields } });
    expect(created.status()).toBe(201);
    const form = await created.json(); formId = form.id;
    await request.put(`http://127.0.0.1:3001/api/forms/${formId}/assignments`, { headers: { Authorization: `Bearer ${adminSession.accessToken}` }, data: { workerIds: [workerSession.user.id] } });

    await page.goto('/');
    await page.getByLabel('Email').fill('amina@fieldsync.demo');
    await page.getByLabel('Password').fill('WorkerDemo123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await page.evaluate(async payload => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('fieldsync'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('outbox', 'readwrite');
        tx.objectStore('outbox').put(payload);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      });
    }, { clientId, formVersionId: form.versions[0].id, formTitle: title, answers: { source: 'Well', details: 'Old details', checks: ['invalid legacy choice'], visit: '2026-10-08', location: { lat: 1, lng: 2 }, count: 2 }, collectedAt: new Date().toISOString(), lat: 1, lng: 2, status: 'REJECTED', reasons: ['Checks completed has invalid choices'], attempts: 0 });
    await page.reload();
    await expect(page.getByText('Checks completed has invalid choices')).toBeVisible();
    const responseItem = page.locator('.card').filter({ hasText: title }).filter({ has: page.getByRole('button', { name: 'Edit and resubmit' }) });
    await responseItem.getByRole('button', { name: 'Edit and resubmit' }).click();
    const editor = page.locator('.card').filter({ hasText: 'Edit rejected response' });
    await expect(editor.getByLabel('Well details')).toBeVisible();
    await editor.getByLabel('Well details').fill('Updated field notes');
    await editor.getByLabel('Water test').check();
    await editor.getByLabel('Visit date').fill('2026-10-09');
    await editor.getByLabel('Location').fill('3.5, 4.5');
    await editor.getByLabel('Households').fill('7');
    await editor.getByRole('button', { name: 'Save and resubmit' }).click();
    await expect.poll(() => prisma.response.count({ where: { clientId } }), { timeout: 15_000 }).toBe(1);
    const saved = await prisma.response.findUnique({ where: { clientId } });
    expect(saved?.answers).toMatchObject({ source: 'Well', details: 'Updated field notes', checks: ['Water test'], visit: '2026-10-09', location: { lat: 3.5, lng: 4.5 }, count: 7 });
  } finally {
    await prisma.response.deleteMany({ where: { clientId } });
    if (formId) await prisma.form.deleteMany({ where: { id: formId } });
  }
});

test('unassigned workers cannot read another response or submit to an unassigned form', async ({ request }) => {
  const api = 'http://127.0.0.1:3001/api';
  const login = async (email: string, password: string) => (await request.post(`${api}/auth/login`, { data: { email, password } })).json();
  const admin = await login('admin@fieldsync.demo', 'AdminDemo123!');
  const assigned = await login('amina@fieldsync.demo', 'WorkerDemo123!');
  const email = `unassigned-${Date.now()}@fieldsync.demo`;
  let temporaryWorkerId = '';
  try {
    const workerCreate = await request.post(`${api}/admin/workers`, { headers: { Authorization: `Bearer ${admin.accessToken}` }, data: { email, name: 'Unassigned E2E', password: 'WorkerDemo123!' } });
    expect(workerCreate.status()).toBe(201);
    temporaryWorkerId = (await workerCreate.json()).id;
    const unassigned = await login(email, 'WorkerDemo123!');
    const existing = await request.get(`${api}/responses?workerId=${assigned.user.id}`, { headers: { Authorization: `Bearer ${admin.accessToken}` } });
    const responseId = (await existing.json()).items[0]?.id;
    expect(responseId).toBeTruthy();
    const privateRead = await request.get(`${api}/responses/${responseId}`, { headers: { Authorization: `Bearer ${unassigned.accessToken}` } });
    expect(privateRead.status()).toBe(404);

    const forms = await request.get(`${api}/forms/assigned`, { headers: { Authorization: `Bearer ${assigned.accessToken}` } });
    const form = (await forms.json())[0];
    const result = await request.post(`${api}/sync`, { headers: { Authorization: `Bearer ${unassigned.accessToken}` }, data: { submissions: [{ clientId: crypto.randomUUID(), formVersionId: form.versions[0].id, answers: {}, collectedAt: new Date().toISOString() }] } });
    expect((await result.json()).results[0]).toMatchObject({ status: 'REJECTED', reasons: ['This form is no longer assigned to you'] });
  } finally {
    if (temporaryWorkerId) await prisma.user.deleteMany({ where: { id: temporaryWorkerId } });
  }
});

test('dashboard filters paginate server results and export the same active filters', async ({ page }) => {
  const runId = `filter-${Date.now()}`;
  const prefix = `FILTER-${runId}`;
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@fieldsync.demo' } });
  const worker = await prisma.user.findUniqueOrThrow({ where: { email: 'amina@fieldsync.demo' } });
  const otherWorker = await prisma.user.findUniqueOrThrow({ where: { email: 'leo@fieldsync.demo' } });
  const form = await prisma.form.findFirstOrThrow({ where: { title: 'Community Health Check' }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } });
  const version = form.versions[0];
  const ids = Array.from({ length: 53 }, () => crypto.randomUUID());
  try {
    await prisma.response.createMany({ data: [
      ...ids.slice(0, 51).map((clientId, index) => ({ clientId, formVersionId: version.id, workerId: worker.id, answers: { clinic: `${prefix}-match-${index}`, children: 4, date: '2026-09-17' } as any, collectedAt: new Date('2026-09-17T12:00:00.000Z'), status: 'ACCEPTED' as const })),
      { clientId: ids[51], formVersionId: version.id, workerId: otherWorker.id, answers: { clinic: `${prefix}-other-worker`, children: 2, date: '2026-09-17' }, collectedAt: new Date('2026-09-17T12:00:00.000Z'), status: 'ACCEPTED' },
      { clientId: ids[52], formVersionId: version.id, workerId: worker.id, answers: { clinic: `${prefix}-other-day`, children: 2, date: '2026-09-16' }, collectedAt: new Date('2026-09-16T12:00:00.000Z'), status: 'ACCEPTED' }
    ] });

    await page.goto('/');
    await page.getByLabel('Email').fill('admin@fieldsync.demo');
    await page.getByLabel('Password').fill('AdminDemo123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Responses' }).click();
    await page.getByLabel('Form').selectOption({ label: 'Community Health Check' });
    await page.getByLabel('Worker').selectOption({ label: 'Amina Yusuf' });
    await page.getByLabel('Status').selectOption('ACCEPTED');
    await page.getByLabel('From').fill('2026-09-17');
    await page.getByLabel('To').fill('2026-09-17');
    await expect(page.getByText('Page 1 of 2 · 51 responses')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(50);
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Page 2 of 2 · 51 responses')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(1);

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download filtered CSV' }).click()]);
    const csv = await readFile((await download.path())!, 'utf8');
    expect(csv).toContain(`${prefix}-match-0`);
    expect(csv).not.toContain(`${prefix}-other-worker`);
    expect(csv).not.toContain(`${prefix}-other-day`);
    expect(csv.trim().split(/\r?\n/)).toHaveLength(52);
  } finally {
    await prisma.response.deleteMany({ where: { clientId: { in: ids } } });
  }
});
