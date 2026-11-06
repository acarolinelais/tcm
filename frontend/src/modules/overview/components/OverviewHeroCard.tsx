import assigned from "@/shared/assets/figma/icons/assigned.svg";
import memoCheck from "@/shared/assets/figma/icons/memo-check.svg";
import note from "@/shared/assets/figma/icons/note.svg";

import type { OverviewData } from "../model/overview";
import { StatCard } from "./StatCard";
import { useTranslation } from "react-i18next";
import { formatNumber } from "@/core/i18n/format";
import { cn } from "@/shared/lib/utils";

export function OverviewHeroCard({
  dados,
  title,
  userName,
  comTotal = true,
}: {
  dados: OverviewData;
  title: string;
  userName: string;
  /** O dev não vê o card All (spec 063, RN-13). */
  comTotal?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-3xl border border-edge bg-card px-6 py-4">
      <h1 className="text-sm font-medium text-accent-text">{title}</h1>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("hello", { name: userName })}</p>
      <div className="my-3 border-t border-border" />
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6", comTotal ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        <StatCard icon={memoCheck} label={t("completed")} value={`${formatNumber(dados.concluidos)} ${t("testCases")}`} />
        <StatCard
          icon={assigned}
          label={t("assigned")}
          value={`${formatNumber(dados.atribuidos)} ${t("testCases")}`}
          iconBg="bg-accent-tint"
        />
        <StatCard icon={note} label={t("inProgress")} value={`${formatNumber(dados.emAndamento)} ${t("testCases")}`} />
        {comTotal && <StatCard icon={memoCheck} label={t("allTests")} value={`${formatNumber(dados.total)} ${t("testCases")}`} />}
      </div>
    </div>
  );
}
