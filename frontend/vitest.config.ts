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
    // Sem isto o Vitest esvazia o CSS, inclusive com `?raw`; o teste de contraste do avatar lê os tokens do global.css.
    css: { include: [/global\.css/] },
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["node_modules", "e2e"],
    // Do Node 25 em diante (o `lts/*` do CI passou ao 26) há um localStorage global do próprio Node que, sem
    // --localstorage-file, fica indefinido e esconde o do jsdom. Desligado, os testes usam o do jsdom, como no 24.
    poolOptions: { forks: { execArgv: ["--no-experimental-webstorage"] } },
    // O padrão é um worker por núcleo (15 numa máquina de 16 threads, ~480 MB cada), o que esgota a RAM do WSL.
    // O minWorkers precisa vir junto: sem ele o mínimo continua sendo o número de núcleos e conflita com o máximo.
    maxWorkers: 4,
    minWorkers: 1,
    // Com 4 workers num runner do CI de poucos núcleos, os testes longos de página passam dos 5 s padrão.
    testTimeout: 15_000,
  },
});
