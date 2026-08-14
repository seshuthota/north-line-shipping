import { describe, expect, it } from 'vitest';
import { executeAssistantTool, findServiceLocations, quoteShipment, trackShipment } from './tools';

describe('assistant tools', () => {
  it('tracks a known waybill and a known reference', () => {
    const byId = trackShipment('NL123456789');
    expect(byId.matches).toBe(1);
    expect(byId.results?.[0]).toMatchObject({ found: true, status: 'In transit' });

    const byRef = trackShipment('ECOM-8842', 'reference');
    expect(byRef.matches).toBe(1);
    expect(byRef.results?.[0]).toMatchObject({ found: true, id: 'NL987654321' });
  });

  it('returns demo waybills when nothing matches', () => {
    const miss = trackShipment('NOPE');
    expect(miss.matches).toBe(0);
    expect(miss.demoWaybills?.length).toBeGreaterThan(0);
  });

  it('quotes domestic and international shipments', () => {
    const domestic = quoteShipment({ mode: 'domestic', from: 'Mumbai', to: 'Delhi', weight: 2 });
    expect('options' in domestic && domestic.options).toHaveLength(3);

    const intl = quoteShipment({ mode: 'international', from: 'Mumbai', to: 'Singapore', weight: 1 });
    expect('options' in intl && intl.options).toHaveLength(2);
  });

  it('finds metro locations and reports unknown cities', () => {
    expect(findServiceLocations('Bengaluru').count).toBe(1);
    expect(findServiceLocations('400099').count).toBe(1);
    expect(findServiceLocations('Goa').count).toBe(0);
  });

  it('dispatches named tools', () => {
    const tracked = executeAssistantTool('track_shipment', { query: 'NL111111111' });
    expect(tracked.call.label).toContain('NL111111111');
    expect(tracked.output).toMatchObject({ matches: 1 });
  });
});
