import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Plugin } from 'vite';
import { HISTORY_LIMIT, isAssistantConfigured, runAssistant, speakText, transcribeAudio, type ChatTurn } from './assistant-handler.ts';

function loadAssistantEnv(root: string, mode: string) {
  const env = loadEnv(mode, root, '');
  if (env.OPENROUTER_API_KEY) process.env.OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;
}

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function pathOf(url?: string) {
  return (url ?? '').split('?')[0];
}

function errorPayload(error: unknown) {
  const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status: number }).status) || 500 : 500;
  const message = error instanceof Error ? error.message : 'Assistant request failed';
  return {
    status,
    payload: {
      error: status === 503 ? 'Add OPENROUTER_API_KEY to a local .env file, then restart the dev server.' : message,
      code: status === 503 ? 'not_configured' : 'assistant_error',
    },
  };
}

async function handleChat(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'GET') {
    sendJson(res, 200, { configured: isAssistantConfigured() });
    return;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  let body: { messages?: ChatTurn[] };
  try {
    body = JSON.parse(await readBody(req) || '{}') as { messages?: ChatTurn[] };
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((item): item is ChatTurn => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .slice(-HISTORY_LIMIT);

  if (!history.length || history[history.length - 1]?.role !== 'user') {
    sendJson(res, 400, { error: 'Send at least one user message' });
    return;
  }

  try {
    sendJson(res, 200, await runAssistant(history));
  } catch (error) {
    const { status, payload } = errorPayload(error);
    sendJson(res, status, payload);
  }
}

async function handleTranscribe(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }
  let body: { data?: string; format?: string };
  try {
    body = JSON.parse(await readBody(req) || '{}') as { data?: string; format?: string };
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }
  if (!body.data || body.data.length > 6_000_000) {
    sendJson(res, 400, { error: 'Audio payload is missing or too large' });
    return;
  }
  try {
    sendJson(res, 200, await transcribeAudio(body.data, body.format || 'webm'));
  } catch (error) {
    const { status, payload } = errorPayload(error);
    sendJson(res, status, payload);
  }
}

async function handleSpeak(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }
  let body: { text?: string };
  try {
    body = JSON.parse(await readBody(req) || '{}') as { text?: string };
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }
  try {
    const audio = await speakText(String(body.text ?? ''));
    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.end(Buffer.from(audio));
  } catch (error) {
    const { status, payload } = errorPayload(error);
    sendJson(res, status, payload);
  }
}

function attachAssistantRoute(middlewares: { use: Function; stack?: unknown[] }) {
  const handle = (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => {
    const url = pathOf(req.url) || pathOf((req as IncomingMessage & { originalUrl?: string }).originalUrl);
    if (url === '/api/chat') {
      void handleChat(req, res).catch(next);
      return;
    }
    if (url === '/api/transcribe') {
      void handleTranscribe(req, res).catch(next);
      return;
    }
    if (url === '/api/speak') {
      void handleSpeak(req, res).catch(next);
      return;
    }
    next();
  };
  middlewares.use(handle);
  const stack = middlewares.stack;
  if (Array.isArray(stack) && stack.length > 0) {
    stack.unshift(stack.pop());
  }
}

export function assistantApiPlugin(): Plugin {
  return {
    name: 'northline-assistant-api',
    enforce: 'pre',
    configureServer(server) {
      loadAssistantEnv(server.config.root, server.config.mode);
      return () => attachAssistantRoute(server.middlewares);
    },
    configurePreviewServer(server) {
      loadAssistantEnv(server.config.root, server.config.mode);
      return () => attachAssistantRoute(server.middlewares);
    },
  };
}
