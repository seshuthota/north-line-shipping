import type { AssistantToolCall } from './tools.js';

function rupees(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

export function looksLikeABriefing(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 220
    || /\|[-:]+\|/.test(trimmed)
    || /\bhref\b/i.test(trimmed)
    || trimmed.split('\n').length > 5
    || /\*\*[^*]+\*\*/.test(trimmed) && trimmed.includes('|');
}

export function captionForTools(tools: AssistantToolCall[]) {
  const last = [...tools].reverse()[0];
  if (!last) return '';
  const data = asRecord(last.output);
  if (!data) return '';

  if (last.name === 'track_shipment') {
    const results = Array.isArray(data.results) ? data.results as Record<string, unknown>[] : [];
    const hit = results.find((item) => item.found);
    if (!hit) return 'I couldn’t find that one. Try NL123456789 — that’s a demo shipment already in the air.';
    const city = String(hit.destination).split(',')[0];
    const status = String(hit.status);
    if (status === 'Delivered') return `It’s already there — delivered in ${city}.`;
    if (status === 'Delayed') return `This one’s running late on the way to ${city}.`;
    if (status === 'Exception') return 'Delivery is on hold — we need a clearer address.';
    return `On its way to ${city}. Due ${String(hit.eta).replace(/^tomorrow,?/i, 'tomorrow').replace(/\.$/, '')}.`;
  }

  if (last.name === 'get_quote') {
    const options = Array.isArray(data.options) ? data.options as { service: string; price: number; badge?: string }[] : [];
    const fastest = options.find((item) => item.badge === 'Fastest') || options[0];
    const value = options.find((item) => item.badge === 'Best value');
    if (!fastest) return 'I can estimate a demo price if you share the weight and cities.';
    const route = `${data.from} to ${data.to}`;
    return value
      ? `${route}: ${fastest.service} is ${rupees(fastest.price)} next day. Ground is ${rupees(value.price)} if you’re not in a rush.`
      : `${route}: ${fastest.service} is about ${rupees(fastest.price)}.`;
  }

  if (last.name === 'find_locations') {
    const places = Array.isArray(data.locations) ? data.locations as { city: string; address: string }[] : [];
    if (!places.length) return `We don’t have a demo centre in ${data.query}. Try Mumbai, Delhi, or Bengaluru.`;
    const place = places[0];
    return `Yes — we pick up in ${place.city}, at ${place.address}.`;
  }

  if (last.name === 'lookup_services') {
    return 'Here are the services that fit. Tap one if you want the details.';
  }

  if (last.name === 'get_shipping_guide') {
    return data.title === 'Banned and restricted commodities'
      ? 'These can’t travel with us.'
      : `A few notes on ${String(data.title || 'shipping').toLowerCase()}.`;
  }

  if (last.name === 'get_support_info') {
    return `We’re on ${data.phone}, ${data.hours}.`;
  }

  return '';
}

export function polishReply(reply: string, tools: AssistantToolCall[], userText = '') {
  if (/\b(can|may|allowed|okay| ok|permitted|accepted)\b.*\b(ship|send|mail|parcel|item)\b|\b(ship|send|mail)\b.*\b(item|motorcycle|battery|perfume|goods?)\b/i.test(userText)
    && tools.some((tool) => tool.name === 'get_shipping_guide')) {
    return 'I can’t confirm whether that item can be shipped. Please contact customer support by email and they’ll let you know.';
  }
  const caption = captionForTools(tools);
  if (caption) return caption;
  const cleaned = reply.trim();
  if (!cleaned || looksLikeABriefing(cleaned)) return 'Happy to help with tracking, a price, or a pickup city.';
  return cleaned;
}
