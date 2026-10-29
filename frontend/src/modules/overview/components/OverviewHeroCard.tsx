import assigned from "@/shared/assets/figma/icons/assigned.svg";
import memoCheck from "@/shared/assets/figma/icons/memo-check.svg";
import note from "@/shared/assets/figma/icons/note.svg";

import type { OverviewStats } from "../model/overview";
import { StatCard } from "./StatCard";
import { useTranslation } from "react-i18next";
import { formatNumber } from "@/core/i18n/format";

export function OverviewHeroCard({
  stats,
  title,
  userName,
}: {
  stats: OverviewStats;
  title: string;
  userName: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-3xl border border-border bg-card px-6 py-4">
      <h1 className="text-sm font-medium text-foreground">{title}</h1>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("hello", { name: userName })}</p>
      <div className="my-3 border-t border-border" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <StatCard icon={memoCheck} label={t("completed")} value={`${formatNumber(stats.completed)} ${t("testCases")}`} />
        <StatCard
          icon={assigned}
          label={t("assigned")}
          value={`${formatNumber(stats.assigned)} ${t("testCases")}`}
          iconBg="bg-accent-tint"
        />
        <StatCard icon={note} label={t("inProgress")} value={`${formatNumber(stats.inProgress)} ${t("testCases")}`} />
        <StatCard icon={memoCheck} label={t("allTests")} value={`${formatNumber(stats.all)} ${t("testCases")}`} />
      </div>
    </div>
  );
}
