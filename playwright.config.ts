import { defineConfig, devices } from '@playwright/test';

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://fieldsync:fieldsync_dev@localhost:5433/fieldsync',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'local-e2e-access-secret-at-least-32-chars',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'local-e2e-refresh-secret-at-least-32-chars',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://127.0.0.1:4173'
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4173', serviceWorkers: 'allow' },
  webServer: [
    { command: 'npm run start --workspace=server', url: 'http://127.0.0.1:3001/api/health', reuseExistingServer: !process.env.CI, timeout: 60_000, env },
    { command: 'npm run preview --workspace=client -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout: 60_000, env }
  ]
});
