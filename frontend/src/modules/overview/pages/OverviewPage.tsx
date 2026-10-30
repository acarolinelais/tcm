import { OverviewHeroCard } from "../components/OverviewHeroCard";
import { TeamPerformanceChart } from "../components/TeamPerformanceChart";
import { TotalTcsDonePieChart } from "../components/TotalTcsDonePieChart";
import { useOverview } from "../hooks/useOverview";
import { useOutletContext } from "react-router";
import type { PerfilAtual } from "@/core/auth/api";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@heroui/react";

export function OverviewPage() {
  const perfil = useOutletContext<PerfilAtual>();
  const { t } = useTranslation();
  const { data, isLoading } = useOverview();

  if (isLoading || !data) {
    return (
      <div role="status" className="space-y-4">
        <span className="sr-only">{t("loading")}</span>
        <Skeleton className="h-36 w-full rounded-3xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <OverviewHeroCard stats={data.stats} userName={perfil.nome} title={perfil.perfil_codigo === "ADMIN_UNIDADE"
        ? t("adminUnitTitle", { name: perfil.unidade_nome })
        : perfil.perfil_codigo ? t(`catalog.profile.${perfil.perfil_codigo}`, { defaultValue: perfil.perfil ?? t("overview") }) : perfil.perfil || t("overview")} />
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
