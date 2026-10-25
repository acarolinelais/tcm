import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  envDir: fileURLToPath(new URL("..", import.meta.url)),
  plugins: [react(), tailwindcss()],
  // O worker da planilha importa o xlsx sob demanda: o formato padrão (iife) não aceita divisão de código.
  worker: { format: "es" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.SDF_E2E_API_URL ?? "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
