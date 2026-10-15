import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import dotenv from 'dotenv';

const root = process.cwd();
const directory = path.join(root, '.local', 'postgres');
const binaries = process.env.POSTGRES_BIN || 'D:/PostgreSQL/bin';
const port = 55432;
const exists = async (file) =>
  fs
    .access(file)
    .then(() => true)
    .catch(() => false);
const run = (name, args) => {
  const result = spawnSync(path.join(binaries, `${name}.exe`), args, {
    stdio: 'ignore',
    windowsHide: true,
  });
  if (result.status !== 0)
    throw new Error(`${name} failed. See .local/postgres.log for startup diagnostics.`);
};
await fs.mkdir(path.join(root, '.local'), { recursive: true });
let environment;
if (await exists(path.join(root, '.env'))) {
  environment = dotenv.parse(await fs.readFile(path.join(root, '.env')));
  if (!environment.DATABASE_URL?.includes(`127.0.0.1:${port}/`))
    throw new Error(
      'Existing .env uses another database. Preserve it and configure that connection manually.',
    );
} else {
  const password = crypto.randomBytes(24).toString('hex');
  const url = `postgres://squadup:${password}@127.0.0.1:${port}/squadup`;
  const testUrl = new URL(url);
  testUrl.pathname = '/squadup_test';
  const content = `NODE_ENV=development\nPORT=4000\nCLIENT_ORIGIN=http://localhost:5173\nDATABASE_URL=${url}\nTEST_DATABASE_URL=${testUrl.href}\nDATABASE_SSL=false\nJWT_SECRET=${crypto.randomBytes(48).toString('hex')}\nVITE_DEMO_MODE=false\nVITE_API_URL=http://localhost:4000/api\nVITE_SOCKET_URL=http://localhost:4000\n`;
  environment = dotenv.parse(content);
  await fs.writeFile(path.join(root, '.env'), content, { flag: 'wx' });
}
if (!(await exists(path.join(directory, 'PG_VERSION')))) {
  const passwordFile = path.join(root, '.local', 'initdb-password.tmp');
  await fs.writeFile(passwordFile, new URL(environment.DATABASE_URL).password);
  try {
    run('initdb', [
      '-D',
      directory,
      '-U',
      'squadup',
      '-A',
      'scram-sha-256',
      '--encoding=UTF8',
      '--no-locale',
      `--pwfile=${passwordFile}`,
    ]);
  } finally {
    await fs.unlink(passwordFile);
  }
}
const status = spawnSync(path.join(binaries, 'pg_ctl.exe'), ['status', '-D', directory], {
  encoding: 'utf8',
  windowsHide: true,
});
if (status.status !== 0)
  run('pg_ctl', [
    'start',
    '-D',
    directory,
    '-l',
    path.join(root, '.local', 'postgres.log'),
    '-o',
    `-h 127.0.0.1 -p ${port}`,
    '-w',
  ]);
const adminUrl = new URL(environment.DATABASE_URL);
adminUrl.pathname = '/postgres';
const testUrl = new URL(environment.DATABASE_URL);
testUrl.pathname = '/squadup_test';
const envFile = path.join(root, '.env');
const envContent = await fs.readFile(envFile, 'utf8');
await fs.writeFile(
  envFile,
  envContent.replace(/^TEST_DATABASE_URL=.*$/m, `TEST_DATABASE_URL=${testUrl.href}`),
);
const client = new pg.Client({ connectionString: adminUrl.href });
await client.connect();
try {
  for (const database of ['squadup', 'squadup_test']) {
    const result = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [database]);
    if (!result.rowCount) await client.query(`CREATE DATABASE "${database}"`);
  }
} finally {
  await client.end();
}
console.log(
  'Isolated local PostgreSQL ready on 127.0.0.1:55432. Credentials are saved only in ignored .env.',
);
