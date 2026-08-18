import { describe, expect, it } from 'vitest';
import { reassembleToolCall } from './assistant-handler';

describe('assistant streaming tool reassembly', () => {
  it('accumulates fragmented tool call deltas by index', () => {
    const fragments = new Map<number, { id: string; name: string; args: string }>();
    reassembleToolCall(fragments, { index: 0, id: 'call_1', type: 'function', function: { name: 'track_shipment' } });
    reassembleToolCall(fragments, { index: 0, function: { arguments: '{"query":"NL12345' } });
    reassembleToolCall(fragments, { index: 0, function: { arguments: '6789","mode":"waybill"}' } });

    const call = fragments.get(0);
    expect(call).toBeDefined();
    expect(call?.id).toBe('call_1');
    expect(call?.name).toBe('track_shipment');
    expect(call?.args).toBe('{"query":"NL123456789","mode":"waybill"}');
  });

  it('keeps multiple tool calls separated by index', () => {
    const fragments = new Map<number, { id: string; name: string; args: string }>();
    reassembleToolCall(fragments, { index: 0, id: 'a', function: { name: 'lookup_services', arguments: '{}' } });
    reassembleToolCall(fragments, { index: 1, id: 'b', function: { name: 'get_support_info', arguments: '{}' } });

    expect(fragments.size).toBe(2);
    expect(fragments.get(0)?.name).toBe('lookup_services');
    expect(fragments.get(1)?.name).toBe('get_support_info');
  });
});
