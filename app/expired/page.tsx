"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { timeAgo } from "@/lib/timeAgo";

type TaskPriority = "low" | "medium" | "high";

interface ExpiredTask {
  id: string;
  title: string;
  priority: TaskPriority;
  dueAt: string | null;
  expiresAt: number;
  createdAt: string;
  expiredAt: string;
}

interface GroupedTasks {
  label: string;
  items: ExpiredTask[];
}

const EXPIRED_STORAGE_KEY = "sd:expired";

const priorityBadge: Record<TaskPriority, string> = {
  low: "bg-emerald-100 text-emerald-600",
  medium: "bg-sky-100 text-sky-600",
  high: "bg-rose-100 text-rose-600",
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
      date
    );
  } catch {
    return date.toLocaleString();
  }
}

function groupTasks(tasks: ExpiredTask[]): [string, GroupedTasks][] {
  const groups = new Map<string, GroupedTasks>();

  for (const task of tasks) {
    const date = new Date(task.expiredAt);
    const key = date.toISOString().split("T")[0] ?? task.expiredAt;
    const label = date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (!groups.has(key)) {
      groups.set(key, { label, items: [] });
    }
    groups.get(key)!.items.push(task);
  }

  return Array.from(groups.entries()).sort(
    (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
  );
}

export default function ExpiredTasksPage() {
  const [expiredTasks, setExpiredTasks] = useState<ExpiredTask[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(EXPIRED_STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as ExpiredTask[]) : [];
      const sanitized = Array.isArray(parsed)
        ? parsed
            .filter((task) => typeof task.expiredAt === "string" && typeof task.title === "string")
            .sort((a, b) => Date.parse(b.expiredAt) - Date.parse(a.expiredAt))
        : [];
      setExpiredTasks(sanitized);
    } catch (error) {
      console.error("Failed to load expired tasks", error);
    }
  }, []);

  const groupedTasks = useMemo(() => groupTasks(expiredTasks), [expiredTasks]);

  const handleClearHistory = () => {
    setExpiredTasks([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(EXPIRED_STORAGE_KEY);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100/70 py-12 px-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 rounded-3xl bg-white/80 px-6 py-8 shadow-glow sm:px-10 sm:py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-1 text-rose-600 font-medium text-sm">
              Expired Archive
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-midnight-900">
              Vanished Tasks
            </h1>
            <p className="mt-2 max-w-2xl text-base text-midnight-600">
              Every task that reached its deadline ends up here with an exact timestamp. Use it as a quick audit trail before everything fades away.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-midnight-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
            >
              Back to active tasks
            </Link>
            {expiredTasks.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="inline-flex items-center justify-center rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
              >
                Clear archive
              </button>
            )}
          </div>
        </header>

        {expiredTasks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-midnight-600">
            Nothing has expired yet. Tasks will appear here the moment their countdown ends.
          </div>
        ) : (
          <div className="space-y-8">
            {groupedTasks.map(([isoKey, group]) => (
              <section key={isoKey} className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-midnight-400">
                  {group.label}
                </h2>
                <ul className="space-y-3">
                  {group.items.map((task) => (
                    <li
                      key={`${task.id}-${task.expiredAt}`}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-midnight-900">{task.title}</p>
                          <p className="text-xs font-medium text-midnight-400">
                            added {timeAgo(task.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 self-start rounded-full px-3 py-1 text-xs font-semibold ${priorityBadge[task.priority]}`}
                        >
                          {task.priority === "high" ? "🔥" : null}
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-midnight-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100/70 px-3 py-1 font-medium text-rose-600">
                          Expired at {formatTimestamp(task.expiredAt)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-midnight-500">
                          Scheduled for {formatTimestamp(new Date(task.expiresAt).toISOString())}
                        </span>
                        {task.dueAt && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-600">
                            Due {formatTimestamp(task.dueAt)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
