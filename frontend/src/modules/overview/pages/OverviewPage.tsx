import { lazy, Suspense, type ComponentType } from "react";

import { ClipboardCheck, ClipboardList, ClipboardPen } from "lucide-react";

import { CabecalhoDaOverview } from "../components/CabecalhoDaOverview";
import { useOverview } from "../hooks/useOverview";
import { useOutletContext } from "react-router";
import type { PerfilAtual } from "@/core/auth/api";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@heroui/react";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { PageCard } from "@/shared/ui/page-card";

// Com o React.lazy, o Recharts só é baixado na Overview (ADR 0051).
const OverviewKp = lazy(() => import("../components/OverviewKp").then((m) => ({ default: m.OverviewKp })));
const OverviewDev = lazy(() => import("../components/OverviewDev").then((m) => ({ default: m.OverviewDev })));
const OverviewGerente = lazy(() => import("../components/OverviewGerente").then((m) => ({ default: m.OverviewGerente })));
const OverviewAdmin = lazy(() => import("../components/OverviewAdmin").then((m) => ({ default: m.OverviewAdmin })));

// Os gráficos de cada perfil (specs 063 e 064); um perfil sem visão própria fica só com os cards.
const GRAFICOS_POR_PERFIL: Record<string, ComponentType> = {
  KP: OverviewKp,
  USUARIO_PADRAO: OverviewDev,
  GERENTE: OverviewGerente,
  ADMIN_UNIDADE: OverviewAdmin,
};

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

  const Graficos = GRAFICOS_POR_PERFIL[perfil.perfil_codigo ?? ""];
  return (
    // A casca do app tem a altura da tela: com os gráficos, a Overview rola por dentro, como as outras páginas. O
    // `relative` prende aqui os resumos `sr-only` (absolutos): sem ele, eles esticam o documento e a página toda rola.
    <div className="thin-scroll relative -mr-2 h-full min-h-0 space-y-4 overflow-y-auto pr-2">
      {/* Cada visão traz o próprio cabeçalho (spec 064, RN-12); um perfil sem visão fica só com ele. */}
      {Graficos ? <Suspense fallback={<div role="status"><span className="sr-only">{t("loading")}</span><Skeleton className="h-72 w-full rounded-3xl" /></div>}><Graficos /></Suspense> : (
        <CabecalhoDaOverview
          rotuloDosCards={t("overviewMyCards")}
          cards={[
            { icone: ClipboardCheck, rotulo: t("completed"), valor: data.concluidos },
            { icone: ClipboardPen, rotulo: t("inProgress"), valor: data.emAndamento },
            { icone: ClipboardList, rotulo: t("allTests"), valor: data.total },
          ]}
        />
      )}
    </div>
  );
}
