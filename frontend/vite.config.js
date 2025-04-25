import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';
import path from 'path';

export default defineConfig({
  root: './public',
  resolve: {
    alias: {
      '/src': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});

