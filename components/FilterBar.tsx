"use client";

import { useFilter } from "@/components/layout/FilterProvider";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
] as const;

export function FilterBar() {
  const { activeFilter, setFilter } = useFilter();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs text-slate-400">
      {FILTERS.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => setFilter(filter.key)}
          className={`rounded-full px-3 py-1 capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
            activeFilter === filter.key ? "bg-gradient-to-r from-indigo-500 to-cyan-400 text-slate-950" : "text-slate-300"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
