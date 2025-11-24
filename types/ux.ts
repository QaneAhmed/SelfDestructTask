export type TaskPriority = "low" | "medium" | "high";

export type TaskSource = "manual" | "ai";

export type Task = {
  id: string;
  title: string;
  priority: TaskPriority;
  remainingMs: number;
  totalMs: number;
  status: "expiring" | "active" | "low" | "completed";
  createdAt: string;
  source?: TaskSource;
  reasoning?: string | null;
};

export type NewTaskPayload = {
  title: string;
  durationMinutes: number;
  priority: TaskPriority;
  source?: TaskSource;
  reasoning?: string | null;
};

export type TaskSection = {
  id: string;
  title: string;
  subtitle?: string;
  tasks: Task[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

export type SelfDestructedTaskEntry = {
  id: string;
  title: string;
  priority: TaskPriority;
  expiredAt: string;
  createdAt: string;
  dueAt?: string | null;
  originDurationMs?: number;
  source?: TaskSource;
  reasoning?: string | null;
  status?: "completed" | "expired";
};

export type TimelineDay = {
  dateLabel: string;
  entries: SelfDestructedTaskEntry[];
};

export type CompletedTaskEntry = {
  id: string;
  title: string;
  priority: TaskPriority;
  completedAt: string;
  createdAt: string;
  durationMs?: number;
  source?: TaskSource;
  reasoning?: string | null;
};
