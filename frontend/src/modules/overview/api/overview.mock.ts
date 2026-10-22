import type { OverviewData } from "../model/overview";

export const overviewMock: OverviewData = {
  stats: { completed: 26, assigned: 40, inProgress: 4, all: 4 },
  statusBreakdown: { completedPct: 67, todoPct: 20, inProgressPct: 13 },
  teamPerformance: [
    { month: "Jan", value: 20 },
    { month: "Feb", value: 35 },
    { month: "Mar", value: 28 },
    { month: "Apr", value: 42 },
    { month: "May", value: 38 },
    { month: "Jun", value: 55 },
    { month: "Jul", value: 48 },
    { month: "Aug", value: 60 },
    { month: "Sep", value: 52 },
    { month: "Oct", value: 67 },
    { month: "Nov", value: 58 },
    { month: "Dec", value: 70 },
  ],
  teamPerformanceCurrentPct: 67,
};

export async function fetchOverviewMock(): Promise<OverviewData> {
  return overviewMock;
}
