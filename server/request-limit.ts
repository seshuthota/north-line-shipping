const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const clients = new Map<string, { count: number; resetAt: number }>();

export function clientAddress(headers: Headers) {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headers.get('x-real-ip')
    || 'unknown';
}

export function takeRequest(address: string) {
  const now = Date.now();
  const current = clients.get(address);
  if (!current || current.resetAt <= now) {
    clients.set(address, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}
