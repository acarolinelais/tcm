import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["node_modules", "e2e"],
    // Do Node 25 em diante (o `lts/*` do CI passou ao 26) há um localStorage global do próprio Node que, sem
    // --localstorage-file, fica indefinido e esconde o do jsdom. Desligado, os testes usam o do jsdom, como no 24.
    poolOptions: { forks: { execArgv: ["--no-experimental-webstorage"] } },
  },
});
