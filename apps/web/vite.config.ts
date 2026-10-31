
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  // Relative paths work on GitHub Pages project sites and in /v2/ without a server rewrite.
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 5173, fs: { allow: ['../../'] } }
});
