import { OverviewHeroCard } from "../components/OverviewHeroCard";
import { TeamPerformanceChart } from "../components/TeamPerformanceChart";
import { TotalTcsDonePieChart } from "../components/TotalTcsDonePieChart";
import { useOverview } from "../hooks/useOverview";
import { useOutletContext } from "react-router";
import type { PerfilAtual } from "@/core/auth/api";

export function OverviewPage() {
  const perfil = useOutletContext<PerfilAtual>();
  const { data, isLoading } = useOverview();

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-4">
      <OverviewHeroCard stats={data.stats} userName={perfil.nome} title={perfil.perfil_codigo === "ADMIN_UNIDADE"
        ? `Administrador da unidade ${perfil.unidade_nome}`
        : perfil.perfil || "Visão geral"} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <TotalTcsDonePieChart breakdown={data.statusBreakdown} />
        <TeamPerformanceChart
          points={data.teamPerformance}
          currentPct={data.teamPerformanceCurrentPct}
        />
      </div>
    </div>
  );
}
