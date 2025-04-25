// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'public',
  publicDir: false,
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
