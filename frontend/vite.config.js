import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'public',
  envDir: '..',          // ← これを追加
  publicDir: false,
  resolve: {
    alias: { '/src': path.resolve(__dirname, 'src') }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});
