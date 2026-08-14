import type { QuoteRequest, QuoteResult } from './types.js';

export function calculateVolumetricWeight(length = 0, width = 0, height = 0) {
  return Math.max(0, (length * width * height) / 5000);
}

export function createQuotes(request: QuoteRequest): QuoteResult[] {
  const chargeable = Math.max(request.weight, calculateVolumetricWeight(request.length, request.width, request.height));
  const base = request.mode === 'international' ? 1750 : 280;
  if (request.mode === 'international') return [
    { service: 'OrbitLink Worldwide', eta: '2–4 business days', price: Math.round(base + chargeable * 510), badge: 'Fastest', description: 'Time-definite international door-to-door delivery.' },
    { service: 'Express Easy', eta: '4–6 business days', price: Math.round(base * .8 + chargeable * 390), description: 'Convenient global shipping for documents and parcels.' },
  ];
  return [
    { service: 'Domestic Priority', eta: 'Next business day', price: Math.round(base + chargeable * 118), badge: 'Fastest', description: 'Air express with real-time tracking and proof of delivery.' },
    { service: 'Northline Surface', eta: '3–5 business days', price: Math.round(base * .55 + chargeable * 64), badge: 'Best value', description: 'Dependable day-definite delivery through our ground network.' },
    { service: 'Smart Box', eta: '2–4 business days', price: Math.round(520 + chargeable * 42), description: 'Simple all-inclusive shipping with secure packaging.' },
  ];
}
