import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    sourcemap: true,
    target: 'baseline-widely-available',
    rolldownOptions: {
      output: {
        // Libraries that rarely change get their own long-cached files.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\/](react|react-dom|scheduler)[\/]/ },
            { name: 'supabase', test: /node_modules[\/]@supabase[\/]/ },
          ],
        },
      },
    },
  },
});
