import { locations, news, services, shipments } from '../data.js';
import { calculateVolumetricWeight, createQuotes } from '../shipping.js';
import type { QuoteRequest } from '../types.js';

export type AssistantToolName =
  | 'track_shipment'
  | 'get_quote'
  | 'find_locations'
  | 'lookup_services'
  | 'get_shipping_guide'
  | 'get_support_info';

export interface AssistantToolCall {
  name: AssistantToolName;
  label: string;
  output?: unknown;
}

export const ASSISTANT_TOOLS = [
  {
    type: 'function' as const,
    strict: false,
    name: 'track_shipment',
    description: 'Look up one or more demo shipments by waybill number or customer reference. Use this whenever the user asks where a parcel is, wants tracking status, or provides a number like NL123456789.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Waybill or reference number. Multiple values may be comma-separated.',
        },
        mode: {
          type: 'string',
          enum: ['auto', 'waybill', 'reference'],
          description: 'How to interpret the query. Use auto if unsure.',
        },
      },
      required: ['query'],
    },
  },
  {
    type: 'function' as const,
    strict: false,
    name: 'get_quote',
    description: 'Estimate demo prices and transit times for a shipment. Use for pricing, “how much to send”, or comparing services.',
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['domestic', 'international'], description: 'domestic = within India' },
        from: { type: 'string', description: 'Origin city or country' },
        to: { type: 'string', description: 'Destination city or country' },
        weight: { type: 'number', description: 'Actual weight in kilograms' },
        length: { type: 'number', description: 'Package length in cm' },
        width: { type: 'number', description: 'Package width in cm' },
        height: { type: 'number', description: 'Package height in cm' },
      },
      required: ['mode', 'from', 'to', 'weight'],
    },
  },
  {
    type: 'function' as const,
    strict: false,
    name: 'find_locations',
    description: 'Check whether Northline has a demo service centre, pickup or delivery coverage for a city or PIN code.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'City name or PIN code' },
        service: { type: 'string', description: 'Optional filter such as Pickup, Delivery, International, or Smart Box' },
      },
      required: ['query'],
    },
  },
  {
    type: 'function' as const,
    strict: false,
    name: 'lookup_services',
    description: 'List or describe Northline shipping products (air express, surface, e-commerce, freight, international).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional service name, slug, or keyword such as international or e-commerce' },
      },
    },
  },
  {
    type: 'function' as const,
    strict: false,
    name: 'get_shipping_guide',
    description: 'Return official-style guidance on documents, restricted items, dangerous goods, packing, or conditions of carriage.',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: ['documents', 'restricted', 'dangerous', 'packing', 'conditions', 'overview'],
        },
      },
      required: ['topic'],
    },
  },
  {
    type: 'function' as const,
    strict: false,
    name: 'get_support_info',
    description: 'Return customer service hours, phone number, FAQs, and recent company news.',
    parameters: {
      type: 'object',
      properties: {
        includeNews: { type: 'boolean', description: 'Include latest newsroom headlines' },
      },
    },
  },
];

const GUIDE: Record<string, { title: string; href: string; points: string[] }> = {
  documents: {
    title: 'Documentation',
    href: '/support/regulatory#documents',
    points: [
      'Non-document shipments need a complete commercial invoice.',
      'International shipments may also need customs declarations and permits.',
      'Retail bookings require valid government-issued photo ID.',
      'Describe every item, quantity, value, origin and GST details accurately.',
    ],
  },
  restricted: {
    title: 'Banned and restricted commodities',
    href: '/support/regulatory#restricted',
    points: [
      'Currency and negotiable instruments',
      'Firearms and ammunition',
      'Human remains',
      'Illegal narcotics',
      'Live animals',
      'Pornographic material',
    ],
  },
  dangerous: {
    title: 'Dangerous goods',
    href: '/support/regulatory#dangerous',
    points: [
      'Explosives, gases, flammable liquids, toxic substances and corrosives generally cannot travel on standard express products.',
      'Specialist classification is required before any accepted dangerous-goods movement.',
    ],
  },
  packing: {
    title: 'Packing',
    href: '/support/regulatory#packing',
    points: [
      'Use a rigid outer box strong enough for the shipment weight.',
      'Cushion every side so contents cannot move.',
      'Seal every edge with packing tape in an H-pattern.',
      'Label one surface clearly and remove old barcodes.',
    ],
  },
  conditions: {
    title: 'Conditions of carriage',
    href: '/legal/terms',
    points: [
      'Every real shipment is governed by current Northline or OrbitLink conditions of carriage.',
      'This website is a demonstration — quotes, tracking and forms are simulated.',
    ],
  },
  overview: {
    title: 'Shipping guide',
    href: '/support/regulatory',
    points: [
      'Prepare documents, check restricted items, and pack securely before tendering a shipment.',
      'Use the location finder to confirm pickup and delivery coverage.',
    ],
  },
};

export function trackShipment(query: string, mode: 'auto' | 'waybill' | 'reference' = 'auto') {
  const values = query.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 25);
  if (values.length === 0) {
    return {
      found: false,
      message: 'No waybill or reference was provided.',
      demoWaybills: shipments.map((item) => ({ id: item.id, reference: item.reference, status: item.status })),
    };
  }

  const results = values.map((value) => {
    const match = shipments.find((shipment) => {
      const waybill = shipment.id.toLowerCase() === value.toLowerCase();
      const reference = shipment.reference.toLowerCase() === value.toLowerCase();
      if (mode === 'waybill') return waybill;
      if (mode === 'reference') return reference;
      return waybill || reference;
    });
    return match
      ? { found: true, ...match, href: `/track?q=${encodeURIComponent(match.id)}` }
      : { found: false, query: value };
  });

  return {
    matches: results.filter((item) => item.found).length,
    results,
    demoWaybills: results.some((item) => !item.found)
      ? shipments.map((item) => ({ id: item.id, reference: item.reference, status: item.status }))
      : undefined,
  };
}

export function quoteShipment(input: QuoteRequest) {
  const weight = Number(input.weight);
  if (!Number.isFinite(weight) || weight <= 0) {
    return { error: 'Weight must be a positive number in kilograms.' };
  }
  const volumetric = calculateVolumetricWeight(input.length, input.width, input.height);
  const chargeable = Math.max(weight, volumetric);
  return {
    disclaimer: 'Estimates are for demonstration only and are not live Northline tariffs. Origin and destination do not change the demo rate card.',
    from: input.from,
    to: input.to,
    mode: input.mode,
    actualWeightKg: weight,
    volumetricWeightKg: Number(volumetric.toFixed(2)),
    chargeableWeightKg: Number(chargeable.toFixed(2)),
    options: createQuotes({ ...input, weight }),
    href: '/ship#quote',
  };
}

export function findServiceLocations(query: string, service?: string) {
  const needle = query.trim().toLowerCase();
  const serviceNeedle = service?.trim().toLowerCase();
  const results = locations.filter((item) => {
    const haystack = `${item.city} ${item.pin} ${item.address}`.toLowerCase();
    const matchesQuery = !needle || haystack.includes(needle);
    const matchesService = !serviceNeedle
      || serviceNeedle === 'all'
      || item.services.some((entry) => entry.toLowerCase().includes(serviceNeedle));
    return matchesQuery && matchesService;
  });
  return {
    count: results.length,
    query,
    service: service || null,
    locations: results.map((item) => ({ ...item, href: '/locations#location-finder' })),
    coveredCities: locations.map((item) => `${item.city} (${item.pin})`),
    href: '/locations#location-finder',
    note: results.length === 0
      ? 'This demo only includes a handful of Indian metro centres. No matching location was found.'
      : undefined,
  };
}

export function lookupServices(query?: string) {
  const needle = query?.trim().toLowerCase();
  const results = services.filter((service) => {
    if (!needle) return true;
    return `${service.slug} ${service.name} ${service.eyebrow} ${service.summary} ${service.idealFor}`.toLowerCase().includes(needle);
  });
  return {
    count: results.length,
    services: (results.length ? results : services).map((service) => ({
      name: service.name,
      slug: service.slug,
      eyebrow: service.eyebrow,
      summary: service.summary,
      idealFor: service.idealFor,
      features: service.features,
      href: `/services/${service.slug}`,
    })),
    href: '/services',
  };
}

export function getShippingGuide(topic: string) {
  const entry = GUIDE[topic] || GUIDE.overview;
  return entry;
}

export function getSupportInfo(includeNews = false) {
  return {
    phone: '1800 555 0142',
    hours: 'Mon–Sat · 8 AM–8 PM',
    href: '/support#contact',
    faqHref: '/support#faq',
    faqs: [
      ['How do I track a shipment?', 'Use your waybill number. Demo IDs include NL123456789, NL987654321, NL246813579 and NL111111111.'],
      ['How is shipping weight calculated?', 'Charges use the higher of actual weight or volumetric weight (L×W×H / 5000).'],
      ['Can Northline collect from my address?', 'Pickup is available from supported demo locations. Ask to check a city or PIN.'],
      ['What identification is required?', 'Retail bookings may require valid photo identification.'],
    ],
    news: includeNews ? news : undefined,
  };
}

export function executeAssistantTool(name: string, rawArgs: unknown): { output: unknown; call: AssistantToolCall } {
  const args = (rawArgs && typeof rawArgs === 'object') ? rawArgs as Record<string, unknown> : {};
  switch (name) {
    case 'track_shipment': {
      const query = String(args.query ?? '');
      const output = trackShipment(query, (args.mode as 'auto' | 'waybill' | 'reference') || 'auto');
      return {
        output,
        call: { name, label: query ? `Tracked ${query}` : 'Looked up tracking', output },
      };
    }
    case 'get_quote': {
      const from = String(args.from ?? '');
      const to = String(args.to ?? '');
      const output = quoteShipment({
        mode: args.mode === 'international' ? 'international' : 'domestic',
        from,
        to,
        weight: Number(args.weight),
        length: args.length === undefined ? undefined : Number(args.length),
        width: args.width === undefined ? undefined : Number(args.width),
        height: args.height === undefined ? undefined : Number(args.height),
      });
      return {
        output,
        call: { name, label: from && to ? `Quoted ${from} → ${to}` : 'Estimated price', output },
      };
    }
    case 'find_locations': {
      const query = String(args.query ?? '');
      const output = findServiceLocations(query, args.service ? String(args.service) : undefined);
      return {
        output,
        call: { name, label: query ? `Checked ${query}` : 'Searched locations', output },
      };
    }
    case 'lookup_services': {
      const query = args.query ? String(args.query) : undefined;
      const output = lookupServices(query);
      return {
        output,
        call: { name, label: query ? `Found services for “${query}”` : 'Listed services', output },
      };
    }
    case 'get_shipping_guide': {
      const topic = String(args.topic ?? 'overview');
      const output = getShippingGuide(topic);
      return {
        output,
        call: { name, label: `Opened ${topic} guide`, output },
      };
    }
    case 'get_support_info': {
      const output = getSupportInfo(Boolean(args.includeNews));
      return {
        output,
        call: { name, label: 'Pulled support details', output },
      };
    }
    default:
      return {
        output: { error: `Unknown tool: ${name}` },
        call: { name: 'get_support_info', label: 'Unknown request' },
      };
  }
}
