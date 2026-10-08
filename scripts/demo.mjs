import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.env.npm_execpath ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
const npmPrefix = process.env.npm_execpath ? [process.env.npm_execpath] : [];
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

await run(npmCommand, [...npmPrefix, 'run', 'setup']);
await run(npmCommand, [...npmPrefix, 'run', 'build']);
console.log('\nFieldSync is starting:');
console.log('  Production preview: http://localhost:4173');
console.log('  API health:         http://localhost:3001/api/health');
console.log('  Worker login:       amina@fieldsync.demo (local development only)\n');

const children = [
  spawn(process.execPath, [path.join(root, 'server/dist/index.js')], { cwd: root, stdio: 'inherit' }),
  spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '0.0.0.0', '--port', '4173', '--strictPort'], { cwd: path.join(root, 'client'), stdio: 'inherit' })
];
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
