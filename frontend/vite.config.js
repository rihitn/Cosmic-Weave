import { defineConfig, loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  // ★ 追加: 今回読み込まれた .env を表示
  const env = loadEnv(mode, process.cwd(), '');
  console.log('[vite] loaded env:', env.VITE_SUPABASE_URL);

  return {
    root: 'public',
    envDir: '..',          // ← ここを消す / 入れる を試す
    publicDir: false,
    resolve: { alias: { '/src': path.resolve(__dirname, 'src') } },
    build: { outDir: '../dist', emptyOutDir: true }
  };
});
