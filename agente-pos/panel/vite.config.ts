import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// El panel se compila a UN solo index.html (JS+CSS inline) para poder
// embeberlo en el ejecutable C#. Target ES2018 para cubrir Windows viejos.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    target: 'es2018',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
});
