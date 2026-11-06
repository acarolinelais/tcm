import { useTranslation } from "react-i18next";

import { formatNumber } from "@/core/i18n/format";
import { useOverviewPessoal } from "../hooks/useOverviewGraficos";
import { BarrasVerticais } from "./graficos/BarrasVerticais";
import { DonutDone } from "./graficos/DonutDone";
import { diaCurto, estadoDe, resumoDeBarras, totaisDasSemanas } from "./graficos/estilo";
import { GraficoCard } from "./graficos/GraficoCard";
import { LollipopChart } from "./graficos/LollipopChart";

const DIFICULDADES = ["Low", "Medium", "High"] as const;

/** Gráficos do dev, só com os Test Cases em que é o responsável principal (spec 063, RN-14 a RN-16). */
export function OverviewDev() {
  const { t } = useTranslation();
  const pessoal = useOverviewPessoal();
  const dados = pessoal.data;
  const dificuldades = DIFICULDADES.map((d) => ({ nome: t(`difficulty${d}`), valor: dados?.porDificuldade[d] ?? 0 }));
  const dias = dados?.entregasPorDia ?? [];
  const semanas = dados?.entregasPorSemana ?? [];
  const semAtribuidos = !dados?.atribuidos;
  const tentarDeNovo = () => void pessoal.refetch();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <GraficoCard
          titulo={t("totalTcsDone")}
          resumo={t("doneSummary", { done: formatNumber(dados?.concluidos ?? 0), total: formatNumber(dados?.atribuidos ?? 0) })}
          estado={estadoDe(pessoal, semAtribuidos)}
          onRetry={tentarDeNovo}
        >
          <DonutDone titulo={t("totalTcsDone")} concluidos={dados?.concluidos ?? 0} total={dados?.atribuidos ?? 0} />
        </GraficoCard>
        <GraficoCard titulo={t("difficultyTitle")} resumo={t("listSummary", { list: resumoDeBarras(dificuldades) })} estado={estadoDe(pessoal, semAtribuidos)} onRetry={tentarDeNovo}>
          <BarrasVerticais titulo={t("difficultyTitle")} dados={dificuldades} />
        </GraficoCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <GraficoCard
          titulo={t("dailyDeliveriesTitle")}
          resumo={t("dailySummary", { total: formatNumber(dias.reduce((soma, d) => soma + d.concluidos, 0)) })}
          estado={estadoDe(pessoal, dias.every((d) => d.concluidos === 0))}
          onRetry={tentarDeNovo}
        >
          <BarrasVerticais titulo={t("dailyDeliveriesTitle")} dados={dias.map((d) => ({ nome: d.dia, valor: d.concluidos }))} formatarNome={diaCurto} />
        </GraficoCard>
        <GraficoCard
          titulo={t("weeklyDeliveriesTitle")}
          resumo={t("weeklySummary", totaisDasSemanas(semanas))}
          estado={estadoDe(pessoal, semanas.every((s) => s.concluidos === 0))}
          onRetry={tentarDeNovo}
        >
          <LollipopChart titulo={t("weeklyDeliveriesTitle")} dados={semanas.map((s) => ({ nome: s.semana, valor: s.concluidos }))} formatarNome={diaCurto} />
        </GraficoCard>
      </div>
    </div>
  );
}
