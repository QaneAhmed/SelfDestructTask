"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fireConfetti } from "@/lib/confetti";
import { timeAgo } from "@/lib/timeAgo";

type TaskPriority = "low" | "medium" | "high";

interface ActiveTask {
  id: string;
  title: string;
  priority: TaskPriority;
  dueAt: string | null;
  expiresAt: number;
  createdAt: string;
}

interface ExpiredTask extends ActiveTask {
  expiredAt: string;
}

interface CompletedTask {
  id: string;
  title: string;
  createdAt: string;
  completedAt: string;
  durationMins?: number;
  priority: TaskPriority;
  dueAt: string | null;
}

interface ParsedTask {
  title: string;
  due: string | null;
  priority: TaskPriority;
  fallback?: boolean;
}

type RemovalReason = "complete" | "delete" | "expired";

interface RemovalInfo {
  task: ActiveTask;
  reason: RemovalReason;
  timestamp: number;
  durationMins?: number;
}

const DEFAULT_HOURS = 24;
const URGENT_THRESHOLD_MS = 60 * 60 * 1000;
const MAX_EXPIRED_STORED = 200;
const REMOVAL_DELAY = 320; // ms

const ACTIVE_TASKS_KEY = "sd:tasks";
const EXPIRED_TASKS_KEY = "sd:expired";

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function dedupeTasks<T extends { id: string }>(tasks: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const task of tasks) {
    if (seen.has(task.id)) {
      continue;
    }
    seen.add(task.id);
    result.push(task);
  }
  return result;
}

function getDateKey(date = new Date()): string {
  return date.toISOString().split("T")[0]!;
}

function getCompletedKey(dateKey: string) {
  return `sd:completed:${dateKey}`;
}

function getExpiredCountKey(dateKey: string) {
  return `sd:expiredCount:${dateKey}`;
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) {
    return "Expired";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const HH = hours.toString().padStart(2, "0");
  const MM = minutes.toString().padStart(2, "0");
  const SS = seconds.toString().padStart(2, "0");

  return `${HH}:${MM}:${SS}`;
}

function formatDueLabel(due: string | null): string | null {
  if (!due) {
    return null;
  }
  const dueDate = new Date(due);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dueDate);
}

function buildLocalDueISO(hour: number, minute = 0) {
  const now = new Date();
  const due = new Date(now);
  due.setHours(hour, minute, 0, 0);
  if (due.getTime() <= now.getTime()) {
    due.setDate(due.getDate() + 1);
  }
  return due.toISOString();
}

function detectTimeHint(input: string) {
  const match = input.match(/^(.*\S)?\s+(\d{1,2})(?::(\d{2}))?\s*$/);
  if (!match) {
    return null;
  }
  const base = (match[1] ?? "").trim();
  const hour = Number(match[2]);
  const minute = match[3] ? Number(match[3]) : 0;
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
    return null;
  }
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) {
    return null;
  }

  return {
    text: base.length > 0 ? base : input.trim(),
    hour,
    minute,
    dueISO: buildLocalDueISO(hour, minute),
  };
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

const priorityBadge: Record<TaskPriority, { label: string; className: string; icon?: string }> = {
  low: { label: "Low", className: "bg-emerald-100 text-emerald-600" },
  medium: { label: "Medium", className: "bg-sky-100 text-sky-600" },
  high: { label: "High", className: "bg-rose-100 text-rose-600", icon: "🔥" },
};

export default function HomePage() {
  const [tasks, setTasks] = useState<ActiveTask[]>([]);
  const [expiredTasks, setExpiredTasks] = useState<ExpiredTask[]>([]);
  const [completedToday, setCompletedToday] = useState<CompletedTask[]>([]);
  const [expiredCountToday, setExpiredCountToday] = useState(0);
  const [dateKey, setDateKey] = useState(getDateKey());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [relativeNow, setRelativeNow] = useState(Date.now());

  const [manualTitle, setManualTitle] = useState("");
  const [manualHours, setManualHours] = useState("");
  const [manualPriority, setManualPriority] = useState<TaskPriority>("medium");

  const [aiInput, setAiInput] = useState("");
  const [aiResult, setAiResult] = useState<ParsedTask | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPriority, setAiPriority] = useState<TaskPriority>("medium");

  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [completionTaskTitle, setCompletionTaskTitle] = useState<string | null>(null);
  const [showExpiredRestore, setShowExpiredRestore] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<Map<string, RemovalInfo>>(new Map());

  const tasksRef = useRef<ActiveTask[]>([]);
  const pendingRemovalRef = useRef<Map<string, RemovalInfo>>(new Map());
  const removalTimersRef = useRef<Map<string, number>>(new Map());
  const messageTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedTasks = safeParseJson<ActiveTask[]>(localStorage.getItem(ACTIVE_TASKS_KEY)) ?? [];
      const activeTasks = storedTasks.filter(
        (task) =>
          typeof task.expiresAt === "number" &&
          typeof task.createdAt === "string" &&
          typeof task.title === "string"
      );

      setTasks(activeTasks);
      tasksRef.current = activeTasks;

      const storedExpired =
        safeParseJson<ExpiredTask[]>(localStorage.getItem(EXPIRED_TASKS_KEY)) ?? [];
      const validExpired = storedExpired
        .filter((task) => typeof task.expiredAt === "string" && typeof task.title === "string")
        .sort((a, b) => Date.parse(b.expiredAt) - Date.parse(a.expiredAt));
      setExpiredTasks(dedupeTasks(validExpired).slice(0, MAX_EXPIRED_STORED));

    } catch (error) {
      console.error("Failed to load persisted data", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    const completedKey = getCompletedKey(dateKey);
    const expiredCountKey = getExpiredCountKey(dateKey);
    const completed =
      safeParseJson<CompletedTask[]>(localStorage.getItem(completedKey)) ?? [];
    setCompletedToday(
      completed.filter((task) => typeof task.completedAt === "string" && task.title)
    );

    const expiredCount = Number(localStorage.getItem(expiredCountKey) ?? "0");
    setExpiredCountToday(Number.isFinite(expiredCount) ? expiredCount : 0);
  }, [dateKey, hydrated]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }
    localStorage.setItem(ACTIVE_TASKS_KEY, JSON.stringify(tasks));
    tasksRef.current = tasks;
  }, [tasks, hydrated]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }
    localStorage.setItem(EXPIRED_TASKS_KEY, JSON.stringify(expiredTasks.slice(0, MAX_EXPIRED_STORED)));
  }, [expiredTasks, hydrated]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }
    const completedKey = getCompletedKey(dateKey);
    localStorage.setItem(completedKey, JSON.stringify(completedToday));
  }, [completedToday, hydrated, dateKey]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }
    const expiredCountKey = getExpiredCountKey(dateKey);
    localStorage.setItem(expiredCountKey, String(expiredCountToday));
  }, [expiredCountToday, hydrated, dateKey]);


  useEffect(() => {
    const tick = () => setCurrentTime(Date.now());
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const updateRelative = () => setRelativeNow(Date.now());
    const id = window.setInterval(updateRelative, 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const checkDate = () => {
      const newKey = getDateKey();
      if (newKey !== dateKey) {
        setDateKey(newKey);
      }
    };
    const id = window.setInterval(checkDate, 60 * 1000);
    return () => window.clearInterval(id);
  }, [dateKey]);

  useEffect(() => {
    if (expiredTasks.length === 0) {
      setShowExpiredRestore(false);
    }
  }, [expiredTasks.length]);

  const generateCompletionMessage = useCallback(
    (task: CompletedTask) => {
      if (typeof window === "undefined") {
        return;
      }

      setCompletionTaskTitle(task.title);

      const body = {
        completed: [
          {
            title: task.title,
            durationMins: task.durationMins,
          },
        ],
        dateISO: new Date().toISOString(),
      };

      void fetch("/api/ai/completion-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error("Request failed");
          }
          const data = (await res.json()) as { summary?: string };
          const text = data.summary?.trim() || `Nice work finishing ${task.title}!`;
          setCompletionMessage(text);
        })
        .catch(() => {
          setCompletionMessage(`Nice work finishing ${task.title}!`);
        })
        .finally(() => {
          if (messageTimerRef.current) {
            window.clearTimeout(messageTimerRef.current);
          }
          messageTimerRef.current = window.setTimeout(() => {
            setCompletionMessage(null);
            setCompletionTaskTitle(null);
          }, 6000);
        });
    },
    []
  );

  const finalizeRemoval = useCallback(
    (taskId: string) => {
      const info = pendingRemovalRef.current.get(taskId);
      if (!info) {
        return;
      }

      setTasks((prev) => prev.filter((task) => task.id !== taskId));

      if (info.reason === "complete") {
        const completedTask: CompletedTask = {
          id: info.task.id,
          title: info.task.title,
          createdAt: info.task.createdAt,
          completedAt: new Date(info.timestamp).toISOString(),
          durationMins: info.durationMins,
          priority: info.task.priority,
          dueAt: info.task.dueAt,
        };

        setCompletedToday((prev) => {
          const exists = prev.some((task) => task.id === completedTask.id);
          if (exists) {
            return prev;
          }
          return [...prev, completedTask];
        });

        generateCompletionMessage(completedTask);
      }

      if (info.reason === "expired") {
        const expiredTask: ExpiredTask = {
          ...info.task,
          expiredAt: new Date(info.timestamp).toISOString(),
        };

        setExpiredTasks((prev) => {
          const withoutTask = prev.filter((item) => item.id !== expiredTask.id);
          const next = [expiredTask, ...withoutTask];
          return next.slice(0, MAX_EXPIRED_STORED);
        });

        setExpiredCountToday((prev) => prev + 1);
      }

      pendingRemovalRef.current.delete(taskId);
      setPendingRemoval(new Map(pendingRemovalRef.current));
      const timeoutId = removalTimersRef.current.get(taskId);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        removalTimersRef.current.delete(taskId);
      }
    },
    []
  );

  const startRemoval = useCallback(
    (task: ActiveTask, reason: RemovalReason) => {
      if (pendingRemovalRef.current.has(task.id)) {
        return;
      }

      const now = Date.now();
      const info: RemovalInfo = {
        task,
        reason,
        timestamp: now,
      };

      if (reason === "complete") {
        const duration = Math.max(
          1,
          Math.round((now - new Date(task.createdAt).getTime()) / 60000)
        );
        info.durationMins = duration;
      }

      pendingRemovalRef.current.set(task.id, info);
      if (reason === "complete") {
        void fireConfetti(task.priority);
      }
      setPendingRemoval(new Map(pendingRemovalRef.current));

      const timeoutId = window.setTimeout(() => {
        finalizeRemoval(task.id);
      }, REMOVAL_DELAY);
      removalTimersRef.current.set(task.id, timeoutId);
    },
    [finalizeRemoval]
  );

  useEffect(() => {
    return () => {
      removalTimersRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      removalTimersRef.current.clear();
      if (messageTimerRef.current) {
        window.clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  const removeTaskImmediately = useCallback(
    (taskId: string) => {
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      pendingRemovalRef.current.delete(taskId);
      setPendingRemoval(new Map(pendingRemovalRef.current));
    },
    []
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      for (const task of tasksRef.current) {
        if (task.expiresAt <= now && !pendingRemovalRef.current.has(task.id)) {
          startRemoval(task, "expired");
        }
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [startRemoval]);

  const handleManualSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const trimmedTitle = manualTitle.trim();
      if (!trimmedTitle) {
        return;
      }

      const customHours = Number(manualHours);
      const hours =
        Number.isFinite(customHours) && customHours > 0 ? customHours : DEFAULT_HOURS;

      addTask({
        title: trimmedTitle,
        priority: manualPriority,
        dueAt: null,
        hours,
      });

      setManualTitle("");
      setManualHours("");
      setManualPriority("medium");
    },
    [manualHours, manualPriority, manualTitle]
  );

  const addTask = useCallback(
    ({
      title,
      priority,
      dueAt,
      hours,
    }: {
      title: string;
      priority: TaskPriority;
      dueAt: string | null;
      hours?: number;
    }) => {
      const now = Date.now();
      const createdAt = new Date(now).toISOString();
      let expiresAt = now + (hours ?? DEFAULT_HOURS) * 60 * 60 * 1000;

      if (dueAt) {
        const dueTimestamp = Date.parse(dueAt);
        if (!Number.isNaN(dueTimestamp) && dueTimestamp > now) {
          expiresAt = dueTimestamp;
        }
      }

      const newTask: ActiveTask = {
        id: generateId(),
        title,
        priority,
        dueAt,
        expiresAt,
        createdAt,
      };

      setTasks((prev) => [...prev, newTask]);
      setAiResult(null);
      setAiInput("");
    },
    []
  );

  const handleAiSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = aiInput.trim();
      if (!trimmed) {
        return;
      }

      const hint = detectTimeHint(trimmed);
      const textForModel = hint?.text ?? trimmed;
      const hintData = hint ? { hour: hint.hour, minute: hint.minute } : undefined;
      const explicitTime =
        Boolean(hint) ||
        /\b\d{1,2}:\d{2}\b/.test(textForModel) ||
        /\b\d{1,2}\s?(?:am|pm)\b/i.test(textForModel);

      setAiLoading(true);
      setAiError(null);
      setAiResult(null);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch("/api/ai/parse-task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: textForModel,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            nowISO: new Date().toISOString(),
            timeHint: hintData,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Request failed");
        }
        window.clearTimeout(timeoutId);
        const parsed = (await response.json()) as ParsedTask;
        if (hint?.dueISO) {
          parsed.due = hint.dueISO;
        } else if (!explicitTime) {
          parsed.due = null;
        }
        setAiResult(parsed);
        setAiPriority(parsed.priority);
      } catch (error) {
        console.error("AI parse failed", error);
        if ((error as Error).name === "AbortError") {
          const fallback: ParsedTask = {
            title: textForModel.slice(0, 80) || "Untitled Task",
            due: hint?.dueISO ?? null,
            priority: "medium",
          };
          setAiResult(fallback);
          setAiPriority("medium");
          setAiError("Connection was slow, applied a quick parse.");
        } else {
          setAiError("Could not parse task. Try again or add manually.");
        }
      } finally {
        window.clearTimeout(timeoutId);
        setAiLoading(false);
      }
    },
    [aiInput]
  );

  const handleConfirmAiTask = useCallback(() => {
    if (!aiResult) {
      return;
    }

    addTask({
      title: aiResult.title,
      priority: aiPriority,
      dueAt: aiResult.due,
    });
  }, [addTask, aiPriority, aiResult]);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => !pendingRemovalRef.current.has(task.id)),
    [tasks, pendingRemoval]
  );

  const sortedTasks = useMemo(
    () =>
      [...visibleTasks].sort((a, b) => {
        const priorityDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        return a.expiresAt - b.expiresAt;
      }),
    [visibleTasks]
  );

  const handleCompleteTask = useCallback(
    (taskId: string) => {
      const task = tasksRef.current.find((item) => item.id === taskId);
      if (!task) {
        return;
      }
      startRemoval(task, "complete");
    },
    [startRemoval]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      const task = tasksRef.current.find((item) => item.id === taskId);
      if (!task) {
        removeTaskImmediately(taskId);
        return;
      }
      startRemoval(task, "delete");
    },
    [removeTaskImmediately, startRemoval]
  );

  const handleRestoreExpiredTask = useCallback(
    (taskId: string) => {
      setExpiredTasks((prev) => {
        const task = prev.find((item) => item.id === taskId);
        if (!task) {
          return prev;
        }
        addTask({
          title: task.title,
          priority: task.priority,
          dueAt: null,
        });
        return prev.filter((item) => item.id !== taskId);
      });
    },
    [addTask]
  );

  const handleClearExpired = useCallback(() => {
    setExpiredTasks([]);
    setShowExpiredRestore(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(EXPIRED_TASKS_KEY);
    }
  }, []);

  const handleDismissMessage = useCallback(() => {
    if (messageTimerRef.current) {
      window.clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }
    setCompletionMessage(null);
    setCompletionTaskTitle(null);
  }, []);

  return (
    <main className="min-h-screen py-14 px-4 sm:px-6 flex items-center justify-center">
      <section className="w-full max-w-3xl rounded-3xl bg-white/70 backdrop-blur-lg shadow-glow border border-slate-200/60 px-6 py-8 sm:px-10 sm:py-12">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1 text-indigo-600 font-medium text-sm mb-6">
            Self-Destructing Workflow
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-midnight-900">
            Self-Destructing Tasks
          </h1>
          <p className="mt-3 text-base sm:text-lg text-midnight-600">
            Capture tasks with custom timers. They evaporate automatically once the countdown ends.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium">
            <Link
              href="/expired"
              className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-midnight-700 shadow-sm ring-1 ring-slate-200 transition hover:text-indigo-600 hover:ring-indigo-200"
            >
              View expired archive
              <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-indigo-500/10 px-2 text-xs font-semibold text-indigo-600">
                {expiredTasks.length}
              </span>
            </Link>
          </div>
        </header>

        {expiredTasks.length > 0 && (
          <div className="mb-8 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 shadow-inner flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-midnight-600">
              🗃 {expiredTasks.length} expired {expiredTasks.length === 1 ? "task" : "tasks"} ready
              for review
            </div>
            <button
              type="button"
              onClick={() => setShowExpiredRestore(true)}
              className="inline-flex items-center justify-center rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              Restore
            </button>
          </div>
        )}

        <div className="grid gap-5">
          <form
            className="grid gap-6 rounded-2xl bg-white/90 p-6 shadow-inner border border-slate-200/70"
            onSubmit={handleManualSubmit}
          >
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-midnight-700" htmlFor="taskTitle">
                Task
              </label>
              <input
                id="taskTitle"
                type="text"
                placeholder="Finish proposal draft, walk the dog, plan the getaway..."
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-midnight-700" htmlFor="timeLimit">
                    Time limit (hours)
                  </label>
                  <span className="text-xs font-medium text-midnight-400">
                    Defaults to 24h if blank
                  </span>
                </div>
                <input
                  id="timeLimit"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  placeholder="24"
                  value={manualHours}
                  onChange={(event) => setManualHours(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-midnight-700" htmlFor="priority">
                  Priority
                </label>
                <select
                  id="priority"
                  value={manualPriority}
                  onChange={(event) => setManualPriority(event.target.value as TaskPriority)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:scale-[1.01] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:scale-95"
            >
              Add Task
            </button>
          </form>

          <form
            className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-5 shadow-sm"
            onSubmit={handleAiSubmit}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-500">
                Natural-language capture
              </h2>
              {aiResult && (
                <button
                  type="button"
                  onClick={() => setAiResult(null)}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Email Anna tomorrow 9am!!"
                value={aiInput}
                onChange={(event) => setAiInput(event.target.value)}
                className="flex-1 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {aiLoading ? "Applying..." : "Apply"}
              </button>
            </div>
            {aiError && <p className="mt-2 text-sm text-rose-500">{aiError}</p>}
            {aiResult && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-midnight-700 shadow-sm">
                  {aiResult.title}
                </span>
                {aiResult.due && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-indigo-600 shadow-sm">
                    Due {formatDueLabel(aiResult.due)}
                  </span>
                )}
                <div className="relative">
                  <button
                    type="button"
                    className={`priority-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold shadow-sm ${
                      priorityBadge[aiPriority].className
                    }`}
                    aria-haspopup="listbox"
                    aria-label="Adjust AI priority"
                  >
                    {priorityBadge[aiPriority].icon}
                    {priorityBadge[aiPriority].label}
                  </button>
                  <select
                    value={aiPriority}
                    onChange={(event) => setAiPriority(event.target.value as TaskPriority)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Priority options"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmAiTask}
                  className="inline-flex items-center justify-center rounded-full bg-midnight-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-midnight-800"
                >
                  Add
                </button>
              </div>
            )}
          </form>
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-midnight-900">Active Tasks</h2>
            <span className="text-sm font-medium text-midnight-400">
              {sortedTasks.length} {sortedTasks.length === 1 ? "task" : "tasks"}
            </span>
          </div>

          {sortedTasks.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 px-6 py-10 text-center text-midnight-600">
              No active tasks yet. Add something you’d rather not forget.
            </p>
          ) : (
            <ul className="grid gap-4">
              <AnimatePresence>
                {sortedTasks.map((task) => {
                  const timeLeft = task.expiresAt - currentTime;
                  const isUrgent = timeLeft <= URGENT_THRESHOLD_MS;
                  const dueLabel = formatDueLabel(task.dueAt);
                  const priorityMeta = priorityBadge[task.priority];

                  return (
                    <motion.li
                      key={task.id}
                      layout
                      initial={{ opacity: 1, scale: 1 }}
                      exit={{
                        opacity: 0,
                        scale: 0.85,
                        rotate: -4,
                        transition: { duration: 0.3 },
                      }}
                      className={`flex flex-col gap-4 rounded-2xl border px-5 py-4 shadow-sm transition duration-200 sm:flex-row sm:items-center sm:justify-between ${
                        isUrgent
                          ? "border-rose-200/70 bg-rose-50/80"
                          : "border-slate-200 bg-white/80 hover:border-indigo-200"
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleCompleteTask(task.id)}
                            className="h-6 w-6 rounded-full border-2 border-slate-300 bg-white transition hover:border-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                            aria-label={`Mark ${task.title} complete`}
                            role="checkbox"
                            aria-checked="false"
                          />
                          <div>
                            <p className="text-base sm:text-lg font-semibold text-midnight-900">
                              {task.title}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-midnight-500">
                              <span>added {timeAgo(task.createdAt, relativeNow)}</span>
                              {dueLabel && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-600">
                                  Due {dueLabel}
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${priorityMeta.className}`}
                              >
                                {priorityMeta.icon}
                                {priorityMeta.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p
                          className={`text-sm font-medium ${
                            isUrgent ? "text-rose-600" : "text-midnight-600"
                          }`}
                        >
                          {formatTimeRemaining(timeLeft)} remaining
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleCompleteTask(task.id)}
                          className="inline-flex items-center justify-center rounded-full border border-transparent bg-midnight-900/90 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-midnight-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-midnight-900 active:scale-95"
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-midnight-600 shadow-sm transition hover:border-rose-200 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 active:scale-95"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </section>
      </section>

      {showExpiredRestore && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">
                  Expired archive
                </p>
                <h3 className="text-lg font-semibold text-midnight-900">Restore a task</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearExpired}
                  className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:border-rose-300 hover:text-rose-700"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setShowExpiredRestore(false)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-midnight-500 transition hover:border-midnight-200 hover:text-midnight-800"
                >
                  Close
                </button>
              </div>
            </div>
            {expiredTasks.length === 0 ? (
              <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-midnight-500">
                No expired tasks available.
              </p>
            ) : (
              <ul className="mt-4 flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
                {expiredTasks.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-2xl border border-slate-200 px-4 py-3 shadow-sm"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-base font-semibold text-midnight-900">{task.title}</p>
                      <p className="text-xs font-medium text-midnight-500">
                        expired {timeAgo(task.expiredAt)}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${priorityBadge[task.priority].className}`}
                      >
                        {priorityBadge[task.priority].icon}
                        {priorityBadge[task.priority].label}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRestoreExpiredTask(task.id)}
                        className="inline-flex items-center justify-center rounded-full bg-midnight-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-midnight-800"
                      >
                        Restore
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {completionMessage && (
        <div className="fixed bottom-6 left-1/2 z-40 w-[min(90%,22rem)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
            Task cleared
          </p>
          <p className="mt-1 text-sm font-medium text-midnight-800">{completionMessage}</p>
          {completionTaskTitle && (
            <p className="mt-1 text-xs text-midnight-500">Task: {completionTaskTitle}</p>
          )}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDismissMessage}
              className="rounded-full bg-midnight-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-midnight-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
