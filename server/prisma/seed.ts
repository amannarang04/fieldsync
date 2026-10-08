import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: process.env.ENV_FILE ?? resolve(existsSync('server/.env') ? 'server/.env' : '.env') });

const prisma = new PrismaClient();

function seedPassword(name: 'SEED_ADMIN_PASSWORD' | 'SEED_WORKER_PASSWORD', developmentFallback: string) {
  const configured = process.env[name]?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set before seeding in production.`);
  }
  return developmentFallback;
}

async function main() {
  const adminPassword = seedPassword('SEED_ADMIN_PASSWORD', 'AdminDemo123!');
  const workerPassword = seedPassword('SEED_WORKER_PASSWORD', 'WorkerDemo123!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fieldsync.demo' }, update: {},
    create: { email: 'admin@fieldsync.demo', name: 'FieldSync Admin', passwordHash: await bcrypt.hash(adminPassword, 12), role: 'ADMIN' }
  });
  const workers = [];
  for (const [email, name] of [['amina@fieldsync.demo', 'Amina Yusuf'], ['leo@fieldsync.demo', 'Leo Chen']]) {
    workers.push(await prisma.user.upsert({
      where: { email }, update: {},
      create: { email, name, passwordHash: await bcrypt.hash(workerPassword, 12), role: 'WORKER' }
    }));
  }
  const definitions = [
    { title: 'Water Access Survey', fields: [
      { id: 'village', label: 'Village', type: 'text', required: true },
      { id: 'water_source', label: 'Main water source', type: 'single_choice', required: true, options: ['Piped', 'Well', 'River', 'Other'] },
      { id: 'water_quality', label: 'Is water treated?', type: 'single_choice', required: true, options: ['Yes', 'No'], condition: { fieldId: 'water_source', equals: 'Well' } },
      { id: 'households', label: 'Households served', type: 'number', required: true, min: 1, max: 5000 },
      { id: 'location', label: 'Survey location', type: 'gps', required: false }
    ] },
    { title: 'Community Health Check', fields: [
      { id: 'clinic', label: 'Nearest clinic', type: 'text', required: true },
      { id: 'children', label: 'Children under 5', type: 'number', required: true, min: 0, max: 1000 },
      { id: 'date', label: 'Visit date', type: 'date', required: true }
    ] }
  ];
  const created = [];
  for (const definition of definitions) {
    let form = await prisma.form.findFirst({ where: { title: definition.title } });
    if (!form) form = await prisma.form.create({ data: { title: definition.title } });
    let version = await prisma.formVersion.findFirst({ where: { formId: form.id, version: 1 } });
    if (!version) version = await prisma.formVersion.create({ data: { formId: form.id, version: 1, title: form.title, fields: definition.fields as any } });
    created.push({ form, version });
  }
  for (const worker of workers) for (const { form } of created) {
    await prisma.formAssignment.upsert({ where: { formId_workerId: { formId: form.id, workerId: worker.id } }, update: {}, create: { formId: form.id, workerId: worker.id } });
  }
  for (let i = 0; i < 3; i++) {
    const { version } = created[i % 2];
    const worker = workers[i % workers.length];
    const clientId = `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
    await prisma.response.upsert({
      where: { clientId }, update: {},
      create: {
        clientId, formVersionId: version.id, workerId: worker.id,
        answers: i % 2 === 0
          ? { village: 'Demo village', water_source: 'Well', water_quality: 'Yes', households: 42 }
          : { clinic: 'North clinic', children: 9, date: '2026-01-10' },
        lat: 20.5937 + i * 0.1, lng: 78.9629 + i * 0.1,
        collectedAt: new Date(Date.now() - i * 86400000), status: 'ACCEPTED'
      }
    });
  }
  console.log(`Seeded admin ${admin.email}, ${workers.length} workers, and ${created.length} forms.`);
}

main()
  .catch(error => { console.error(`Seed failed: ${error instanceof Error ? error.message : error}`); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
