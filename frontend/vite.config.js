import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // docx kutubxonasi brauzerda Buffer'ni kutadi
  define: { global: 'globalThis' },
  resolve: { alias: { buffer: 'buffer/' } },
  build: { chunkSizeWarningLimit: 1500 },
});
