"use client";

import { useState } from "react";
import type { StatsSummary } from "@/lib/statsSummary";

interface StatsSheetProps {
  summary: StatsSummary;
}

export function StatsSheet({ summary }: StatsSheetProps) {
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const total = summary.totalCompleted + summary.totalExpired;
  const winRate = total === 0 ? 0 : Math.round((summary.totalCompleted / total) * 100);
  const defaultDayIndex = summary.heatmapCompleted.reduce(
    (best, value, index) => (value > best.value ? { value, index } : best),
    { value: -Infinity, index: 0 },
  ).index;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const activeDayIndex = selectedDay ?? defaultDayIndex;
  const heatSquares = summary.heatmapCompleted.map((completed, index) => {
    const expired = summary.heatmapExpired[index] ?? 0;
    const hasWins = completed > 0;
    const hasLosses = expired > 0;
    const style = (() => {
      if (hasWins && hasLosses) {
        const total = completed + expired;
        const winPercent = Math.max(10, Math.min(90, Math.round((completed / total) * 100)));
        return {
          backgroundImage: `linear-gradient(135deg, rgba(16,185,129,${clampIntensity(completed)}) 0%, rgba(16,185,129,${clampIntensity(
            completed,
          )}) ${winPercent}%, rgba(239,68,68,${clampIntensity(expired)}) ${winPercent}%, rgba(239,68,68,${clampIntensity(
            expired,
          )}) 100%)`,
        };
      }
      if (hasWins) {
        return { backgroundColor: `rgba(16,185,129,${clampIntensity(completed)})` };
      }
      if (hasLosses) {
        return { backgroundColor: `rgba(239,68,68,${clampIntensity(expired)})` };
      }
      return { backgroundColor: "rgba(148,163,184,0.2)" };
    })();

    return (
      <button
        key={index}
        type="button"
        onClick={() => setSelectedDay(index)}
        className={`flex flex-col items-center gap-1 text-[0.6rem] transition ${
          index === activeDayIndex ? "text-white" : "text-white/60"
        }`}
      >
        <span className="font-semibold uppercase tracking-wide">{dayLabels[index]}</span>
        <span
          className={`h-7 w-full rounded-xl border ${
            index === activeDayIndex ? "border-white/80 shadow-[0_0_12px_rgba(255,255,255,0.3)]" : "border-white/10"
          }`}
          style={style}
        />
      </button>
    );
  });

  return (
    <div className="space-y-5 text-white lg:hidden">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600/70 via-violet-500/70 to-cyan-400/70 p-5 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-white/80">Win rate</p>
        <p className="mt-2 text-4xl font-semibold">{winRate}%</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/40">
          <div className="h-full rounded-full bg-white" style={{ width: `${winRate}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Metric label="Completed" caption="Today" value={summary.completedToday} />
        <Metric label="Self-destructed" caption="Today" value={summary.expiredToday} />
        <Metric label="Completed" caption="All time" value={summary.totalCompleted} />
        <Metric label="Self-destructed" caption="All time" value={summary.totalExpired} />
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#0c1224]/70 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Last 7 days</p>
        <div className="mt-3 grid grid-cols-7 gap-2">{heatSquares}</div>
        <div className="mt-3 rounded-2xl border border-white/10 bg-[#090f22]/80 px-3 py-2 text-xs text-white/70">
          <p>
            {dayLabels[activeDayIndex]} — {summary.heatmapCompleted[activeDayIndex] ?? 0} wins /{" "}
            {summary.heatmapExpired[activeDayIndex] ?? 0} self-destructed
          </p>
        </div>
        <div className="mt-3 flex items-center justify-between text-[0.65rem] text-white/60">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-300" /> Wins
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-400" /> Self-destructed
          </span>
        </div>
      </div>
    </div>
  );
}

function clampIntensity(value: number) {
  if (value <= 0) return 0.08;
  return Math.min(0.9, 0.25 + value * 0.15);
}

function Metric({ label, value, caption }: { label: string; value: number; caption?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {caption && <p className="text-[0.6rem] text-white/50">{caption}</p>}
    </div>
  );
}
