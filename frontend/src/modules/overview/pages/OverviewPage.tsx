import { OverviewHeroCard } from "../components/OverviewHeroCard";
import { TeamPerformanceChart } from "../components/TeamPerformanceChart";
import { TotalTcsDonePieChart } from "../components/TotalTcsDonePieChart";
import { useOverview } from "../hooks/useOverview";

export function OverviewPage() {
  const { data, isLoading } = useOverview();

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-4">
      <OverviewHeroCard stats={data.stats} />
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
