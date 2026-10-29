import { useSyncExternalStore } from "react";

export type Tema = "light" | "dark";

/** Mesma chave e mesma regra do script inline do `index.html` (ADR 0040): só "dark" liga o tema escuro. */
export const THEME_KEY = "sdf.theme";

const ouvintes = new Set<() => void>();

/** Tema em uso: a classe no `<html>`, que o script inline já aplicou antes do React. */
function temaAtual(): Tema {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Troca a classe com as transições pausadas por um quadro, para a tela não mudar de cor em partes. */
function aplicar(tema: Tema) {
  const raiz = document.documentElement;
  raiz.classList.add("sem-transicao");
  raiz.classList.toggle("dark", tema === "dark");
  requestAnimationFrame(() => raiz.classList.remove("sem-transicao"));
  ouvintes.forEach((ouvinte) => ouvinte());
}

/** Outra aba trocou o tema: acompanha, para um clique aqui não gravar o oposto do que a pessoa vê. */
function sincronizarAbas(evento: StorageEvent) {
  if (evento.key === THEME_KEY) aplicar(evento.newValue === "dark" ? "dark" : "light");
}

function assinar(ouvinte: () => void) {
  if (ouvintes.size === 0) window.addEventListener("storage", sincronizarAbas);
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
    if (ouvintes.size === 0) window.removeEventListener("storage", sincronizarAbas);
  };
}

function alternar() {
  const tema: Tema = temaAtual() === "dark" ? "light" : "dark";
  aplicar(tema);
  try {
    window.localStorage.setItem(THEME_KEY, tema);
  } catch {
    // Armazenamento bloqueado (ex.: modo privado restrito): o tema vale só nesta sessão.
  }
}

/** Tema atual e a troca entre claro e escuro, compartilhados por todos os toggles da página. */
export function useTheme() {
  return { tema: useSyncExternalStore(assinar, temaAtual), alternar };
}
