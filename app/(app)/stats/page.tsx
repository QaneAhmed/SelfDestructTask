"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { DesktopStats } from "@/components/desktop-stats";
import { StatsSheet } from "@/components/stats-sheet";
import { MobileNav } from "@/components/mobile-nav";
import { api } from "@/convex/_generated/api";
import { emptySummary, type StatsSummary } from "@/lib/statsSummary";

const convexApi = api as any;

export default function StatsPage() {
  return (
    <>
      <SignedIn>
        <StatsContent />
      </SignedIn>
      <SignedOut>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-white">
          <p className="text-xl font-semibold">Sign in to view your stats.</p>
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

function StatsContent() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Loading your stats…
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Connecting to your stats…
      </div>
    );
  }

  return <StatsData />;
}

function StatsData() {
  const summary = (useQuery(convexApi.stats.summary) as StatsSummary | undefined) ?? emptySummary;
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-20%] top-[-10%] h-[22rem] w-[22rem] rounded-full bg-cyan-500/20 blur-[130px]" />
        <div className="absolute right-[-15%] top-[20%] h-[20rem] w-[20rem] rounded-full bg-violet-500/20 blur-[140px]" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-28 pt-6 text-white lg:gap-8 lg:px-6 lg:pb-20 lg:pt-12">
        <DesktopStats summary={summary} />
        <StatsSheet summary={summary} />
      </main>

      <MobileNav active="stats" />
    </>
  );
}
