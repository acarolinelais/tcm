import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

export type Tema = "light" | "dark";

/** Mesma chave e mesma regra do script inline do `index.html` (ADR 0040): só "dark" liga o tema escuro. */
export const THEME_KEY = "sdf.theme";

const ouvintes = new Set<() => void>();

/** A troca em andamento: só a última tira a classe `trocando-tema` quando acaba. */
let trocaAtual: ViewTransition | undefined;

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
 * Troca pelo toggle (spec 049): uma View Transition fotografa a tela e esmaece da foto antiga para a nova, de uma
 * vez e na GPU. Animar a cor de cada elemento travava a página. Enquanto a troca dura (300 ms no `global.css`), o
 * navegador não entrega cliques à página; o teclado continua valendo, e uma nova troca pula a anterior.
 */
function alternar() {
  const tema: Tema = temaAtual() === "dark" ? "light" : "dark";
  try {
    window.localStorage.setItem(THEME_KEY, tema);
  } catch {
    // Armazenamento bloqueado (ex.: modo privado restrito): o tema vale só nesta sessão.
  }
  // Navegador sem View Transitions: troca na hora, sem passagem.
  if (typeof document.startViewTransition !== "function") {
    aplicar(tema);
    return;
  }
  const raiz = document.documentElement;
  raiz.classList.add("trocando-tema");
  // O flushSync põe o ícone novo do toggle na foto nova.
  const troca = document.startViewTransition(() => flushSync(() => trocarClasse(tema)));
  trocaAtual = troca;
  void troca.finished.finally(() => {
    if (trocaAtual === troca) raiz.classList.remove("trocando-tema");
  });
}

/** Tema atual e a troca entre claro e escuro, compartilhados por todos os toggles da página. */
export function useTheme() {
  return { tema: useSyncExternalStore(assinar, temaAtual), alternar };
}
