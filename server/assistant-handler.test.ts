import { beforeEach, describe, expect, it, vi } from 'vitest';

const chatSend = vi.hoisted(() => vi.fn());

vi.mock('./openrouter', async () => {
  const actual = await vi.importActual<typeof import('./openrouter')>('./openrouter');
  return {
    ...actual,
    requireOpenRouter: () => ({ chat: { send: chatSend } }),
  };
});

import { reassembleToolCall, runAssistant } from './assistant-handler';
import { CHAT_FALLBACK_MODEL, CHAT_MODEL } from './openrouter';

beforeEach(() => {
  chatSend.mockReset();
});

it('uses the free chat model first and Gemini as the fallback', () => {
  expect(CHAT_MODEL).toMatch(/:free$/);
  expect(CHAT_FALLBACK_MODEL).toBe('google/gemini-3.7-flash');
});

it('returns the fallback response when the free chat model fails', async () => {
  chatSend
    .mockRejectedValueOnce(new Error('free model unavailable'))
    .mockResolvedValueOnce({
      choices: [{ message: { content: 'Fallback response', toolCalls: [] } }],
    });

  const result = await runAssistant([{ role: 'user', content: 'Hello' }]);

  expect(result.reply).toBe('Fallback response');
  expect(chatSend).toHaveBeenCalledTimes(2);
  expect(chatSend.mock.calls.map(([request]) => request.chatRequest.model)).toEqual([
    CHAT_MODEL,
    CHAT_FALLBACK_MODEL,
  ]);
});

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
