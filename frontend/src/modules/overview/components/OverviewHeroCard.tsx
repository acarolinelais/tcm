import assigned from "@/shared/assets/figma/icons/assigned.svg";
import memoCheck from "@/shared/assets/figma/icons/memo-check.svg";
import note from "@/shared/assets/figma/icons/note.svg";

import type { OverviewStats } from "../model/overview";
import { StatCard } from "./StatCard";

export function OverviewHeroCard({ stats }: { stats: OverviewStats }) {
  return (
    <div className="rounded-3xl border border-border bg-card px-6 py-5">
      <h1 className="text-xl font-semibold text-foreground">Hi Caroline, you are almost done.</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Explore information and activity about your property
      </p>
      <div className="my-4 border-t border-border" />
      <div className="flex flex-wrap gap-8">
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
