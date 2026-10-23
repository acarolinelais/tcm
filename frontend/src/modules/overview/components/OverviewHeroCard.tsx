import assigned from "@/shared/assets/figma/icons/assigned.svg";
import memoCheck from "@/shared/assets/figma/icons/memo-check.svg";
import note from "@/shared/assets/figma/icons/note.svg";

import type { OverviewStats } from "../model/overview";
import { StatCard } from "./StatCard";

export function OverviewHeroCard({
  stats,
  title,
  userName,
}: {
  stats: OverviewStats;
  title: string;
  userName: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card px-6 py-4">
      <h1 className="text-sm font-medium text-foreground">{title}</h1>
      <p className="mt-0.5 text-xs text-muted-foreground">You are almost done, {userName}.</p>
      <div className="my-3 border-t border-border" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <StatCard icon={memoCheck} label="Completed" value={`${stats.completed} TCs`} />
        <StatCard
          icon={assigned}
          label="Assigned"
          value={`${stats.assigned} TCs`}
          iconBg="bg-[#EDF2FF]"
        />
        <StatCard icon={note} label="In Progress" value={`${stats.inProgress} TCs`} />
        <StatCard icon={memoCheck} label="All" value={`${stats.all} TCs`} />
      </div>
    </div>
  );
}
