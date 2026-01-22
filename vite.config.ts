
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Permite que el SDK de Gemini acceda a process.env.API_KEY de forma segura
    'process.env': process.env
  },
  build: {
    outDir: 'dist',
    target: 'esnext'
  }
});
