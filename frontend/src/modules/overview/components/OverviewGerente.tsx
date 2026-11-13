import { useTranslation } from "react-i18next";

import { formatNumber } from "@/core/i18n/format";
import { estadoDe, useOverviewTime, useProjetoEscolhido } from "../hooks/useOverviewGraficos";
import { CabecalhoDoProjeto } from "./CabecalhoDaOverview";
import { AndamentoCard, ConcluidosPorSemanaCard, CorrecoesPorDevCard, PassRatePorModeloCard, PassRatePorProjetoCard } from "./CartoesDaOverview";
import { BarrasHorizontais } from "./graficos/BarrasHorizontais";
import { parte, porcentagem, resumoDeBarras } from "./graficos/estilo";
import { GraficoCard } from "./graficos/GraficoCard";

/** Gráficos do gerente (spec 064, RN-02 a RN-07), com os times e projetos do escopo dele (ADR 0036). */
export function OverviewGerente() {
  const { t } = useTranslation();
  const time = useOverviewTime();
  const escolha = useProjetoEscolhido(time);
  const tentarTime = () => void time.refetch();

  const retrabalho = (time.data?.emCorrecaoPorProjeto ?? []).map((p) => ({ nome: p.projeto, valor: p.emCorrecao }));
  const doneProjetos = time.data?.donePorProjeto ?? [];
  // RN-05: a quantidade e a parte do total, como "4 (44%)".
  const done = doneProjetos.map((p) => {
    const valor = parte(p.concluidos, p.total);
    return { nome: p.projeto, valor, rotulo: `${formatNumber(p.concluidos)} (${porcentagem(valor)})` };
  });

  return (
    <div className="space-y-4">
      <CabecalhoDoProjeto time={time} selecao={escolha} />
      {/* Os cartões de cada linha ficam com a mesma altura, e o gráfico cresce até ela (AreaDoGrafico). */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AndamentoCard titulo={t("progressByTeamTitle")} dados={time.data?.andamentoPorTime ?? []} time={time} />
        <ConcluidosPorSemanaCard time={time} />
        <CorrecoesPorDevCard time={time} />
        <GraficoCard
          titulo={t("reworkTitle")}
          resumo={t("listSummary", { list: resumoDeBarras(retrabalho) })}
          estado={estadoDe(time, !retrabalho.length)}
          onRetry={tentarTime}
          vazio={{ titulo: t("reworkEmpty"), dica: t("reworkEmptyHint") }}
        >
          <BarrasHorizontais titulo={t("reworkTitle")} dados={retrabalho} />
        </GraficoCard>
        <GraficoCard
          titulo={t("doneByProjectTitle")}
          resumo={t("listSummary", { list: resumoDeBarras(done) })}
          estado={estadoDe(time, doneProjetos.every((p) => p.total === 0))}
          onRetry={tentarTime}
        >
          <BarrasHorizontais titulo={t("doneByProjectTitle")} dados={done} formatar={porcentagem} maximo={100} />
        </GraficoCard>
        <PassRatePorProjetoCard time={time} />
        {/* Na mesma grade, para as linhas fecharem sem um cartão sozinho. Sem projeto, não há o que escolher. */}
        {!escolha.semProjetos && <PassRatePorModeloCard escolha={escolha} />}
      </div>
    </div>
  );
}
