import { useState } from "react";

import type { PerfilAtual } from "@/core/auth/api";
import type { ResultadoAberto } from "../resultados-gerais/HistoricoProjetoTabela";
import { ResultadoExecucaoModal } from "../resultados-gerais/ResultadoExecucaoModal";
import { ResumoExecucoesDrawer, type CasoDoResumo } from "../resultados-gerais/ResumoExecucoesDrawer";

/**
 * Histórico de execuções de um caso aberto pela aba Form Factor (spec 058, RN-05): o mesmo painel e o mesmo detalhe de
 * resultado da General Results, com o resultado aberto guardado aqui para a página só saber qual caso está aberto.
 */
export function HistoricoCasoPainel({ caso, perfil, onFechar }: { caso: CasoDoResumo | null; perfil: PerfilAtual; onFechar: () => void }) {
  const [resultado, setResultado] = useState<ResultadoAberto | null>(null);
  return <>
    <ResumoExecucoesDrawer caso={caso} perfil={perfil} onFechar={onFechar} onAbrirResultado={setResultado} />
    <ResultadoExecucaoModal resultado={resultado} onFechar={() => setResultado(null)} />
  </>;
}
