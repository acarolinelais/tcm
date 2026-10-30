import { OverviewHeroCard } from "../components/OverviewHeroCard";
import { TeamPerformanceChart } from "../components/TeamPerformanceChart";
import { TotalTcsDonePieChart } from "../components/TotalTcsDonePieChart";
import { useOverview } from "../hooks/useOverview";
import { useOutletContext } from "react-router";
import type { PerfilAtual } from "@/core/auth/api";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/shared/ui/skeleton";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { InboxIcon } from "@/shared/ui/figma-icons";

export function OverviewPage() {
  const perfil = useOutletContext<PerfilAtual>();
  const { t } = useTranslation();
  const { data, isError, refetch } = useOverview();

  // Um refetch que falha não esconde o que já foi carregado.
  if (isError && !data) {
    return (
      <div className="rounded-3xl border border-border bg-card px-6 py-10">
        <ErroComRetry mensagem={t("overviewLoadError")} retry={{ label: t("retryQuery"), onRetry: () => void refetch() }} />
      </div>
    );
  }

  if (!data) {
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

  // Sem casos no escopo: explica em vez de mostrar zeros soltos (spec 039, RN-05).
  if (data.total === 0) {
    return (
      <div role="status" className="rounded-3xl border border-border bg-card px-6 py-10 text-center">
        <InboxIcon className="mx-auto mb-3 text-body" />
        <h1 className="text-base font-medium text-foreground">{t("overviewEmpty")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("overviewEmptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <OverviewHeroCard dados={data} userName={perfil.nome} title={perfil.perfil_codigo === "ADMIN_UNIDADE"
        ? t("adminUnitTitle", { name: perfil.unidade_nome })
        : perfil.perfil_codigo ? t(`catalog.profile.${perfil.perfil_codigo}`, { defaultValue: perfil.perfil ?? t("overview") }) : perfil.perfil || t("overview")} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <TotalTcsDonePieChart dados={data} />
        <TeamPerformanceChart points={data.desempenho} />
      </div>
    </div>
  );
}
