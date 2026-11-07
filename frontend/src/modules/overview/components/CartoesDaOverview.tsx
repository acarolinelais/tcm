import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { formatList, formatNumber } from "@/core/i18n/format";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { estadoDe, type ProjetoEscolhido } from "../hooks/useOverviewGraficos";
import type { Andamento, OverviewTime } from "../model/overview";
import { BarrasEmpilhadas } from "./graficos/BarrasEmpilhadas";
import { BarrasHorizontais } from "./graficos/BarrasHorizontais";
import { diaCurto, parte, porcentagem, resumoDeBarras, totaisDasSemanas } from "./graficos/estilo";
import { GraficoCard } from "./graficos/GraficoCard";
import { LollipopChart } from "./graficos/LollipopChart";

// Cartões que mais de um perfil usa na Overview (specs 063 e 064).

type ConsultaDoTime = UseQueryResult<OverviewTime>;

/** Os cartões do projeto escolhido no cabeçalho; sem projeto no escopo, explica (spec 063). */
export function SecaoDoProjeto({ escolha, children }: { escolha: ProjetoEscolhido; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <section aria-label={t("overviewProject")} className="grid gap-4 lg:grid-cols-2">
      {escolha.semProjetos ? (
        <div className="rounded-3xl border border-edge bg-card p-5 lg:col-span-2">
          <EstadoVazio className="mx-auto" titulo={t("noAccessibleProjects")} dica={t("noAccessibleProjectsHint")} />
        </div>
      ) : children}
    </section>
  );
}

/** Pass Rate por modelo na rodada mais recente do projeto escolhido (spec 063, RN-08; spec 064, RN-07). */
export function PassRatePorModeloCard({ escolha }: { escolha: ProjetoEscolhido }) {
  const { t } = useTranslation();
  const modelos = (escolha.projeto.data?.passRate?.modelos ?? []).map((m) => ({ nome: m.modelo, valor: parte(m.aprovados, m.total) }));
  return (
    <GraficoCard
      titulo={t("passRateTitle")}
      resumo={t("passRateSummary", { list: resumoDeBarras(modelos, porcentagem) })}
      estado={escolha.estado(!modelos.length)}
      onRetry={escolha.tentarDeNovo}
      vazio={{ titulo: t("passRateEmpty"), dica: t("passRateEmptyHint") }}
    >
      <BarrasHorizontais titulo={t("passRateTitle")} dados={modelos} formatar={porcentagem} maximo={100} />
    </GraficoCard>
  );
}

/** Finalizados por semana, pela entrada em Done (spec 063, RN-11; spec 064, RN-03 e RN-09). */
export function ConcluidosPorSemanaCard({ time }: { time: ConsultaDoTime }) {
  const { t } = useTranslation();
  const semanas = time.data?.concluidosPorSemana ?? [];
  return (
    <GraficoCard
      titulo={t("weeklyDoneTitle")}
      resumo={t("weeklySummary", totaisDasSemanas(semanas))}
      estado={estadoDe(time, semanas.every((s) => s.concluidos === 0))}
      onRetry={() => void time.refetch()}
    >
      <LollipopChart titulo={t("weeklyDoneTitle")} dados={semanas.map((s) => ({ nome: s.semana, valor: s.concluidos }))} formatarNome={diaCurto} />
    </GraficoCard>
  );
}

/** Pass Rate da rodada mais recente de cada projeto do escopo (spec 064, RN-06 e RN-10). */
export function PassRatePorProjetoCard({ time, className }: { time: ConsultaDoTime; className?: string }) {
  const { t } = useTranslation();
  const passRate = (time.data?.passRatePorProjeto ?? []).map((p) => ({ nome: p.projeto, valor: parte(p.aprovados, p.total) }));
  return (
    <GraficoCard
      titulo={t("passRateByProjectTitle")}
      resumo={t("listSummary", { list: resumoDeBarras(passRate, porcentagem) })}
      estado={estadoDe(time, !passRate.length)}
      onRetry={() => void time.refetch()}
      vazio={{ titulo: t("passRateEmpty"), dica: t("passRateEmptyHint") }}
      className={className}
    >
      <BarrasHorizontais titulo={t("passRateByProjectTitle")} dados={passRate} formatar={porcentagem} maximo={100} />
    </GraficoCard>
  );
}

/** Andamento por time ou por setor (spec 064, RN-02 e RN-08). */
export function AndamentoCard({ titulo, dados, time }: { titulo: string; dados: Andamento[]; time: ConsultaDoTime }) {
  const { t } = useTranslation();
  // Resumo para o leitor de tela: "QA: 3 a fazer, 4 em andamento, 5 em Done".
  const resumo = formatList(dados.map((a) => t("progressItem", {
    name: a.nome, todo: formatNumber(a.aFazer), progress: formatNumber(a.emAndamento), done: formatNumber(a.concluidos),
  })));
  return (
    <GraficoCard titulo={titulo} resumo={resumo} estado={estadoDe(time, !dados.length)} onRetry={() => void time.refetch()}>
      <BarrasEmpilhadas titulo={titulo} dados={dados} />
    </GraficoCard>
  );
}
