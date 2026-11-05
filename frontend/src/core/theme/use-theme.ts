import { useSyncExternalStore } from "react";

export type Tema = "light" | "dark";

/** Mesma chave e mesma regra do script inline do `index.html` (ADR 0040): só "dark" liga o tema escuro. */
export const THEME_KEY = "sdf.theme";

const ouvintes = new Set<() => void>();

/** Duração da troca pelo toggle. É a mesma do `.trocando-tema` no `global.css`. */
const DURACAO_TROCA_MS = 800;
let fimDaTroca: ReturnType<typeof setTimeout> | undefined;

/** Tema em uso: a classe no `<html>`, que o script inline já aplicou antes do React. */
function temaAtual(): Tema {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function trocarClasse(tema: Tema) {
  document.documentElement.classList.toggle("dark", tema === "dark");
  ouvintes.forEach((ouvinte) => ouvinte());
}

/** Troca a classe com as transições pausadas por um quadro, para a tela não mudar de cor em partes. */
function aplicar(tema: Tema) {
  const raiz = document.documentElement;
  raiz.classList.add("sem-transicao");
  trocarClasse(tema);
  requestAnimationFrame(() => raiz.classList.remove("sem-transicao"));
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

/**
 * Troca pelo toggle (spec 049): durante a troca, a classe `trocando-tema` dá a todos os elementos a mesma
 * transição de cor, então a tela inteira muda junto e aos poucos. A página continua clicável, e um clique no
 * meio da troca faz as cores voltarem a partir de onde estão.
 */
function alternar() {
  const tema: Tema = temaAtual() === "dark" ? "light" : "dark";
  const raiz = document.documentElement;
  raiz.classList.add("trocando-tema");
  trocarClasse(tema);
  clearTimeout(fimDaTroca);
  fimDaTroca = setTimeout(() => raiz.classList.remove("trocando-tema"), DURACAO_TROCA_MS);
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
