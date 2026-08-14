# Northline Express website demo

A fictional express logistics website UI demo. The project is **not affiliated with any real courier brand**. All company names, services, tracking events, quotes, and account flows are simulated for demonstration only.

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal (typically `http://localhost:5173`).

## Production checks

```bash
npm test
npm run build
npm run preview
```

The production output is written to `dist/`. Hosts using client-side routing should redirect unknown paths to `index.html`.

## Homepage assistant

The homepage includes a Northline Assistant on OpenRouter. Chat uses `nvidia/nemotron-3.5-lightning:free` with function calling. Spoken replies use `deepgram/flux-tts:free` (`flux-alexis-en`). The mic uses `mistralai/voxtral-small-24b-2507-stt`. Tool execution stays on the Vite server so `OPENROUTER_API_KEY` never ships to the browser.

```bash
cp .env.example .env
# paste your key from https://openrouter.ai/keys
npm run dev
```

If the key is missing, the chat panel explains how to add it. Routes served by the Vite plugin:

- `POST /api/chat` — Nemotron + shipping tools
- `POST /api/transcribe` — Voxtral speech-to-text
- `POST /api/speak` — Flux TTS

## Deploying on Vercel

The `api/` directory contains Vercel Functions for the three assistant routes, while the Vite plugin continues to serve the same routes locally. Before deploying, add `OPENROUTER_API_KEY` in **Vercel Project Settings → Environment Variables** for each environment that should have the assistant. Do not add the key as a `VITE_` variable.

`vercel.json` preserves single-page-app deep links. The functions validate request sizes and apply a small per-instance request limit; configure Vercel Firewall rate limiting as well before exposing the site broadly.

## Demo scenarios

- `NL123456789` — in transit
- `NL987654321` — delivered
- `NL246813579` — delayed
- `NL111111111` — delivery exception

The account area accepts any valid email and a password of six or more characters. Account state is saved in browser `localStorage` and can be reset from the dashboard.

## Important limitation

This is a local demonstration. Tracking events, quotes, serviceability, account activity and contact responses are simulated. No form submits data to a real courier network.
