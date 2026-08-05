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

## Demo scenarios

- `NL123456789` — in transit
- `NL987654321` — delivered
- `NL246813579` — delayed
- `NL111111111` — delivery exception

The account area accepts any valid email and a password of six or more characters. Account state is saved in browser `localStorage` and can be reset from the dashboard.

## Important limitation

This is a local demonstration. Tracking events, quotes, serviceability, account activity and contact responses are simulated. No form submits data to a real courier network.
