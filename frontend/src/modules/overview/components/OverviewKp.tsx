import { useState } from "react";
import { useTranslation } from "react-i18next";

import { formatNumber } from "@/core/i18n/format";
import { ProjetoSwitcher } from "@/modules/projetos/components/ProjetoSwitcher";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { useOverviewProjeto, useOverviewTime } from "../hooks/useOverviewGraficos";
import { BarrasHorizontais } from "./graficos/BarrasHorizontais";
import { BarrasVerticais } from "./graficos/BarrasVerticais";
import { BurndownChart } from "./graficos/BurndownChart";
import { diaCurto, estadoDe, resumoDeBarras, totaisDasSemanas } from "./graficos/estilo";
import { GraficoCard } from "./graficos/GraficoCard";
import { LollipopChart } from "./graficos/LollipopChart";

const porcentagem = (valor: number) => formatNumber(valor / 100, { style: "percent" });
const parte = (feitos: number, total: number) => (total ? Math.round((feitos / total) * 100) : 0);
const media = (valor: number) => formatNumber(valor, { maximumFractionDigits: 1 });

/** Gráficos do KP (spec 063, RN-07 a RN-12). Burndown e Pass Rate mostram o projeto escolhido no seletor. */
export function OverviewKp() {
  const { t } = useTranslation();
  const time = useOverviewTime();
  const [escolhido, setEscolhido] = useState<string>();
  const projetos = time.data?.projetos ?? [];
  // RN-04: abre no primeiro projeto ativo, em ordem alfabética (a API já manda nessa ordem).
  const projetoAberto = projetos.find((projeto) => projeto.id === escolhido) ?? projetos[0];
  const projeto = useOverviewProjeto(projetoAberto?.id);
  const tentarTime = () => void time.refetch();
  // O burndown e o Pass Rate dependem das duas consultas: a lista de projetos e a do projeto aberto.
  const tentarProjeto = () => void (time.isError ? time.refetch() : projeto.refetch());
  const estadoDoProjeto = (vazio: boolean) => (time.isError ? "erro" : estadoDe(projeto, vazio));

  const burndown = projeto.data?.burndown ?? [];
  const hoje = burndown.at(-1);
  const modelos = (projeto.data?.passRate?.modelos ?? []).map((m) => ({ nome: m.modelo, valor: parte(m.aprovados, m.total) }));
  const criacao = (time.data?.criacaoPorDia ?? []).map((p) => ({ nome: p.projeto, valor: p.media }));
  const devs = (time.data?.concluidosPorDev ?? []).map((dev) => ({ nome: dev.nome, valor: dev.concluidos }));
  const semanas = time.data?.concluidosPorSemana ?? [];
  const doneProjetos = time.data?.donePorProjeto ?? [];
  const done = doneProjetos.map((p) => ({ nome: p.projeto, valor: parte(p.concluidos, p.total) }));

  return (
    <div className="space-y-4">
      <section aria-label={t("overviewProject")} className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 items-center gap-3 lg:col-span-2">
          <span className="text-sm text-muted">{t("overviewProject")}</span>
          {projetoAberto && <div className="min-w-0">
            <ProjetoSwitcher comoTitulo={false} projetoId={projetoAberto.id} nome={projetoAberto.nome} projetos={projetos} buscavel onEscolher={setEscolhido} />
          </div>}
        </div>
        {time.isSuccess && !projetos.length ? (
          <div className="rounded-3xl border border-edge bg-card p-5 lg:col-span-2">
            <EstadoVazio className="mx-auto" titulo={t("noAccessibleProjects")} dica={t("noAccessibleProjectsHint")} />
          </div>
        ) : <>
          <GraficoCard
            titulo={t("burndownTitle")}
            resumo={hoje ? t("burndownSummary", { executed: formatNumber(hoje.executado), planned: formatNumber(hoje.planejado) }) : ""}
            estado={estadoDoProjeto(burndown.every((ponto) => ponto.executado === 0 && ponto.planejado === 0))}
            onRetry={tentarProjeto}
          >
            <BurndownChart titulo={t("burndownTitle")} pontos={burndown} />
          </GraficoCard>
          <GraficoCard
            titulo={t("passRateTitle")}
            resumo={t("passRateSummary", { list: resumoDeBarras(modelos, porcentagem) })}
            estado={estadoDoProjeto(!modelos.length)}
            onRetry={tentarProjeto}
            vazio={{ titulo: t("passRateEmpty"), dica: t("passRateEmptyHint") }}
          >
            <BarrasHorizontais titulo={t("passRateTitle")} dados={modelos} formatar={porcentagem} maximo={100} />
          </GraficoCard>
        </>}
      </section>

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
        <GraficoCard
          titulo={t("weeklyDoneTitle")}
          resumo={t("weeklySummary", totaisDasSemanas(semanas))}
          estado={estadoDe(time, semanas.every((s) => s.concluidos === 0))}
          onRetry={tentarTime}
        >
          <LollipopChart titulo={t("weeklyDoneTitle")} dados={semanas.map((s) => ({ nome: s.semana, valor: s.concluidos }))} formatarNome={diaCurto} />
        </GraficoCard>
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
