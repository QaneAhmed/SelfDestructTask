"use client";

import { useState } from "react";
import type { StatsSummary } from "@/lib/statsSummary";

interface DesktopStatsProps {
  summary: StatsSummary;
}

export function DesktopStats({ summary }: DesktopStatsProps) {
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const total = summary.totalCompleted + summary.totalExpired;
  const winRate = total === 0 ? 0 : Math.round((summary.totalCompleted / total) * 100);
  const todayTotal = summary.completedToday + summary.expiredToday;
  const todayRate = todayTotal === 0 ? 0 : Math.round((summary.completedToday / todayTotal) * 100);
  const dominantIndex = summary.heatmapCompleted.reduce(
    (best, value, index) => (value > best.value ? { value, index } : best),
    { value: -Infinity, index: 0 },
  ).index;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const activeDayIndex = selectedDay ?? dominantIndex;
  const activeCompleted = summary.heatmapCompleted[activeDayIndex] ?? 0;
  const activeExpired = summary.heatmapExpired[activeDayIndex] ?? 0;

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
        className={`flex flex-col items-center gap-2 text-xs transition ${
          index === activeDayIndex ? "text-white" : "text-white/70"
        }`}
      >
        <span className="text-[0.6rem] font-semibold uppercase tracking-wide">{dayLabels[index] ?? `Day ${index + 1}`}</span>
        <span
          className={`h-8 w-full rounded-xl border ${index === activeDayIndex ? "border-white/80 shadow-[0_0_15px_rgba(255,255,255,0.35)]" : "border-white/10"}`}
          style={style}
        />
      </button>
    );
  });

  return (
    <div className="hidden space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_60px_rgba(2,6,23,0.55)] backdrop-blur-2xl xl:p-7 lg:block">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-gradient-to-br from-indigo-600/70 via-violet-500/60 to-cyan-400/60 p-6 shadow-[0_20px_45px_rgba(40,48,83,0.6)]">
          <p className="text-xs uppercase tracking-[0.45em] text-white/80">Win rate</p>
          <div className="flex items-end gap-4">
            <p className="text-5xl font-semibold drop-shadow-lg">{winRate}%</p>
            <span className="text-sm text-white/80">All time</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${winRate}%` }}
            />
          </div>
          <div className="text-sm text-white/85">
            Today’s streak <span className="font-semibold">{todayRate}%</span> done
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-4 rounded-3xl border border-white/10 bg-[#0b1124]/80 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Completed" value={summary.completedToday} caption="Today" />
            <Metric label="Self-destructed" value={summary.expiredToday} caption="Today" />
            <Metric label="Completed" value={summary.totalCompleted} caption="All time" />
            <Metric label="Self-destructed" value={summary.totalExpired} caption="All time" />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#0c1224]/70 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Last 7 days</p>
            <p className="text-sm text-white/70">
              {selectedDay !== null ? dayLabels[selectedDay] : `Peak: ${dayLabels[dominantIndex]}`}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/60">
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /> Wins
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Self-destructed
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-3">{heatSquares}</div>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5/10 px-4 py-3 text-sm text-white/80">
          <span>
            {dayLabels[activeDayIndex]} — {activeCompleted} wins / {activeExpired} self-destructed
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
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.3em] text-white/50">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      {caption && <p className="text-xs text-white/60">{caption}</p>}
    </div>
  );
}
