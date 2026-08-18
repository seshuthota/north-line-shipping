import { describe, expect, it } from 'vitest';
import { routeAssistantRequest } from './assistant-routing';

describe('assistant routing', () => {
  it('routes a waybill to tracking', () => {
    expect(routeAssistantRequest('Where is NL123456789?')).toEqual({
      tool: 'track_shipment',
      args: { query: 'NL123456789', mode: 'waybill' },
    });
  });

  it('routes a reference number with track intent', () => {
    expect(routeAssistantRequest('Track my parcel NL-DEL-2408')).toEqual({
      tool: 'track_shipment',
      args: { query: 'NL-DEL-2408', mode: 'reference' },
    });
  });

  it('routes a clear quote request', () => {
    expect(routeAssistantRequest('Quote 2 kg from Mumbai to Delhi')).toEqual({
      tool: 'get_quote',
      args: { mode: 'domestic', from: 'Mumbai', to: 'Delhi', weight: 2 },
    });
  });

  it('routes a pickup request to locations', () => {
    expect(routeAssistantRequest('Can you pick up in Bengaluru?')).toEqual({
      tool: 'find_locations',
      args: { query: 'Bengaluru' },
    });
  });

  it('returns null for ambiguous item eligibility', () => {
    expect(routeAssistantRequest('Can I ship a wardrobe?')).toBeNull();
    expect(routeAssistantRequest('Can I send a lithium battery?')).toBeNull();
    expect(routeAssistantRequest('Is a motorcycle allowed?')).toBeNull();
  });

  it('returns null for open-ended questions', () => {
    expect(routeAssistantRequest('What items are restricted?')).toBeNull();
    expect(routeAssistantRequest('hello')).toBeNull();
    expect(routeAssistantRequest('What are your support hours?')).toBeNull();
  });
});
