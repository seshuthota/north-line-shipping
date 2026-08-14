import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation as useWouterLocation } from 'wouter';
import { ArrowRight, Home, LoaderCircle, MessageCircle, Mic, RotateCcw, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { EmptyLocationNote, ToolResultCards } from './cards';
import type { AssistantToolCall } from './tools';

export const OPEN_ASSISTANT_EVENT = 'northline-open-assistant';
const STORAGE_KEY = 'nl-assistant';

function readSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as { messages?: ChatMessage[]; voiceOn?: boolean; open?: boolean } : {};
  } catch {
    return {};
  }
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools?: AssistantToolCall[];
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi. I can track a parcel, check a price, or see if we pick up near you.',
};

const SUGGESTIONS = [
  'Where is NL123456789?',
  'Quote 2 kg Mumbai to Delhi',
  'Can you pick up in Bengaluru?',
  'What items are restricted?',
];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function renderContent(text: string) {
  const nodes: ReactNode[] = [];
  const pattern = /(\/[a-z][\w/-]*(?:#[\w-]+)?(?:\?[\w=&%.+-]*)?)/gi;
  text.split('\n').forEach((line, lineIndex) => {
    if (lineIndex > 0) nodes.push(<br key={`br-${lineIndex}`} />);
    let last = 0;
    for (const match of line.matchAll(pattern)) {
      const value = match[0];
      const start = match.index ?? 0;
      if (start > last) nodes.push(line.slice(last, start));
      nodes.push(<Link key={`${lineIndex}-${start}`} to={value}>{value}</Link>);
      last = start + value.length;
    }
    if (last < line.length) nodes.push(line.slice(last));
  });
  return nodes;
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function audioFormat(mime: string) {
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  return 'webm';
}

export function openAssistant(prompt?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT, { detail: { prompt } }));
}

export function Assistant() {
  const saved = readSession();
  const [open, setOpen] = useState(() => Boolean(saved.open));
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(() => saved.voiceOn !== false);
  const [error, setError] = useState('');
  const [, navigate] = useWouterLocation();
  const [messages, setMessages] = useState<ChatMessage[]>(() => (
    Array.isArray(saved.messages) && saved.messages.length ? saved.messages : [WELCOME]
  ));
  const started = messages.some((item) => item.id !== 'welcome');
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    function onOpen(event: Event) {
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      setOpen(true);
      if (prompt) setInput(prompt);
    }
    window.addEventListener(OPEN_ASSISTANT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    fetch('/api/chat')
      .then((response) => response.json())
      .then((payload) => setConfigured(Boolean(payload.configured)))
      .catch(() => setConfigured(false));
    const timer = window.setTimeout(() => field.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending, open, listening]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, voiceOn, open }));
  }, [messages, voiceOn, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => () => {
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
    audioRef.current?.pause();
  }, []);

  async function speak(text: string) {
    if (!voiceOn || !text.trim()) return;
    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) return;
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      // Voice is optional; keep the text reply.
    }
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    const nextMessages: ChatMessage[] = [...messages, { id: newId(), role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages
            .filter((item) => item.id !== 'welcome')
            .map((item) => ({ role: item.role, content: item.content })),
        }),
      });
      const payload = await response.json() as { reply?: string; tools?: AssistantToolCall[]; error?: string };
      if (!response.ok) {
        setError(payload.error || 'The assistant is unavailable right now.');
        return;
      }
      const reply = payload.reply || 'I did not get a reply that time.';
      setMessages((current) => [...current, {
        id: newId(),
        role: 'assistant',
        content: reply,
        tools: payload.tools,
      }]);
      void speak(reply);
    } catch {
      setError('Could not reach the assistant. Is the dev server running?');
    } finally {
      setPending(false);
    }
  }

  async function finishRecording() {
    const rec = recorder.current;
    if (!rec) return;
    const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
    rec.stream.getTracks().forEach((track) => track.stop());
    recorder.current = null;
    chunks.current = [];
    setListening(false);
    if (blob.size < 800) {
      setError('I did not catch that. Hold the mic a moment longer.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: await blobToBase64(blob), format: audioFormat(blob.type) }),
      });
      const payload = await response.json() as { text?: string; error?: string };
      if (!response.ok || !payload.text) {
        setError(payload.error || 'Could not transcribe that clip.');
        setPending(false);
        return;
      }
      setPending(false);
      await send(payload.text);
    } catch {
      setError('Voice input failed. You can still type the question.');
      setPending(false);
    }
  }

  async function toggleMic() {
    if (listening && recorder.current) {
      recorder.current.stop();
      return;
    }
    if (pending || configured === false) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined;
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      rec.onstop = () => { void finishRecording(); };
      recorder.current = rec;
      rec.start();
      setListening(true);
      setError('');
    } catch {
      setError('Microphone access was blocked. Type your question instead.');
    }
  }

  function resetChat() {
    audioRef.current?.pause();
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
    recorder.current = null;
    chunks.current = [];
    setListening(false);
    setPending(false);
    setError('');
    setInput('');
    setMessages([{ ...WELCOME, id: 'welcome' }]);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function goHome() {
    resetChat();
    setOpen(false);
    navigate('/');
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  return <>
    <button
      type="button"
      className={`assistant-fab ${open ? 'open' : ''}`}
      aria-expanded={open}
      aria-controls="northline-assistant"
      onClick={() => setOpen((value) => !value)}
    >
      {open ? <X size={22} /> : <MessageCircle size={22} />}
      <span>{open ? 'Close assistant' : 'Ask Northline'}</span>
    </button>

    {open && <section id="northline-assistant" className="assistant-panel" role="dialog" aria-modal="true" aria-label="Northline assistant">
      <header className="assistant-head">
        <span className="assistant-mark"><Sparkles size={16} /></span>
        <div>
          <strong>Northline Assistant</strong>
          <small>{configured === false ? 'Needs an OpenRouter key' : 'Tracking, prices, pickup'}</small>
        </div>
        <div className="assistant-head-actions">
          <button type="button" className="icon-button" aria-label="Back to home" title="Home" onClick={goHome}>
            <Home size={17} />
          </button>
          <button type="button" className="icon-button" aria-label="Start a new chat" title="New chat" disabled={!started} onClick={resetChat}>
            <RotateCcw size={17} />
          </button>
          <button
            type="button"
            className={`icon-button ${voiceOn ? 'active' : ''}`}
            aria-pressed={voiceOn}
            aria-label={voiceOn ? 'Mute spoken replies' : 'Enable spoken replies'}
            title={voiceOn ? 'Mute voice' : 'Voice on'}
            onClick={() => {
              setVoiceOn((value) => !value);
              audioRef.current?.pause();
            }}
          >
            {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button type="button" className="icon-button" aria-label="Close assistant" title="Close" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
      </header>

      <div className="assistant-thread" ref={scroller}>
        {messages.map((message) => (
          <article key={message.id} className={`assistant-bubble ${message.role}`}>
            {message.content && <p>{renderContent(message.content)}</p>}
            {message.role === 'assistant' && <ToolResultCards tools={message.tools} />}
            {message.role === 'assistant' && <EmptyLocationNote tools={message.tools} />}
          </article>
        ))}
        {listening && <div className="assistant-bubble assistant pending"><Mic size={16} /> Listening… tap the mic to send</div>}
        {pending && !listening && <div className="assistant-bubble assistant pending"><LoaderCircle className="spin" size={16} /> Checking the network…</div>}
        {error && <div className="assistant-error">{error}</div>}
        {configured === false && (
          <div className="assistant-setup">
            <p>Add <code>OPENROUTER_API_KEY</code> to a <code>.env</code> file in the project root, then restart <code>npm run dev</code>.</p>
            <p>Create a key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">openrouter.ai/keys</a>.</p>
          </div>
        )}
      </div>

      {configured !== false && messages.length < 3 && (
        <div className="assistant-suggestions">
          {SUGGESTIONS.map((item) => (
            <button type="button" key={item} onClick={() => void send(item)}>{item}</button>
          ))}
        </div>
      )}

      <form className="assistant-composer" onSubmit={submit}>
        <button
          type="button"
          className={`assistant-mic ${listening ? 'live' : ''}`}
          aria-pressed={listening}
          aria-label={listening ? 'Stop recording' : 'Speak a question'}
          disabled={pending && !listening || configured === false}
          onClick={() => void toggleMic()}
        >
          <Mic size={18} />
        </button>
        <input
          ref={field}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={listening ? 'Listening…' : 'Ask about tracking, prices or pickup…'}
          aria-label="Message the assistant"
          disabled={pending || listening || configured === false}
        />
        <button className="button" type="submit" disabled={!input.trim() || pending || listening || configured === false}>
          Send <Send size={15} />
        </button>
      </form>
    </section>}
  </>;
}

export function AssistantLaunch({ label = 'Ask the assistant' }: { label?: string }) {
  return (
    <button type="button" className="assistant-inline" onClick={() => openAssistant()}>
      <MessageCircle size={16} /> {label} <ArrowRight size={16} />
    </button>
  );
}
