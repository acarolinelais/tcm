import { useId, type ReactElement, type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import type { EstadoGrafico } from "../../hooks/useOverviewGraficos";

/**
 * Cartão de um gráfico da Overview (spec 063, RN-05): título, resumo em texto para leitor de tela e os estados de
 * carregando, erro e vazio. Um gráfico sem dados mostra o próprio vazio, sem esconder os outros.
 */
export function GraficoCard({ titulo, resumo, estado, onRetry, vazio, className, children }: {
  titulo: string;
  resumo: string;
  estado: EstadoGrafico;
  onRetry: () => void;
  vazio?: { titulo: string; dica: string };
  className?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <section aria-labelledby={`${id}-titulo`} className={cn("flex min-w-0 flex-col gap-4 rounded-3xl border border-edge bg-card p-5", className)}>
      <h2 id={`${id}-titulo`} className="text-sm font-semibold text-foreground">{titulo}</h2>
      {estado === "carregando" && <Skeleton className="h-48 w-full rounded-2xl" />}
      {estado === "erro" && (
        <ErroComRetry mensagem={t("chartLoadError")} retry={{ label: t("retryQuery"), onRetry }} />
      )}
      {estado === "vazio" && (
        <EstadoVazio compacto className="m-auto py-4" titulo={vazio?.titulo ?? t("chartEmpty")} dica={vazio?.dica ?? t("chartEmptyHint")} />
      )}
      {estado === "pronto" && <>
        <p className="sr-only">{resumo}</p>
        {children}
      </>}
    </section>
  );
}

/**
 * Onde o gráfico desenha: cresce até a altura do cartão, que a grade iguala à do vizinho, com `altura` de mínimo.
 * O `debounce` só redesenha quando o tamanho para de mudar: sem ele, recolher a sidebar redesenhava cada gráfico a
 * cada quadro da animação. Enquanto isso, o que passa do cartão fica cortado.
 */
export function AreaDoGrafico({ altura, children }: { altura: number; children: ReactElement }) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-hidden" style={{ minHeight: altura }}>
      <ResponsiveContainer width="100%" height="100%" debounce={150}>{children}</ResponsiveContainer>
    </div>
  );
}
