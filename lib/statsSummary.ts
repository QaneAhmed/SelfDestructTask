export type StatsSummary = {
  completedToday: number;
  expiredToday: number;
  heatmapCompleted: number[];
  heatmapExpired: number[];
  coachingTip: string;
  totalCompleted: number;
  totalExpired: number;
};

export const emptySummary: StatsSummary = {
  completedToday: 0,
  expiredToday: 0,
  heatmapCompleted: Array(7).fill(0),
  heatmapExpired: Array(7).fill(0),
  coachingTip: "Start a tiny countdown to build the habit—30 minutes is enough.",
  totalCompleted: 0,
  totalExpired: 0,
};
