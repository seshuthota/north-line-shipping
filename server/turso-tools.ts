import { createClient } from '@libsql/client/web';
import { calculateVolumetricWeight } from '../src/shipping.js';
import type { AssistantToolCall } from '../src/assistant/tools.js';

let client: ReturnType<typeof createClient> | undefined;
function database() {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw Object.assign(new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are not configured'), { status: 503, code: 'turso_not_configured' });
  client = createClient({ url, authToken });
  return client;
}
const rows = async (sql: string, args: unknown[] = []) => (await database().execute({ sql, args: args as never[] })).rows as unknown as Record<string, unknown>[];
const text = (row: Record<string, unknown>, key: string) => String(row[key] ?? '');

export async function executeTursoTool(name: string, args: Record<string, unknown>): Promise<{ output: unknown; call: AssistantToolCall }> {
  if (name === 'track_shipment') {
    const query = String(args.query ?? '');
    const values = query.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 25);
    const results = await Promise.all(values.map(async (value) => {
      const mode = String(args.mode ?? 'auto');
      const found = await rows(mode === 'reference'
        ? 'SELECT * FROM shipments WHERE customer_reference = ? COLLATE NOCASE'
        : mode === 'waybill' ? 'SELECT * FROM shipments WHERE waybill = ? COLLATE NOCASE'
          : 'SELECT * FROM shipments WHERE waybill = ? COLLATE NOCASE OR customer_reference = ? COLLATE NOCASE', mode === 'auto' ? [value, value] : [value]);
      if (!found[0]) return { found: false, query: value };
      const shipment = found[0];
      const events = await rows('SELECT title, location, event_time_text AS time, is_complete AS complete FROM tracking_events WHERE waybill = ? ORDER BY sequence', [text(shipment, 'waybill')]);
      return { found: true, id: text(shipment, 'waybill'), reference: text(shipment, 'customer_reference'), status: text(shipment, 'status'), origin: text(shipment, 'origin'), destination: text(shipment, 'destination'), service: text(shipment, 'service_name'), eta: text(shipment, 'eta_text'), recipient: text(shipment, 'recipient_name'), events: events.map((event) => ({ ...event, complete: Boolean(event.complete) })), href: `/track?q=${encodeURIComponent(text(shipment, 'waybill'))}` };
    }));
    const demoWaybills = (await rows('SELECT waybill AS id, customer_reference AS reference, status FROM shipments')).map((row) => row);
    const output = { matches: results.filter((item) => item.found).length, results, demoWaybills: results.some((item) => !item.found) ? demoWaybills : undefined };
    return { output, call: { name: 'track_shipment', label: query ? `Tracked ${query}` : 'Looked up tracking', output } };
  }
  if (name === 'get_quote') {
    const mode = args.mode === 'international' ? 'international' : 'domestic'; const weight = Number(args.weight);
    if (!Number.isFinite(weight) || weight <= 0) { const output = { error: 'Weight must be a positive number in kilograms.' }; return { output, call: { name: 'get_quote', label: 'Estimated price', output } }; }
    const chargeable = Math.max(weight, calculateVolumetricWeight(Number(args.length) || 0, Number(args.width) || 0, Number(args.height) || 0));
    const options = (await rows('SELECT service_name AS service, eta_text AS eta, base_price_inr, per_chargeable_kg_inr, badge, description FROM quote_rate_cards WHERE shipping_mode = ? ORDER BY id', [mode])).map((row) => ({ service: text(row, 'service'), eta: text(row, 'eta'), price: Math.round(Number(row.base_price_inr) + chargeable * Number(row.per_chargeable_kg_inr)), badge: row.badge || undefined, description: text(row, 'description') }));
    const output = { disclaimer: 'Estimates are for demonstration only and are not live Northline tariffs.', from: String(args.from ?? ''), to: String(args.to ?? ''), mode, actualWeightKg: weight, volumetricWeightKg: Number(calculateVolumetricWeight(Number(args.length) || 0, Number(args.width) || 0, Number(args.height) || 0).toFixed(2)), chargeableWeightKg: Number(chargeable.toFixed(2)), options, href: '/ship#quote' };
    return { output, call: { name: 'get_quote', label: `Quoted ${output.from} → ${output.to}`, output } };
  }
  if (name === 'find_locations') {
    const query = String(args.query ?? ''); const service = args.service ? String(args.service) : null; const like = `%${query}%`;
    const locations = await rows(`SELECT DISTINCT l.city, l.pin_code AS pin, l.address, l.opening_hours AS hours, l.phone FROM service_locations l LEFT JOIN location_services ls ON ls.location_id=l.id WHERE (l.city LIKE ? OR l.pin_code LIKE ? OR l.address LIKE ?) AND (? IS NULL OR ? = 'all' OR ls.service_name LIKE ?)`, [like, like, like, service, service?.toLowerCase(), service ? `%${service}%` : null]);
    const output = { count: locations.length, query, service, locations: locations.map((location) => ({ ...location, href: '/locations#location-finder' })), href: '/locations#location-finder' };
    return { output, call: { name: 'find_locations', label: `Checked ${query}`, output } };
  }
  if (name === 'lookup_services') { const query = String(args.query ?? ''); const list = await rows('SELECT name, slug, category AS eyebrow, summary, ideal_for AS idealFor FROM shipping_services WHERE ? = \'\' OR name LIKE ? OR summary LIKE ?', [query, `%${query}%`, `%${query}%`]); const output = { count: list.length, services: list.map((item) => ({ ...item, href: `/services/${item.slug}` })), href: '/services' }; return { output, call: { name: 'lookup_services', label: 'Listed services', output } }; }
  if (name === 'get_shipping_guide') { const topic = String(args.topic ?? 'overview'); const guide = (await rows('SELECT title, href FROM shipping_guides WHERE topic = ?', [topic]))[0]; const points = await rows('SELECT point FROM shipping_guide_points WHERE topic = ? ORDER BY sequence', [topic]); const output = { ...(guide || {}), points: points.map((item) => text(item, 'point')) }; return { output, call: { name: 'get_shipping_guide', label: `Opened ${topic} guide`, output } }; }
  const profile = (await rows('SELECT phone, opening_hours AS hours, support_href AS href, faq_href AS faqHref FROM support_profile WHERE id=1'))[0]; const faqs = await rows('SELECT question, answer FROM support_faqs ORDER BY sequence'); const output = { ...profile, faqs: faqs.map((item) => [item.question, item.answer]), news: args.includeNews ? await rows('SELECT published_date AS date, category AS tag, title, summary FROM news_items') : undefined }; return { output, call: { name: 'get_support_info', label: 'Pulled support details', output } };
}
