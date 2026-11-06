import { lazy, Suspense } from "react";

import { OverviewHeroCard } from "../components/OverviewHeroCard";
import { TeamPerformanceChart } from "../components/TeamPerformanceChart";
import { TotalTcsDonePieChart } from "../components/TotalTcsDonePieChart";
import { useOverview } from "../hooks/useOverview";
import { useOutletContext } from "react-router";
import type { PerfilAtual } from "@/core/auth/api";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@heroui/react";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageCard } from "@/shared/ui/page-card";

// Com o React.lazy, o Recharts só é baixado na Overview do KP e do dev (ADR 0051).
const OverviewKp = lazy(() => import("../components/OverviewKp").then((m) => ({ default: m.OverviewKp })));
const OverviewDev = lazy(() => import("../components/OverviewDev").then((m) => ({ default: m.OverviewDev })));

export function OverviewPage() {
  const perfil = useOutletContext<PerfilAtual>();
  const { t } = useTranslation();
  const { data, isError, refetch } = useOverview();

  // Um refetch que falha não esconde o que já foi carregado.
  if (isError && !data) {
    return (
      <div className="rounded-3xl border border-edge bg-card px-6 py-10">
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
      <PageCard>
        <EstadoVazio tituloDaPagina className="m-auto" titulo={t("overviewEmpty")} dica={t("overviewEmptyHint")} />
      </PageCard>
    );
  }

  const dev = perfil.perfil_codigo === "USUARIO_PADRAO";
  const graficos = perfil.perfil_codigo === "KP" ? <OverviewKp /> : dev ? <OverviewDev /> : null;
  return (
    // A casca do app tem a altura da tela: com os gráficos da spec 063, a Overview rola por dentro, como as outras páginas.
    <div className="thin-scroll -mr-2 h-full min-h-0 space-y-4 overflow-y-auto pr-2">
      <OverviewHeroCard dados={data} userName={perfil.nome} comTotal={!dev} title={perfil.perfil_codigo === "ADMIN_UNIDADE"
        ? t("adminUnitTitle", { name: perfil.unidade_nome })
        : perfil.perfil_codigo ? t(`catalog.profile.${perfil.perfil_codigo}`, { defaultValue: perfil.perfil ?? t("overview") }) : perfil.perfil || t("overview")} />
      {graficos ? <Suspense fallback={<div role="status"><span className="sr-only">{t("loading")}</span><Skeleton className="h-72 w-full rounded-3xl" /></div>}>{graficos}</Suspense> : (
        // Gerente e admin ficam como na spec 039 até a spec 064.
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
          <TotalTcsDonePieChart dados={data} />
          <TeamPerformanceChart points={data.desempenho} />
        </div>
      )}
    </div>
  );
}
