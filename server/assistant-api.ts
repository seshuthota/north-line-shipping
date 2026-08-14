import { HISTORY_LIMIT, isAssistantConfigured, runAssistant, speakText, transcribeAudio, type ChatTurn } from './assistant-handler.js';

const CHAT_BODY_LIMIT = 100_000;
const AUDIO_BODY_LIMIT = 6_000_000;

export interface ApiError {
  status: number;
  payload: { error: string; code?: string };
}

function apiError(status: number, error: string, code?: string): ApiError {
  return { status, payload: { error, code } };
}

export function errorPayload(error: unknown): ApiError {
  if (error && typeof error === 'object' && 'payload' in error && 'status' in error) {
    const candidate = error as Partial<ApiError>;
    if (typeof candidate.status === 'number' && candidate.payload && typeof candidate.payload.error === 'string') {
      return { status: candidate.status, payload: candidate.payload };
    }
  }
  const status = typeof error === 'object' && error && 'status' in error
    ? Number((error as { status: number }).status) || 500
    : 500;
  const message = error instanceof Error ? error.message : 'Assistant request failed';
  console.error(JSON.stringify({ event: 'assistant_api_error', status, code: typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code ?? '') : 'unknown', message }));
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  if (code === 'turso_not_configured') {
    return apiError(503, 'The assistant database is not configured. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the deployment environment.', 'turso_not_configured');
  }
  if (status === 503) {
    return apiError(503, 'The assistant is not configured. Add OPENROUTER_API_KEY in the deployment environment.', 'not_configured');
  }
  return apiError(status, message, 'assistant_error');
}

export function configuredResponse() {
  return { configured: isAssistantConfigured() };
}

export async function chatResponse(body: unknown) {
  const messages = body && typeof body === 'object' && Array.isArray((body as { messages?: unknown }).messages)
    ? (body as { messages: unknown[] }).messages
    : [];
  const history = messages
    .filter((item): item is ChatTurn => Boolean(item) && typeof item === 'object'
      && (((item as ChatTurn).role === 'user') || ((item as ChatTurn).role === 'assistant'))
      && typeof (item as ChatTurn).content === 'string')
    .slice(-HISTORY_LIMIT);

  if (!history.length || history[history.length - 1]?.role !== 'user') {
    throw apiError(400, 'Send at least one user message');
  }
  return runAssistant(history);
}

export async function transcribeResponse(body: unknown) {
  const input = body && typeof body === 'object' ? body as { data?: unknown; format?: unknown } : {};
  if (typeof input.data !== 'string' || !input.data || input.data.length > AUDIO_BODY_LIMIT) {
    throw apiError(400, 'Audio payload is missing or too large');
  }
  return transcribeAudio(input.data, typeof input.format === 'string' ? input.format : 'webm');
}

export async function speakResponse(body: unknown) {
  const text = body && typeof body === 'object' ? String((body as { text?: unknown }).text ?? '') : '';
  return speakText(text);
}

export async function readJson(request: Request, maxBytes: number) {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxBytes) throw apiError(413, 'Request body is too large');
  if (!request.body) return {};

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) throw apiError(413, 'Request body is too large');
    chunks.push(value);
  }

  try {
    return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))) as unknown;
  } catch {
    throw apiError(400, 'Invalid JSON body');
  }
}

export const apiLimits = { chat: CHAT_BODY_LIMIT, audio: AUDIO_BODY_LIMIT };
