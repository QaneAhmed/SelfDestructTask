import { query } from "./_generated/server";
import { getUserId } from "./utils";
import { fetchStatsStore, getCurrentWeekDates } from "./statsUtils";
import { getDateKey } from "./utils";

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const store = await fetchStatsStore(ctx, userId);
    const heatmapDates = getCurrentWeekDates();
    const heatmapCompleted = heatmapDates.map((key) => store.completed[key] ?? 0);
    const heatmapExpired = heatmapDates.map((key) => store.expired[key] ?? 0);
    const todayKey = getDateKey();
    const completedToday = store.completed[todayKey ?? ""] ?? 0;
    const expiredToday = store.expired[todayKey ?? ""] ?? 0;
    const totalCompleted = Object.values(store.completed).reduce((acc, val) => acc + val, 0);
    const totalExpired = Object.values(store.expired).reduce((acc, val) => acc + val, 0);

    let coachingTip = "Keep streaking—short countdowns make progress addictive.";
    if (completedToday > expiredToday && completedToday > 0) {
      coachingTip = "You’re closing loops before they vanish. Keep leaning into that momentum.";
    } else if (expiredToday > completedToday && expiredToday > 0) {
      coachingTip = "A few timers slipped away—try setting shorter durations for medium tasks.";
    } else if (completedToday === 0 && expiredToday === 0) {
      coachingTip = "Start a tiny countdown to build the habit—30 minutes is enough.";
    }

    return {
      completedToday,
      expiredToday,
      heatmapCompleted,
      heatmapExpired,
      coachingTip,
      totalCompleted,
      totalExpired,
    };
  },
});
