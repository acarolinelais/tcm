import { useEffect, useState } from "react";

/** Duração da saída dos popovers montados à mão (`.popover-enter[data-saindo]` em core/global.css). */
export const DURACAO_SAIDA_POPOVER_MS = 100;

/**
 * Mantém um popover montado durante a animação de saída, para ele sair pelo mesmo caminho por onde
 * entrou em vez de sumir de uma vez. `saindo` vira true assim que `aberto` vira false.
 */
export function usePresenca(aberto: boolean, duracaoMs = DURACAO_SAIDA_POPOVER_MS) {
  const [montado, setMontado] = useState(aberto);
  if (aberto && !montado) setMontado(true);

  useEffect(() => {
    if (aberto || !montado) return;
    const id = window.setTimeout(() => setMontado(false), duracaoMs);
    return () => window.clearTimeout(id);
  }, [aberto, montado, duracaoMs]);

  return { montado, saindo: montado && !aberto };
}
