import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { SideDrawer } from "@/shared/ui/side-drawer";
import { useResumoExecucoes } from "../../hooks/useProjetos";
import type { CasoHistorico } from "../../model/projeto";
import { formatarDia } from "./formatar-dia";
import type { ResultadoAberto } from "./HistoricoProjetoTabela";
import { ResultadoBotao, SemExecucao } from "./ResultadoBotao";

/** O que o painel lê do caso: a General Results e a aba Form Factor do projeto (spec 058) o preenchem de formas diferentes. */
export type CasoDoResumo = Pick<CasoHistorico, "caso_teste_id" | "tc_id" | "responsavel_identificador">;

interface Props {
  caso: CasoDoResumo | null;
  perfil: PerfilAtual;
  onFechar: () => void;
  onAbrirResultado: (resultado: ResultadoAberto) => void;
}

/** Resumo de execuções (spec 032, RN-13): grade de todos os devices × todas as datas do caso, em ordem cronológica. */
export function ResumoExecucoesDrawer({ caso, perfil, onFechar, onAbrirResultado }: Props) {
  const { t } = useTranslation();
  // O painel continua mostrando o último caso enquanto a animação de saída roda.
  const [exibido, setExibido] = useState(caso);
  if (caso && caso !== exibido) setExibido(caso);
  const resumo = useResumoExecucoes(exibido?.caso_teste_id ?? null, perfil);
  const dados = resumo.data;

  function conteudo() {
    if (resumo.isPending) return <p role="status" className="text-[14px] text-muted">{t("loading")}</p>;
    if (resumo.isError || !dados) return <ErroComRetry mensagem={t("resultsLoadError")} retry={{ label: t("retryQuery"), onRetry: () => void resumo.refetch() }} />;
    if (!dados.datas.length) return <p className="text-[14px] text-muted">{t("noCaseRuns")}</p>;
    return <div className="thin-scroll overflow-x-auto">
      {/* Grade de leitura dentro do painel, sem filtros nem paginação: exceção ao DataTable (docs/tables-rules.md). */}
      <table className="w-max min-w-full border-collapse text-[14px] leading-5 text-body">
        <caption className="sr-only">{t("executionSummary")} {dados.tc_id}</caption>
        <thead>
          <tr className="border-b border-separator">
            <th scope="col" className="sticky left-0 bg-surface py-2 pe-4 text-start font-medium text-muted">{t("device")}</th>
            {dados.datas.map((dia) => <th key={dia} scope="col" className="whitespace-nowrap px-2 py-2 text-start font-medium text-muted">{formatarDia(dia)}</th>)}
          </tr>
        </thead>
        <tbody>
          {dados.modelos.map((modelo) => <tr key={modelo.id} className="border-b border-separator">
            <th scope="row" className="sticky left-0 whitespace-nowrap bg-surface py-2 pe-4 text-start font-normal">{modelo.nome}</th>
            {dados.datas.map((dia) => {
              const execucoes = dados.resultados[dia]?.[modelo.id] ?? [];
              return <td key={dia} className="px-2 py-2 align-top">
                {execucoes.length
                  ? <div className="flex flex-col items-start gap-2">
                    {execucoes.map((execucao) => <ResultadoBotao
                      key={execucao.execucao_id}
                      resultado={execucao.resultado}
                      device={modelo.nome}
                      dia={dia}
                      onPress={() => onAbrirResultado({ tcId: dados.tc_id, device: modelo.nome, dia, resultado: execucao })}
                    />)}
                  </div>
                  : <SemExecucao device={modelo.nome} dia={dia} />}
              </td>;
            })}
          </tr>)}
        </tbody>
      </table>
    </div>;
  }

  return <SideDrawer
    variant="card"
    isOpen={caso !== null}
    onOpenChange={(aberto) => { if (!aberto) onFechar(); }}
    title={t("executionSummary")}
    subtitle={exibido?.tc_id}
  >
    <div className="grid gap-5 px-7 pb-7">
      <p className="text-[14px]">
        <span className="text-muted">{t("testerId")}: </span>
        <span className="text-body">{exibido?.responsavel_identificador ?? "—"}</span>
      </p>
      {exibido && conteudo()}
    </div>
  </SideDrawer>;
}
