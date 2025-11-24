"use client";

import { useTaskPanel } from "@/components/layout/TaskPanelProvider";

interface AddTaskButtonProps {
  size?: "sm" | "md";
}

export function AddTaskButton({ size = "md" }: AddTaskButtonProps) {
  const { openCreate } = useTaskPanel();
  const padding = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <button
      type="button"
      onClick={openCreate}
      className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 font-semibold text-slate-950 shadow-[0_12px_35px_rgba(15,23,42,0.6)] transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${padding}`}
    >
      <PlusMark />
      Add task
    </button>
  );
}

function PlusMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
