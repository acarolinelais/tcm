import { useTranslation } from "react-i18next";

import { formatNumber } from "@/core/i18n/format";
import { estadoDe, useOverviewTime, useProjetoEscolhido } from "../hooks/useOverviewGraficos";
import { BarrasHorizontais } from "./graficos/BarrasHorizontais";
import { BarrasVerticais } from "./graficos/BarrasVerticais";
import { BurndownChart } from "./graficos/BurndownChart";
import { parte, porcentagem, resumoDeBarras } from "./graficos/estilo";
import { GraficoCard } from "./graficos/GraficoCard";
import { CabecalhoDoProjeto } from "./CabecalhoDaOverview";
import { ConcluidosPorSemanaCard, PassRatePorModeloCard, SecaoDoProjeto } from "./CartoesDaOverview";

const media = (valor: number) => formatNumber(valor, { maximumFractionDigits: 1 });

/** Gráficos do KP (spec 063, RN-07 a RN-12). Burndown e Pass Rate mostram o projeto escolhido no seletor. */
export function OverviewKp() {
  const { t } = useTranslation();
  const time = useOverviewTime();
  const escolha = useProjetoEscolhido(time);
  const tentarTime = () => void time.refetch();

  const burndown = escolha.projeto.data?.burndown ?? [];
  const hoje = burndown.at(-1);
  const criacao = (time.data?.criacaoPorDia ?? []).map((p) => ({ nome: p.projeto, valor: p.media }));
  const devs = (time.data?.concluidosPorDev ?? []).map((dev) => ({ nome: dev.nome, valor: dev.concluidos }));
  const doneProjetos = time.data?.donePorProjeto ?? [];
  const done = doneProjetos.map((p) => ({ nome: p.projeto, valor: parte(p.concluidos, p.total) }));

  return (
    <div className="space-y-4">
      <CabecalhoDoProjeto time={time} selecao={escolha} />
      <SecaoDoProjeto escolha={escolha}>
        <GraficoCard
          titulo={t("burndownTitle")}
          resumo={hoje ? t("burndownSummary", { executed: formatNumber(hoje.executado), planned: formatNumber(hoje.planejado) }) : ""}
          estado={escolha.estado(burndown.every((ponto) => ponto.executado === 0 && ponto.planejado === 0))}
          onRetry={escolha.tentarDeNovo}
        >
          <BurndownChart titulo={t("burndownTitle")} pontos={burndown} />
        </GraficoCard>
        <PassRatePorModeloCard escolha={escolha} />
      </SecaoDoProjeto>

      {/* Os cartões de cada linha ficam com a mesma altura, e o gráfico cresce até ela (AreaDoGrafico). */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GraficoCard
          titulo={t("creationTitle")}
          resumo={t("creationSummary", { list: resumoDeBarras(criacao, media) })}
          estado={estadoDe(time, criacao.every((p) => p.valor === 0))}
          onRetry={tentarTime}
        >
          <BarrasVerticais titulo={t("creationTitle")} dados={criacao} formatar={media} />
        </GraficoCard>
        <GraficoCard titulo={t("devDoneTitle")} resumo={t("listSummary", { list: resumoDeBarras(devs) })} estado={estadoDe(time, !devs.length)} onRetry={tentarTime}>
          <BarrasHorizontais titulo={t("devDoneTitle")} dados={devs} />
        </GraficoCard>
        <ConcluidosPorSemanaCard time={time} />
        <GraficoCard
          titulo={t("doneByProjectTitle")}
          resumo={t("listSummary", { list: resumoDeBarras(done, porcentagem) })}
          estado={estadoDe(time, doneProjetos.every((p) => p.total === 0))}
          onRetry={tentarTime}
        >
          <BarrasVerticais titulo={t("doneByProjectTitle")} dados={done} formatar={porcentagem} maximo={100} />
        </GraficoCard>
      </div>
    </div>
  );
}
