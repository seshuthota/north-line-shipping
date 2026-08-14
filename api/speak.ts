import { speakResponse, errorPayload, readJson, apiLimits } from '../server/assistant-api.ts';
import { clientAddress, takeRequest } from '../server/request-limit.ts';

export async function POST(request: Request) {
  const limit = takeRequest(clientAddress(request.headers));
  if (!limit.allowed) return Response.json({ error: 'Too many assistant requests. Please try again shortly.', code: 'rate_limited' }, { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(limit.retryAfter) } });
  try {
    return new Response(await speakResponse(await readJson(request, apiLimits.chat)), {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const failure = errorPayload(error);
    return Response.json(failure.payload, { status: failure.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
