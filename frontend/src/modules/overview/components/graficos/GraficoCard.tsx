import { useId, type ReactNode } from "react";
import { Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import type { EstadoGrafico } from "./estilo";

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
        <EstadoVazio className="m-auto py-4" titulo={vazio?.titulo ?? t("chartEmpty")} dica={vazio?.dica ?? t("chartEmptyHint")} />
      )}
      {estado === "pronto" && <>
        <p className="sr-only">{resumo}</p>
        {children}
      </>}
    </section>
  );
}
