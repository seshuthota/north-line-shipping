import { chatResponse, configuredResponse, errorPayload, readJson, apiLimits } from '../server/assistant-api.ts';
import { clientAddress, takeRequest } from '../server/request-limit.ts';

const headers = { 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200, extraHeaders?: HeadersInit) => Response.json(body, { status, headers: { ...headers, ...extraHeaders } });

export function GET() {
  return json(configuredResponse());
}

export async function POST(request: Request) {
  const limit = takeRequest(clientAddress(request.headers));
  if (!limit.allowed) return json({ error: 'Too many assistant requests. Please try again shortly.', code: 'rate_limited' }, 429, { 'Retry-After': String(limit.retryAfter) });
  try {
    return json(await chatResponse(await readJson(request, apiLimits.chat)));
  } catch (error) {
    const failure = errorPayload(error);
    return json(failure.payload, failure.status);
  }
}
