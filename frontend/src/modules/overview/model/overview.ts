export interface OverviewStats {
  completed: number;
  assigned: number;
  inProgress: number;
  all: number;
}

export interface StatusBreakdown {
  completedPct: number;
  todoPct: number;
  inProgressPct: number;
}

export interface TeamPerformancePoint {
  month: string;
  value: number;
}

export interface OverviewData {
  stats: OverviewStats;
  statusBreakdown: StatusBreakdown;
  teamPerformance: TeamPerformancePoint[];
  teamPerformanceCurrentPct: number;
}
