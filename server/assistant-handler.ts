import type { ChatFunctionTool, ChatMessages, ChatResult } from '@openrouter/sdk/models';
import { polishReply } from '../src/assistant/replies.js';
import { ASSISTANT_TOOLS, type AssistantToolCall } from '../src/assistant/tools.js';
import { executeTursoTool } from './turso-tools.js';
import { CHAT_MODEL, STT_MODEL, TTS_MODEL, TTS_VOICE, isAssistantConfigured, openRouterApp, requireOpenRouter } from './openrouter.js';

export { isAssistantConfigured };

export const HISTORY_LIMIT = 80;
const MAX_TOOL_ROUNDS = 6;

const SYSTEM_PROMPT = `You are a helpful person at the Northline counter. The customer is a regular person shipping a parcel, not an analyst.

Always call a tool for facts (tracking, quotes, locations, services, restricted items, support hours).

How to talk:
- One or two short sentences. Friendly. Plain English.
- Never use markdown tables, bullet dumps, JSON, or the word href.
- Never repeat prices, addresses, hours, or ETAs in full — the screen already shows a card.
- Don’t pitch follow-ups unless they ask.
- This is a demo. Don’t pretend you booked anything.

Examples of good replies:
- “It’s on the way to Delhi — due tomorrow by noon.”
- “Yes, we pick up in Bengaluru.”
- “Air is the quick one. Ground is cheaper if you can wait.”`;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantReply {
  reply: string;
  tools: AssistantToolCall[];
}

const OPENROUTER_TOOLS: ChatFunctionTool[] = ASSISTANT_TOOLS.map((tool) => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    strict: false,
  },
}));

function isChatResult(value: unknown): value is ChatResult {
  return Boolean(value && typeof value === 'object' && 'choices' in value);
}

function messageText(content: ChatResult['choices'][number]['message']['content']) {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') return part.text;
      return '';
    })
    .join('')
    .trim();
}

function toMessages(history: ChatTurn[]): ChatMessages[] {
  const turns: ChatMessages[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];
  for (const turn of history.filter((item) => item.content.trim()).slice(-HISTORY_LIMIT)) {
    turns.push({
      role: turn.role,
      content: turn.content.trim().slice(0, 4000),
    });
  }
  return turns;
}

async function collectAudio(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const buffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return buffer;
}

export async function runAssistant(history: ChatTurn[]): Promise<AssistantReply> {
  const client = requireOpenRouter();
  const messages = toMessages(history);
  const tools: AssistantToolCall[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const result = await client.chat.send({
      ...openRouterApp,
      chatRequest: {
        model: CHAT_MODEL,
        messages,
        tools: OPENROUTER_TOOLS,
        toolChoice: 'auto',
        stream: false,
        reasoningEffort: 'low',
      },
    });

    if (!isChatResult(result)) {
      throw new Error('Unexpected streaming response from OpenRouter');
    }

    const message = result.choices[0]?.message;
    if (!message) break;
    messages.push(message);

    const calls = message.toolCalls ?? [];
    if (calls.length === 0) {
      const reply = polishReply(messageText(message.content), tools)
        || 'I can help with tracking, a price, or a pickup city.';
      return { reply, tools };
    }

    for (const call of calls) {
      let parsed: unknown = {};
      try {
        parsed = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        parsed = {};
      }
      const executed = await executeTursoTool(call.function.name, (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>);
      tools.push(executed.call);
      messages.push({
        role: 'tool',
        toolCallId: call.id,
        content: JSON.stringify(executed.output),
      });
    }
  }

  return {
    reply: 'I looked that up but ran out of steps. Try asking one thing at a time — tracking, a quote, or a city.',
    tools,
  };
}

export async function transcribeAudio(data: string, format: string) {
  const client = requireOpenRouter();
  const result = await client.stt.createTranscription({
    ...openRouterApp,
    sttRequest: {
      model: STT_MODEL,
      inputAudio: { data, format },
    },
  });
  const text = result.text?.trim() ?? '';
  if (!text) throw Object.assign(new Error('No speech was recognised'), { status: 422 });
  return { text };
}

export async function speakText(text: string) {
  const spoken = text.replace(/\s+/g, ' ').trim().slice(0, 1200);
  if (!spoken) throw Object.assign(new Error('Nothing to speak'), { status: 400 });
  const client = requireOpenRouter();
  const stream = await client.tts.createSpeech({
    ...openRouterApp,
    speechRequest: {
      model: TTS_MODEL,
      input: spoken,
      voice: TTS_VOICE,
      responseFormat: 'mp3',
    },
  });
  return collectAudio(stream);
}
