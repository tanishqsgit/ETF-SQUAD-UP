import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import assert from 'node:assert/strict';

const url = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/squadup')
  throw new Error('This backup helper only supports the local squadup database.');
const binaries = process.env.POSTGRES_BIN || 'D:/PostgreSQL/bin';
const backup = path.resolve(
  '.local/backups',
  new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex'),
);
await fs.mkdir(backup, { recursive: true });
const dump = path.join(backup, 'database.dump');
const restoreName = `squadup_restore_${crypto.randomBytes(6).toString('hex')}`;
const user = decodeURIComponent(url.username);
const common = ['--host', url.hostname, '--port', url.port || '5432', '--username', user];
function run(name, args) {
  const result = spawnSync(
    path.join(binaries, process.platform === 'win32' ? `${name}.exe` : name),
    args,
    {
      env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
      stdio: 'ignore',
      windowsHide: true,
    },
  );
  if (result.status !== 0)
    throw new Error(
      `${name} failed; original data is unchanged and the backup directory is retained.`,
    );
}
const original = new pg.Client({ connectionString: url.href });
let restored,
  created = false;
const tables = [
  'users',
  'squads',
  'squad_members',
  'messages',
  'squad_invites',
  'squad_join_requests',
];
try {
  await original.connect();
  run('pg_dump', [
    ...common,
    '--dbname',
    'squadup',
    '--format=custom',
    '--no-owner',
    '--file',
    dump,
  ]);
  const uploadRoot = path.resolve('.local/uploads');
  try {
    await fs.access(uploadRoot);
    await fs.cp(uploadRoot, path.join(backup, 'uploads'), { recursive: true, errorOnExist: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await original.query(`CREATE DATABASE "${restoreName}"`);
  created = true;
  run('pg_restore', [
    ...common,
    '--dbname',
    restoreName,
    '--no-owner',
    '--no-privileges',
    '--exit-on-error',
    dump,
  ]);
  const restoredUrl = new URL(url);
  restoredUrl.pathname = '/' + restoreName;
  restored = new pg.Client({ connectionString: restoredUrl.href });
  await restored.connect();
  const counts = {};
  for (const table of tables) {
    const actual = (await restored.query(`SELECT count(*)::int AS count FROM "${table}"`)).rows[0]
      .count;
    const source = (await original.query(`SELECT count(*)::int AS count FROM "${table}"`)).rows[0]
      .count;
    assert.equal(
      actual,
      source,
      `Restored ${table} differs. Pause app writes before verification.`,
    );
    counts[table] = actual;
  }
  // Confirm attachment references resolve to the backed-up private files.
  const images = (
    await restored.query(
      'SELECT DISTINCT "imageUrl" FROM messages WHERE "imageUrl" LIKE \'local://%\'',
    )
  ).rows;
  for (const image of images) {
    const match = /^local:\/\/([0-9a-f-]{36})\/([0-9a-f-]{36}\.webp)$/.exec(image.imageUrl);
    assert.ok(match, 'Invalid attachment reference');
    await fs.access(path.join(backup, 'uploads', match[1], match[2]));
  }
  await fs.writeFile(
    path.join(backup, 'verification.json'),
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        counts,
        localAttachments: images.length,
        note: 'Local recovery copy; keep another copy outside this PC. Pause writes for a consistent DB/media backup.',
      },
      null,
      2,
    ),
  );
  console.log(`Local backup and isolated restore verified: ${backup}`);
  console.log(`Verified ${tables.length} tables and ${images.length} local screenshot references.`);
} finally {
  if (restored) await restored.end();
  // Only remove the newly generated disposable verification database.
  if (created && /^squadup_restore_[0-9a-f]{12}$/.test(restoreName))
    await original.query(`DROP DATABASE "${restoreName}"`);
  await original.end();
}
