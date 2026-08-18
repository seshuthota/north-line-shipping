import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OpenRouter } from '@openrouter/sdk';

export const CHAT_MODEL = 'google/gemini-3.7-flash';
export const TTS_MODEL = 'deepgram/flux-tts:free';
export const TTS_VOICE = 'flux-alexis-en';
export const STT_MODEL = 'mistralai/voxtral-small-24b-2507-stt';

const APP_TITLE = 'Northline Express';
const APP_REFERER = 'https://northline.local';

function readKeyFromEnvFile() {
  try {
    const text = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      if (trimmed.slice(0, index).trim() !== 'OPENROUTER_API_KEY') continue;
      let value = trimmed.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      return value;
    }
  } catch {
    return '';
  }
  return '';
}

export function getOpenRouterKey() {
  return process.env.OPENROUTER_API_KEY || readKeyFromEnvFile();
}

export function isAssistantConfigured() {
  return Boolean(getOpenRouterKey());
}

export function requireOpenRouter() {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    throw Object.assign(new Error('OPENROUTER_API_KEY is not configured'), { status: 503, code: 'not_configured' });
  }
  return new OpenRouter({
    apiKey,
    httpReferer: APP_REFERER,
    appTitle: APP_TITLE,
  });
}

export const openRouterApp = {
  httpReferer: APP_REFERER,
  appTitle: APP_TITLE,
};
