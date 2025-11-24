"use client";

import { motion } from "framer-motion";
import type { TimelineDay } from "@/types/ux";

interface ExpiredTimelineProps {
  days: TimelineDay[];
  variant?: "expired" | "completed" | "all";
  obscured?: boolean;
}

export function ExpiredTimeline({ days, variant = "expired", obscured = false }: ExpiredTimelineProps) {
  if (days.length === 0) {
    return <p className="text-sm text-slate-400">Nothing archived yet.</p>;
  }
  const isCompletedView = variant === "completed";
  const isAllView = variant === "all";
  return (
    <div className="relative mx-auto w-full text-slate-50">
      <div className="absolute left-5 top-0 bottom-0 w-px bg-white/10" />
      <div className="space-y-10">
        {days.map((day) => (
          <section key={day.dateLabel} className="relative pl-12">
            <div className="absolute left-5 top-1 h-3 w-3 -translate-x-1/2 rounded-full bg-white/40" />
            <h2 className="text-xs uppercase tracking-[0.3em] text-slate-400">{day.dateLabel}</h2>
            <div className="mt-4 space-y-4">
              {day.entries.map((entry) => {
                const entryStatus = entry.status ?? (isCompletedView ? "completed" : "expired");
                const labelPrefix =
                  isAllView ? (entryStatus === "completed" ? "Completed" : "Self-destructed") : isCompletedView ? "Completed" : "Expired";
                const shouldBlur = entryStatus === "expired";
                const showActions = !obscured && entryStatus === "expired";
                return (
                <motion.article
                  key={entry.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-3xl border border-white/10 bg-white/5 p-4 text-slate-50 shadow-[0_12px_35px_rgba(0,0,0,0.45)] ${
                    shouldBlur ? "blur-[3px] select-none opacity-75" : ""
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold">{entry.title}</h3>
                      <p className="text-sm text-slate-400">
                        {labelPrefix} at {new Date(entry.expiredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                      </p>
                      {entry.reasoning && <p className="text-xs text-slate-400">{entry.reasoning}</p>}
                    </div>
                    <span className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-200">
                      {entry.priority}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-200">
                    <span className="rounded-full border border-white/15 px-3 py-1">
                      Original timer: {formatDuration(entry.originDurationMs)}
                    </span>
                    {entry.source && <span className="rounded-full border border-white/15 px-3 py-1">Source: {entry.source}</span>}
                  </div>
                  {showActions && (
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-200">
                      <button className="rounded-2xl border border-white/20 px-3 py-1" type="button">
                        Restore
                      </button>
                      <button className="rounded-2xl border border-white/20 px-3 py-1" type="button">
                        Delete
                      </button>
                    </div>
                  )}
                </motion.article>
              );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function formatDuration(ms?: number) {
  if (!ms) return "unknown";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
