import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function main() {
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.env.npm_execpath ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
const npmPrefix = process.env.npm_execpath ? [process.env.npm_execpath] : [];
const apiUrl = 'http://localhost:3001/api/health';
const previewUrl = 'http://localhost:4173';

async function httpOk(url) {
  try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); return response.ok; }
  catch { return false; }
}
function portIsFree(port) {
  return new Promise(resolve => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}
async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' && command.endsWith('.cmd') });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}
function npmRun(...args) { return run(npmCommand, [...npmPrefix, 'run', ...args]); }

const apiReady = await httpOk(apiUrl);
const previewReady = await httpOk(previewUrl);
const apiFree = await portIsFree(3001);
const previewFree = await portIsFree(4173);
if (apiReady && previewReady) {
  console.log('FieldSync is already running:');
  console.log(`  Production preview: ${previewUrl}`);
  console.log(`  API health:         ${apiUrl}`);
  return;
}
if (!apiReady && !apiFree) throw new Error('Port 3001 is occupied by a process that is not responding as the FieldSync API. Stop it before starting the demo.');
if (!previewReady && !previewFree) throw new Error('Port 4173 is occupied by a process that is not responding as the FieldSync preview. Stop it before starting the demo.');

if (!apiReady && !previewReady) {
  await npmRun('setup');
  await npmRun('build');
} else if (previewReady) {
  // Recover a preview that was started separately without its API. Do not rebuild
  // the open preview's files; only provision the database and compile the server.
  await npmRun('setup');
  await npmRun('build', '--workspace=shared');
  await npmRun('build', '--workspace=server');
} else {
  // Recover an API that is already running without touching Prisma's locked
  // query-engine file. Only build the client that the preview needs.
  const distIndex = path.join(root, 'client/dist/index.html');
  await access(distIndex, constants.F_OK).catch(async () => {
    await npmRun('build', '--workspace=shared');
    await npmRun('build', '--workspace=client');
  });
}

console.log('\nFieldSync is starting:');
console.log(`  Production preview: ${previewUrl}`);
console.log(`  API health:         ${apiUrl}`);
console.log('  Worker login:       amina@fieldsync.demo (local development only)\n');

const children = [];
if (!apiReady) children.push(spawn(process.execPath, [path.join(root, 'server/dist/index.js')], { cwd: root, stdio: 'inherit' }));
if (!previewReady) children.push(spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '0.0.0.0', '--port', '4173', '--strictPort'], { cwd: path.join(root, 'client'), stdio: 'inherit' }));
let stopping = false;
function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill(signal);
}
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
for (const child of children) {
  child.on('error', error => { console.error(error); stop(); process.exitCode = 1; });
  child.on('exit', code => {
    if (!stopping && code !== 0) {
      console.error(`A FieldSync service exited with status ${code}.`);
      process.exitCode = code ?? 1;
      stop();
    }
  });
}
}

await main();
