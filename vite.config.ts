import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { assistantApiPlugin } from './server/assistant-plugin.ts';

export default defineConfig({
  plugins: [react(), assistantApiPlugin()],
  server: { port: 4173, host: '0.0.0.0' },
  preview: { port: 4173, host: '0.0.0.0' },
});
