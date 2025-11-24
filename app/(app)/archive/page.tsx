"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ExpiredTimeline } from "@/components/expired-timeline";
import { MobileNav } from "@/components/mobile-nav";
import type { CompletedTaskEntry, SelfDestructedTaskEntry, TimelineDay } from "@/types/ux";

const convexApi = api as any;

export default function ArchivePage() {
  return (
    <>
      <SignedIn>
        <ArchiveContent />
      </SignedIn>
      <SignedOut>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-white">
          <p className="text-xl font-semibold">Sign in to view your archive.</p>
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

function ArchiveContent() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Loading your archive…
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Connecting to your archive…
      </div>
    );
  }

  return <ArchiveData />;
}

function ArchiveData() {
  const [tab, setTab] = useState<"all" | "completed" | "expired">("all");
  const completedRaw = useQuery(convexApi.archive.listCompleted) ?? [];
  const expiredRaw = useQuery(convexApi.archive.listExpired) ?? [];
  const clearCompleted = useMutation(convexApi.archive.clearCompleted);
  const clearExpired = useMutation(convexApi.archive.clearExpired);

  const completedEntries = useMemo<CompletedTaskEntry[]>(
    () =>
      completedRaw.map((entry: any) => ({
        id: entry._id,
        title: entry.title,
        priority: entry.priority,
        completedAt: entry.completedAt,
        createdAt: entry.createdAt,
        durationMs: entry.durationMs,
        source: entry.source,
        reasoning: entry.reasoning,
      })),
    [completedRaw],
  );

  const expiredEntries = useMemo<SelfDestructedTaskEntry[]>(
    () =>
      expiredRaw.map((entry: any) => ({
        id: entry._id,
        title: entry.title,
        priority: entry.priority,
        expiredAt: entry.expiredAt,
        createdAt: entry.createdAt,
        originDurationMs: entry.originDurationMs,
        source: entry.source,
        reasoning: entry.reasoning,
        status: "expired",
      })),
    [expiredRaw],
  );

  const completedConverted = useMemo(() => convertCompletedToExpired(completedEntries), [completedEntries]);
  const combinedEntries = useMemo(() => [...completedConverted, ...expiredEntries], [completedConverted, expiredEntries]);

  const filteredEntries = useMemo(() => {
    if (tab === "completed") return completedConverted;
    if (tab === "expired") return expiredEntries;
    return combinedEntries;
  }, [tab, completedConverted, expiredEntries, combinedEntries]);

  const timeline = useMemo(() => buildTimeline(filteredEntries), [filteredEntries]);
  const timelineVariant = tab === "all" ? "all" : tab === "completed" ? "completed" : "expired";

  return (
    <>
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-32 pt-10 text-white lg:px-6 lg:pb-16">
        <header className="rounded-3xl border border-white/10 bg-[#0B1020] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)]">
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 rounded-[2rem] border border-white/10 bg-white/5 px-3 py-3">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "completed", label: "Completed" },
                  { key: "expired", label: "Self-destructed" },
                ] as const
              ).map((item) => {
                const isActive = tab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setTab(item.key)}
                    className={`rounded-full px-5 py-2 text-center text-xs font-semibold uppercase tracking-[0.15em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
                      isActive
                        ? "bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-900 shadow-[0_10px_25px_rgba(56,189,248,0.35)]"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {(tab === "completed" || tab === "all") && (
                <button
                  type="button"
                  className="rounded-full border border-cyan-300/60 px-4 py-1.5 text-xs font-semibold text-cyan-200 shadow-[0_8px_20px_rgba(56,189,248,0.2)] transition hover:scale-[1.02] hover:border-cyan-200"
                  onClick={() => {
                    if (confirm("Clear all completed tasks from the archive? This cannot be undone.")) {
                      clearCompleted({});
                    }
                  }}
                >
                  Clear completed
                </button>
              )}
              {(tab === "expired" || tab === "all") && (
                <button
                  type="button"
                  className="rounded-full border border-rose-300/60 px-4 py-1.5 text-xs font-semibold text-rose-200 shadow-[0_8px_20px_rgba(244,63,94,0.2)] transition hover:scale-[1.02] hover:border-rose-200"
                  onClick={() => {
                    if (confirm("Clear all self-destructed tasks from the archive? This cannot be undone.")) {
                      clearExpired({});
                    }
                  }}
                >
                  Clear self-destructed
                </button>
              )}
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-[#050814]/80 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.65)]">
          <ExpiredTimeline days={timeline} variant={timelineVariant} />
        </section>
      </main>
      <MobileNav active="archive" />
    </>
  );
}

function buildTimeline(entries: SelfDestructedTaskEntry[]): TimelineDay[] {
  const grouped = new Map<string, SelfDestructedTaskEntry[]>();
  entries.forEach((entry) => {
    const dayKey = entry.expiredAt.split("T")[0] ?? entry.expiredAt;
    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, []);
    }
    grouped.get(dayKey)!.push(entry);
  });
  return Array.from(grouped.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, items]) => ({
      dateLabel: new Date(key).toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" }),
      entries: items,
    }));
}

function convertCompletedToExpired(entries: CompletedTaskEntry[]): SelfDestructedTaskEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    priority: entry.priority,
    expiredAt: entry.completedAt,
    createdAt: entry.createdAt,
    dueAt: null,
    originDurationMs: entry.durationMs,
    source: entry.source,
    reasoning: entry.reasoning,
    status: "completed",
  }));
}
