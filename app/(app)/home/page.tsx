"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useTaskPanel } from "@/components/layout/TaskPanelProvider";
import { OverviewBar } from "@/components/OverviewBar";
import { FilterBar } from "@/components/FilterBar";
import { TaskList } from "@/components/TaskList";
import { TaskCreationPanel } from "@/components/TaskCreationPanel";
import { MobileNav } from "@/components/mobile-nav";
import { Toast } from "@/components/feedback/Toast";
import { useConfetti } from "@/components/feedback/ConfettiManager";
import type { NewTaskPayload, Task, TaskPriority } from "@/types/ux";
import { api } from "@/convex/_generated/api";
import { getCompletionMessage } from "@/lib/aiClient";
import { emptySummary, type StatsSummary } from "@/lib/statsSummary";

const convexApi = api as any;

const CONFETTI_MAP = { low: "low", medium: "medium", high: "high" } as const;

export default function HomePage() {
  return (
    <>
      <SignedIn>
        <AuthenticatedHome />
      </SignedIn>
      <SignedOut>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-white">
          <p className="text-xl font-semibold">Sign in to manage your self-destructing tasks.</p>
          <Link
            href="/login"
            className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-3 font-semibold text-slate-900 shadow-[0_10px_30px_rgba(56,189,248,0.3)] transition hover:opacity-95"
          >
            Open login
          </Link>
        </div>
      </SignedOut>
    </>
  );
}

function AuthenticatedHome() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Loading your workspace…
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Connecting to your tasks…
      </div>
    );
  }

  return <HomeData />;
}

function HomeData() {
  const { openEdit } = useTaskPanel();
  const triggerConfetti = useConfetti();

  const tasks = useQuery(convexApi.tasks.list) ?? [];
  const statsSummary = useQuery(convexApi.stats.summary) as StatsSummary | undefined;
  const expireDue = useMutation(convexApi.tasks.expireDue);
  const createTask = useMutation(convexApi.tasks.create);
  const updateTask = useMutation(convexApi.tasks.update);
  const deleteTask = useMutation(convexApi.tasks.remove);
  const completeTask = useMutation(convexApi.tasks.complete);

  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    expireDue().catch(() => {});
    const interval = window.setInterval(() => {
      expireDue().catch(() => {});
    }, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [expireDue]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  };

  const addTask = async (payload: NewTaskPayload) => {
    await createTask({
      title: payload.title,
      durationMinutes: payload.durationMinutes,
      priority: payload.priority,
      source: payload.source,
      reasoning: payload.reasoning,
    });
  };

  const handleComplete = async (taskId: string, title: string, priority: TaskPriority) => {
    await completeTask({ taskId });
    triggerConfetti(CONFETTI_MAP[priority]);
    try {
      const message = await getCompletionMessage(title, priority);
      showToast(message);
    } catch {
      showToast("Nice work clearing that task.");
    }
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask({ taskId });
  };

  const handleUpdateTask = async (taskId: string, updates: { title: string; priority: TaskPriority }) => {
    await updateTask({ taskId, title: updates.title, priority: updates.priority });
  };

  const summary = statsSummary ?? emptySummary;

  const displayTasks: Task[] = useMemo(() => {
    return tasks.map((task: any) => {
      const remainingMs = Math.max(0, task.expiresAt - now);
      const status = remainingMs <= 5 * 60 * 1000 ? "expiring" : "active";
      return {
        id: task._id,
        title: task.title,
        priority: task.priority,
        remainingMs,
        totalMs: task.durationMs,
        status,
        createdAt: task.createdAt,
        source: task.source,
        reasoning: task.reasoning ?? null,
      };
    });
  }, [tasks, now]);

  const nextExpiryMs = displayTasks.length > 0 ? Math.min(...displayTasks.map((task) => task.remainingMs)) : null;

  useEffect(() => {
    if (displayTasks.length === 0) return;
    const hasExpired = displayTasks.some((task) => task.remainingMs <= 0);
    if (!hasExpired) return;
    expireDue().catch(() => {});
  }, [displayTasks, expireDue]);

  return (
    <>
      <div className="mx-auto w-full max-w-5xl space-y-6 pb-32 pt-4 lg:pb-16">
        <OverviewBar summary={summary} nextExpiryMs={nextExpiryMs} activeCount={displayTasks.length} />
        <FilterBar />
        <TaskList
          tasks={displayTasks}
          onComplete={(task) => handleComplete(task.id, task.title, task.priority)}
          onDelete={handleDelete}
          onSelectTask={openEdit}
        />
      </div>
      <TaskCreationPanel onCreate={addTask} onUpdateTask={handleUpdateTask} />
      <MobileNav active="home" />
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
