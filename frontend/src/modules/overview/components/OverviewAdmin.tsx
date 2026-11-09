import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useOverviewTime } from "../hooks/useOverviewGraficos";
import { CabecalhoDoProjeto } from "./CabecalhoDaOverview";
import { AndamentoCard, ConcluidosPorSemanaCard, PassRatePorProjetoCard } from "./CartoesDaOverview";

/** Overview do admin da unidade (spec 064): o cabeçalho (RN-12) e os gráficos da unidade (RN-08 a RN-10). */
export function OverviewAdmin() {
  const { t } = useTranslation();
  const time = useOverviewTime();
  // O seletor só troca os cards do cabeçalho: os gráficos do admin são da unidade inteira.
  const [escolhido, setEscolhido] = useState<string>();
  const projetos = time.data?.projetos ?? [];
  const projetoAberto = projetos.find((p) => p.id === escolhido) ?? projetos[0];
  return (
    <div className="space-y-4">
      <CabecalhoDoProjeto time={time} selecao={{ projetos, projetoAberto, escolher: setEscolhido }} />
      <div className="grid gap-4 lg:grid-cols-2">
        <AndamentoCard titulo={t("progressBySectorTitle")} dados={time.data?.andamentoPorSetor ?? []} time={time} />
        <ConcluidosPorSemanaCard time={time} />
        <PassRatePorProjetoCard time={time} className="lg:col-span-2" />
      </div>
    </div>
  );
}
