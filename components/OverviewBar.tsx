"use client";

import type { StatsSummary } from "@/lib/statsSummary";
import { AddTaskButton } from "@/components/AddTaskButton";

interface OverviewBarProps {
  summary: StatsSummary;
  nextExpiryMs: number | null;
  activeCount: number;
}

export function OverviewBar({ summary, nextExpiryMs, activeCount }: OverviewBarProps) {
  const nextExpiryText =
    typeof nextExpiryMs === "number"
      ? formatDuration(Math.max(0, Math.round(nextExpiryMs / 60000)))
      : "No tasks scheduled";

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.65)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-lg font-semibold text-white drop-shadow">{activeCount} countdowns running • Next loss: {nextExpiryText}</p>
        <AddTaskButton />
      </div>
    </div>
  );
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
