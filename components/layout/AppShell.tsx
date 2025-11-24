"use client";

import { PropsWithChildren } from "react";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050814] text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-indigo-500/20 blur-[140px]" />
        <div className="absolute right-0 top-32 h-96 w-96 rounded-full bg-cyan-400/15 blur-[150px]" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[150px]" />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
    </div>
  );
}
