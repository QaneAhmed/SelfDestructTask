"use client";

import { motion } from "framer-motion";
import type { Task } from "@/types/ux";
import { SwipeCardWrapper } from "@/components/swipe-card-wrapper";

interface TaskCardProps {
  task: Task;
  onComplete?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onSelect?: () => void;
}

export function TaskCard({ task, onComplete, onDelete, onSelect }: TaskCardProps) {
  const progress = Math.min(1, Math.max(0, 1 - task.remainingMs / (task.totalMs || 1)));
  const urgent = task.remainingMs <= 15 * 60 * 1000;
  const warning = task.remainingMs <= 60 * 60 * 1000;
  const countdownTone = urgent ? "text-rose-300" : warning ? "text-amber-200" : "text-emerald-200";
  const progressGradient = urgent
    ? "from-rose-400 via-orange-400 to-yellow-300"
    : warning
      ? "from-amber-300 via-yellow-200 to-sky-200"
      : "from-emerald-300 via-sky-300 to-violet-300";
  const sourceLabel = task.source === "ai" ? "AI" : "Manual";
  const scheduledAt = new Date(Date.now() + task.remainingMs);

  const smokeVariants = {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 0, scale: 0.5 },
    exit: { opacity: 0.8, scale: 1.6, y: -10, transition: { duration: 0.4 } },
  };

  const content = (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-slate-50 shadow-[0_12px_35px_rgba(0,0,0,0.55)] transition ${
        urgent ? "ring-2 ring-rose-500/40 alarm-shake" : ""
      }`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onSelect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <motion.span variants={smokeVariants} className="smoke-cloud smoke-cloud-left" />
      <motion.span variants={smokeVariants} className="smoke-cloud smoke-cloud-right" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-slate-400">
            <PriorityPill priority={task.priority} />
            <span>{sourceLabel}</span>
            {urgent && <span className="text-rose-300">expiring</span>}
          </div>
          <h3 className="text-lg font-semibold">{task.title}</h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          <motion.span
            className={`font-mono text-base ${countdownTone}`}
            animate={urgent ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={urgent ? { duration: 1.5, repeat: Infinity } : undefined}
          >
            {formatCountdown(task.remainingMs)}
          </motion.span>
          <p className="text-xs text-slate-400">Scheduled {formatDueTime(scheduledAt)}</p>
          <div className="flex gap-3 text-xs text-slate-300">
            <button
              className="rounded-full border border-white/10 px-3 py-1 text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onComplete?.(task);
              }}
            >
              Complete
            </button>
            <button
              className="rounded-full border border-white/10 px-3 py-1 text-slate-400 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(task.id);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-1.5 rounded-full bg-white/10">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${progressGradient}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="sm:block">
      <div className="sm:hidden">
        <SwipeCardWrapper onComplete={() => onComplete?.(task)} onDelete={() => onDelete?.(task.id)}>
          {content}
        </SwipeCardWrapper>
      </div>
      <div className="hidden sm:block">{content}</div>
    </div>
  );
}

function PriorityPill({ priority }: { priority: Task["priority"] }) {
  const styles =
    priority === "high"
      ? "border-rose-400/70 text-rose-200"
      : priority === "medium"
        ? "border-cyan-400/70 text-cyan-200"
        : "border-emerald-400/70 text-emerald-200";
  return <span className={`rounded-full border px-3 py-0.5 text-[10px] uppercase tracking-[0.3em] ${styles}`}>{priority}</span>;
}

function formatCountdown(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const hh = hours.toString().padStart(2, "0");
  const mm = minutes.toString().padStart(2, "0");
  const ss = secs.toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatDueTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}
