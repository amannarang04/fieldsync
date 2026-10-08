import { access, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.env.npm_execpath ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
const npmPrefix = process.env.npm_execpath ? [process.env.npm_execpath] : [];
const canAccess = async file => access(file, constants.F_OK).then(() => true, () => false);

async function ensureEnvFile(relativePath) {
  const target = path.join(root, relativePath);
  if (await canAccess(target)) return;
  const example = await readFile(`${target}.example`, 'utf8');
  const generated = example
    .replace('replace-with-long-random-secret', randomBytes(48).toString('hex'))
    .replace('replace-with-another-long-random-secret', randomBytes(48).toString('hex'));
  await writeFile(target, generated, { flag: 'wx' });
  console.log(`Created ${relativePath} from its example${relativePath.startsWith('server') ? ' with fresh local JWT secrets' : ''}.`);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options, shell: process.platform === 'win32' && command.endsWith('.cmd') });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)));
  });
}

await ensureEnvFile(path.join('server', '.env'));
await ensureEnvFile(path.join('client', '.env'));
await run('docker', ['compose', 'up', '-d', '--wait', '--wait-timeout', '120', 'postgres']);
if (!await canAccess(path.join(root, 'node_modules', '.package-lock.json'))) {
  console.log('Dependencies are missing; running npm install.');
  await run(npmCommand, [...npmPrefix, 'install']);
}
await run(npmCommand, [...npmPrefix, 'run', 'db:generate', '--workspace=server']);
await run(npmCommand, [...npmPrefix, 'run', 'db:migrate', '--workspace=server']);
await run(npmCommand, [...npmPrefix, 'run', 'db:seed', '--workspace=server']);
console.log('FieldSync setup is ready. Run `npm run demo` to launch the production preview and API.');
