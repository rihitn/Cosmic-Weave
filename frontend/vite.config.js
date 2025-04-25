import { defineConfig } from 'vite';

export default defineConfig({
  root: './public', // index.html がある場所
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  }
});
