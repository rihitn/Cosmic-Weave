import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: "public", // ← index.html のある場所
  publicDir: false, // ← これで二重読み込みを防ぐ
  resolve: {
    alias: {
      "/src": path.resolve(__dirname, "src"), // ← /src を使えるようにする
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
