import type { ChatFunctionTool, ChatMessages, ChatResult } from '@openrouter/sdk/models';
import { polishReply, shouldDeferItemEligibility } from '../src/assistant/replies.js';
import { ASSISTANT_TOOLS, type AssistantToolCall } from '../src/assistant/tools.js';
import { executeTursoTool } from './turso-tools.js';
import { routeAssistantRequest } from './assistant-routing.js';
import { CHAT_MODEL, STT_MODEL, TTS_MODEL, TTS_VOICE, isAssistantConfigured, openRouterApp, requireOpenRouter } from './openrouter.js';

export { isAssistantConfigured };

export const HISTORY_LIMIT = 80;
const MAX_TOOL_ROUNDS = 3;

const SYSTEM_PROMPT = `You are a helpful person at the Northline counter. The customer is a regular person shipping a parcel, not an analyst.

Always call a tool for facts (tracking, quotes, locations, services, restricted items, support hours).

How to talk:
- One or two short sentences. Friendly. Plain English.
- Never use markdown tables, bullet dumps, JSON, or the word href.
- Never repeat prices, addresses, hours, or ETAs in full — the screen already shows a card.
- Don’t pitch follow-ups unless they ask.
- If the customer asks about a specific item and no tool explicitly confirms that item’s eligibility, do not infer from a general guide or service list. Say that customer support should confirm it directly by email.
- If the tools do not provide a clear answer, do not guess or make a definitive claim. Say that customer support should confirm it directly by email.
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

async function runDeterministicRoute(tool: AssistantToolCall['name'], args: Record<string, unknown>, userText: string): Promise<AssistantReply | null> {
  try {
    const executed = await executeTursoTool(tool, args);
    const tools = [executed.call];
    const reply = polishReply('', tools, userText);
    return { reply: reply || 'Happy to help with tracking, a price, or a pickup city.', tools };
  } catch (error) {
    console.error(JSON.stringify({ event: 'assistant_route_error', tool, message: error instanceof Error ? error.message : String(error) }));
    return null;
  }
}

export async function runAssistant(history: ChatTurn[]): Promise<AssistantReply> {
  const client = requireOpenRouter();
  const messages = toMessages(history);
  const tools: AssistantToolCall[] = [];
  const userText = history.at(-1)?.content || '';

  const started = performance.now();
  let modelRounds = 0;
  let modelMs = 0;
  let toolCalls = 0;
  let toolMs = 0;

  try {
    const route = routeAssistantRequest(userText);
    if (route) {
      const routed = await runDeterministicRoute(route.tool, route.args, userText);
      if (routed) return routed;
    }

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const modelStarted = performance.now();
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
      modelMs += performance.now() - modelStarted;
      modelRounds += 1;

      if (!isChatResult(result)) {
        throw new Error('Unexpected streaming response from OpenRouter');
      }

      const message = result.choices[0]?.message;
      if (!message) break;
      messages.push(message);

      const calls = message.toolCalls ?? [];
      if (calls.length === 0) {
        const reply = polishReply(messageText(message.content), tools, userText)
          || 'I can help with tracking, a price, or a pickup city.';
        return { reply, tools };
      }

      const parsedCalls = calls.map((call) => {
        let parsed: unknown = {};
        try {
          parsed = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          parsed = {};
        }
        return { call, parsed: (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown> };
      });

      const toolStarted = performance.now();
      const executed = await Promise.all(parsedCalls.map(({ call, parsed }) => executeTursoTool(call.function.name, parsed)));
      toolMs += performance.now() - toolStarted;
      toolCalls += executed.length;

      for (let index = 0; index < parsedCalls.length; index += 1) {
        const { call } = parsedCalls[index];
        const resultCall = executed[index];
        tools.push(resultCall.call);
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          content: JSON.stringify(resultCall.output),
        });
      }

      if (shouldDeferItemEligibility(userText, tools)) {
        return { reply: polishReply('', tools, userText) || 'I can’t confirm whether that item can be shipped. Please contact customer support by email.', tools };
      }
    }
  } catch (error) {
    console.error(JSON.stringify({ event: 'assistant_run_error', message: error instanceof Error ? error.message : String(error) }));
    console.error(JSON.stringify({ event: 'assistant_timing', request_ms: Math.round(performance.now() - started), model_rounds: modelRounds, model_ms: Math.round(modelMs), tool_calls: toolCalls, tool_ms: Math.round(toolMs) }));
    return {
      reply: 'I couldn’t confirm that right now. Please contact customer support by email.',
      tools,
    };
  }

  console.error(JSON.stringify({ event: 'assistant_timing', request_ms: Math.round(performance.now() - started), model_rounds: modelRounds, model_ms: Math.round(modelMs), tool_calls: toolCalls, tool_ms: Math.round(toolMs) }));

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
