import { transcribeResponse, errorPayload, readJson, apiLimits } from '../server/assistant-api.js';
import { clientAddress, takeRequest } from '../server/request-limit.js';

const headers = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  const limit = takeRequest(clientAddress(request.headers));
  if (!limit.allowed) return Response.json({ error: 'Too many assistant requests. Please try again shortly.', code: 'rate_limited' }, { status: 429, headers: { ...headers, 'Retry-After': String(limit.retryAfter) } });
  try {
    return Response.json(await transcribeResponse(await readJson(request, apiLimits.audio)), { headers });
  } catch (error) {
    const failure = errorPayload(error);
    return Response.json(failure.payload, { status: failure.status, headers });
  }
}
