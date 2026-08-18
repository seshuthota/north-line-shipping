import type { AssistantToolName } from '../src/assistant/tools.js';

export interface DeterministicRoute {
  tool: AssistantToolName;
  args: Record<string, unknown>;
}

const KNOWN_CITIES = [
  'New Delhi',
  'Mumbai',
  'Bengaluru',
  'Chennai',
  'Kolkata',
  'Hyderabad',
  'Pune',
  'Kochi',
  'Ahmedabad',
  'Delhi',
];

const WAYBILL = /(?:^|[^A-Za-z0-9])(NL\d{9})(?:[^A-Za-z0-9]|$)/i;
const REFERENCE = /(?:^|[^A-Za-z0-9])(NL-[A-Z]{3}-\d{4}|ECOM-\d{4}|CRITICAL-\d{2,3}|DOC-\d{4})(?:[^A-Za-z0-9]|$)/i;
const WEIGHT_KG = /(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilograms?|kilo)?/i;
const QUOTE_INTENT = /\b(quote|price|cost|how much|rate|charge|charges|tariff)\b/i;
const TRACK_INTENT = /\b(track|where|status|locate|find|parcel|shipment|package|waybill)\b/i;
const LOCATION_INTENT = /\b(pick\s*up|pickup|collect|collection|deliver|delivery|service\s*centre|service\s*center|location|coverage|branch|office)\b/i;

function findCity(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const city of KNOWN_CITIES) {
    if (lower.includes(city.toLowerCase())) return city;
  }
  return undefined;
}

function findAllCities(text: string): string[] {
  const found = new Set<string>();
  const lower = text.toLowerCase();
  for (const city of KNOWN_CITIES) {
    if (lower.includes(city.toLowerCase())) found.add(city);
  }
  return Array.from(found);
}

function extractWeight(text: string): number | undefined {
  const match = text.match(WEIGHT_KG);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * Map high-confidence natural language to a single tool call, skipping an
 * unnecessary first model round. Returns null when extraction is incomplete
 * or ambiguous so the model path stays authoritative for those cases.
 */
export function routeAssistantRequest(text: string): DeterministicRoute | null {
  const value = text.trim();

  const waybill = value.match(WAYBILL)?.[1];
  if (waybill) {
    return { tool: 'track_shipment', args: { query: waybill, mode: 'waybill' } };
  }

  const reference = value.match(REFERENCE)?.[1];
  if (reference && TRACK_INTENT.test(value)) {
    return { tool: 'track_shipment', args: { query: reference, mode: 'reference' } };
  }

  if (QUOTE_INTENT.test(value)) {
    const weight = extractWeight(value);
    const cities = findAllCities(value);
    if (weight && cities.length >= 2) {
      return {
        tool: 'get_quote',
        args: { mode: 'domestic', from: cities[0], to: cities[1], weight },
      };
    }
  }

  if (LOCATION_INTENT.test(value)) {
    const city = findCity(value);
    if (city && citiesOnly(value, city)) {
      return { tool: 'find_locations', args: { query: city } };
    }
  }

  return null;
}

function citiesOnly(text: string, matchedCity: string): boolean {
  const cities = findAllCities(text);
  return cities.length >= 1 && cities.includes(matchedCity) && cities.length <= 2;
}
