import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client/web';

const env = await readFile('.env', 'utf8').catch(() => '');
const get = (name) => process.env[name] || env.split(/\r?\n/).find((line) => line.startsWith(`${name}=`))?.slice(name.length + 1).trim();
const url = get('TURSO_DATABASE_URL');
const authToken = get('TURSO_AUTH_TOKEN');
if (!url || !authToken) throw new Error('Turso credentials are not configured.');
const client = createClient({ url, authToken });
const result = await client.execute('SELECT COUNT(*) AS shipments FROM shipments');
if (Number(result.rows[0].shipments) < 1) throw new Error('Turso has no shipment data. Run npm run db:seed.');
console.log(`Turso connection verified (${result.rows[0].shipments} shipments).`);
client.close();
