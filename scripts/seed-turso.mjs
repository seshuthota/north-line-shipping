import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@libsql/client/web';

function envValue(name, content) {
  if (process.env[name]) return process.env[name];
  const line = content.split(/\r?\n/).find((entry) => entry.trim().startsWith(`${name}=`));
  if (!line) return '';
  return line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
}

const root = process.cwd();
const [sql, env] = await Promise.all([
  readFile(resolve(root, 'database/northline-demo.sql'), 'utf8'),
  readFile(resolve(root, '.env'), 'utf8').catch(() => ''),
]);
const url = envValue('TURSO_DATABASE_URL', env);
const authToken = envValue('TURSO_AUTH_TOKEN', env);
if (!url || !authToken) throw new Error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before seeding.');

const statements = sql
  .split(/;\s*(?:\r?\n|$)/)
  .map((statement) => statement.trim())
  .filter((statement) => statement && !statement.startsWith('PRAGMA'));

const client = createClient({ url, authToken });
try {
  await client.batch(statements.map((sql) => ({ sql })), 'write');
  const result = await client.execute('SELECT COUNT(*) AS shipments FROM shipments');
  console.log(`Seeded Turso successfully (${result.rows[0].shipments} shipments).`);
} catch (error) {
  throw error;
} finally {
  client.close();
}
