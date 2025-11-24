import type { CompletedTaskEntry, SelfDestructedTaskEntry, TaskPriority, TaskSource } from "@/types/ux";

export type StoredTask = {
  id: string;
  title: string;
  priority: TaskPriority;
  createdAt: string;
  durationMs: number;
  expiresAt: number;
  source?: TaskSource;
  reasoning?: string | null;
};

export type StatsStore = {
  completed: Record<string, number>;
  expired: Record<string, number>;
};

export type StatsSummary = {
  completedToday: number;
  expiredToday: number;
  heatmapCompleted: number[];
  heatmapExpired: number[];
  coachingTip: string;
  totalCompleted: number;
  totalExpired: number;
};

const ACTIVE_TASKS_KEY = "sd:activeTasks";
const EXPIRED_TASKS_KEY = "sd:selfDestructedTasks";
const COMPLETED_TASKS_KEY = "sd:completedTasks";
const STATS_KEY = "sd:statsStore";

const safeWindow = () => (typeof window === "undefined" ? null : window);

export function loadStoredTasks(): StoredTask[] {
  const win = safeWindow();
  if (!win) return [];
  try {
    return JSON.parse(win.localStorage.getItem(ACTIVE_TASKS_KEY) || "[]") as StoredTask[];
  } catch {
    return [];
  }
}

export function saveStoredTasks(tasks: StoredTask[]) {
  const win = safeWindow();
  if (!win) return;
  win.localStorage.setItem(ACTIVE_TASKS_KEY, JSON.stringify(tasks));
}

export function loadExpiredEntries(): SelfDestructedTaskEntry[] {
  const win = safeWindow();
  if (!win) return [];
  try {
    return JSON.parse(win.localStorage.getItem(EXPIRED_TASKS_KEY) || "[]") as SelfDestructedTaskEntry[];
  } catch {
    return [];
  }
}

export function saveExpiredEntries(entries: SelfDestructedTaskEntry[]) {
  const win = safeWindow();
  if (!win) return;
  win.localStorage.setItem(EXPIRED_TASKS_KEY, JSON.stringify(entries));
}

export function clearExpiredEntries() {
  const win = safeWindow();
  if (!win) return;
  win.localStorage.removeItem(EXPIRED_TASKS_KEY);
}

export function loadCompletedEntries(): CompletedTaskEntry[] {
  const win = safeWindow();
  if (!win) return [];
  try {
    return JSON.parse(win.localStorage.getItem(COMPLETED_TASKS_KEY) || "[]") as CompletedTaskEntry[];
  } catch {
    return [];
  }
}

export function saveCompletedEntries(entries: CompletedTaskEntry[]) {
  const win = safeWindow();
  if (!win) return;
  win.localStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify(entries));
}

export function clearCompletedEntries() {
  const win = safeWindow();
  if (!win) return;
  win.localStorage.removeItem(COMPLETED_TASKS_KEY);
}

const fallbackStats: StatsStore = { completed: {}, expired: {} };

export function loadStatsStore(): StatsStore {
  const win = safeWindow();
  if (!win) return fallbackStats;
  try {
    const parsed = JSON.parse(win.localStorage.getItem(STATS_KEY) || "null") as StatsStore | null;
    return parsed ?? fallbackStats;
  } catch {
    return fallbackStats;
  }
}

export function saveStatsStore(store: StatsStore) {
  const win = safeWindow();
  if (!win) return;
  win.localStorage.setItem(STATS_KEY, JSON.stringify(store));
}

export function getDateKey(date = new Date()) {
  return date.toISOString().split("T")[0] ?? "";
}

export function getLastNDates(days: number) {
  return Array.from({ length: days }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return getDateKey(date);
  });
}

export function getCurrentWeekDates() {
  const dates: string[] = [];
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + mondayOffset);

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    dates.push(getDateKey(current));
  }

  return dates;
}

export function buildStatsSummary(store: StatsStore, days = 7): StatsSummary {
  const todayKey = getDateKey();
  const heatmapDates = getLastNDates(days);
  // Always show Monday -> Sunday explicitly
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];
  const byWeekday: Record<number, string | null> = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
  heatmapDates.forEach((key) => {
    const weekday = new Date(key).getDay();
    byWeekday[weekday] = key;
  });
  const orderedDates = dayOrder.map((weekday) => byWeekday[weekday] ?? "");
  const heatmapCompleted = orderedDates.map((key) => (key ? store.completed[key] ?? 0 : 0));
  const heatmapExpired = orderedDates.map((key) => (key ? store.expired[key] ?? 0 : 0));
  const completedToday = store.completed[todayKey] ?? 0;
  const expiredToday = store.expired[todayKey] ?? 0;
  const totalCompleted = Object.values(store.completed).reduce((acc, count) => acc + count, 0);
  const totalExpired = Object.values(store.expired).reduce((acc, count) => acc + count, 0);

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
}
