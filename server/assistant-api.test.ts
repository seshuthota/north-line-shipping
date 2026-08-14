import { describe, expect, it } from 'vitest';
import { GET, POST } from '../api/chat.js';

describe('Vercel chat function', () => {
  it('reports configuration without exposing the API key', async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ configured: expect.any(Boolean) });
  });

  it('rejects malformed chat requests before contacting the model', async () => {
    const response = await POST(new Request('https://northline.local/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'Send at least one user message' });
  });
});
