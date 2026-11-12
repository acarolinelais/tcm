import { useState } from "react";
import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { SideDrawer } from "@/shared/ui/side-drawer";

import type { CasoComFalhas } from "../../model/projeto";
import { agruparPorTentativa } from "./agrupar-por-tentativa";

/** Spec 073, RN-12: o histórico de falhas do SDF de um caso em correção, agrupado por tentativa. */
export function FalhasDoCasoDrawer({ caso, onFechar }: { caso: CasoComFalhas | null; onFechar: () => void }) {
  const { t } = useTranslation();
  // Guarda o último caso aberto: o painel continua com as falhas durante a animação de saída.
  const [exibido, setExibido] = useState(caso);
  if (caso && caso !== exibido) setExibido(caso);
  return (
    <SideDrawer isOpen={Boolean(caso)} onOpenChange={(abrir) => { if (!abrir) onFechar(); }} title={exibido?.tc_id ?? ""} subtitle={t("sdfFailureHistory")}>
      <div className="space-y-6 px-7 py-6">
        {agruparPorTentativa(exibido?.falhas ?? []).map(([tentativa, falhas]) => (
          <section key={tentativa} aria-label={t("fixAttempt", { count: tentativa })}>
            <h3 className="mb-2 text-[14px] font-medium text-body">{t("fixAttempt", { count: tentativa })}</h3>
            <ul className="divide-y divide-separator rounded-2xl border border-edge">
              {falhas.map((falha, indice) => (
                <li key={`${falha.data_execucao}-${falha.modelo_dispositivo_id}-${indice}`} className="space-y-1 px-4 py-3 text-[13px]">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium text-body">{falha.modelo_nome}</span>
                    <span className="font-mono text-danger">{falha.resultado}</span>
                    <span className="text-muted">{falha.sdf_id ?? "—"}</span>
                    <time className="text-muted" dateTime={falha.data_execucao}>{formatDate(falha.data_execucao, { dateStyle: "medium", timeStyle: "short" })}</time>
                  </p>
                  {falha.descricao && <p className="whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-body">{falha.descricao}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </SideDrawer>
  );
}
