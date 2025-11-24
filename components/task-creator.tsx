"use client";

import { useEffect, useRef, useState } from "react";
import type { NewTaskPayload, TaskPriority } from "@/types/ux";
const priorities = ["Low", "Medium", "High"];
const STORAGE_KEY = "sd:lastCreator";

type Variant = "full" | "compact";

interface TaskCreatorProps {
  onCreate: (payload: NewTaskPayload) => void;
  variant?: Variant;
  focusSignal?: number;
  activeCount?: number;
  expiredToday?: number;
}

export function TaskCreator({ onCreate, variant = "full", focusSignal }: TaskCreatorProps) {
  const [title, setTitle] = useState("");
  const [dateInput, setDateInput] = useState(() => defaultDate());
  const [timeInput, setTimeInput] = useState(() => defaultTime());
  const [priority, setPriority] = useState(priorities[1]!);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { date: string; time: string; priority: string };
      if (parsed.date) setDateInput(parsed.date);
      if (parsed.time) setTimeInput(parsed.time);
      if (priorities.includes(parsed.priority)) setPriority(parsed.priority);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: dateInput, time: timeInput, priority }));
  }, [dateInput, timeInput, priority]);

  useEffect(() => {
    if (focusSignal && titleRef.current) {
      titleRef.current.focus();
    }
  }, [focusSignal]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const durationMinutes = computeDurationMinutes(buildDateTime(dateInput, timeInput));
    onCreate({
      title: trimmed,
      durationMinutes,
      priority: normalizePriority(priority),
      source: "manual",
    });
    setTitle("");
  };

  const containerClass =
    variant === "full"
      ? "space-y-4 rounded-3xl border border-white/10 bg-[#0B1020] p-5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.65)] sm:p-6"
      : "space-y-3 rounded-2xl border border-white/10 bg-[#101528] p-4 text-white shadow";

  return (
    <div className={containerClass}>
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">The good old way</p>
        <p className="text-sm text-slate-400">Add a countdown manually if typing a sentence feels like too much.</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3">
          <input
            ref={titleRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Write task title…"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
          />
        </div>
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Pick date & time</p>
          <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <label className="text-xs uppercase tracking-[0.2em] text-white/50" htmlFor="manual-date">
                Date
              </label>
              <input
                id="manual-date"
                type="date"
                min={defaultDate()}
                value={dateInput}
                onChange={(event) => setDateInput(event.target.value)}
                className="rounded-xl border border-white/10 bg-[#050a16] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              />
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <label className="text-xs uppercase tracking-[0.2em] text-white/50" htmlFor="manual-time">
                Time
              </label>
              <input
                id="manual-time"
                type="time"
                value={timeInput}
                onChange={(event) => setTimeInput(event.target.value)}
                className="rounded-xl border border-white/10 bg-[#050a16] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              />
            </div>
          </div>
        </div>
        <PriorityDropdown value={priority} onChange={setPriority} options={priorities} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="submit"
            className="rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_12px_35px_rgba(15,23,42,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          >
            Save task
          </button>
        </div>
      </form>
    </div>
  );
}

function normalizePriority(label: string): TaskPriority {
  return label.trim().toLowerCase() as TaskPriority;
}

function PriorityDropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  return (
    <div className="space-y-1" ref={containerRef}>
      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Priority</p>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        >
          <span>{value}</span>
          <svg
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {open ? (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-white/10 bg-[#050a16] p-1 shadow-[0_18px_45px_rgba(0,0,0,0.65)]">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={`w-full rounded-xl px-4 py-2 text-left text-sm capitalize transition hover:bg-white/10 ${
                  option === value ? "bg-white/10 text-white" : "text-slate-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function defaultDate() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function defaultTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  return date.toISOString().slice(11, 16);
}

function buildDateTime(date: string, time: string) {
  if (!date || !time) {
    return `${defaultDate()}T${defaultTime()}`;
  }
  return `${date}T${time}`;
}

function computeDurationMinutes(dueInput: string) {
  if (!dueInput) return 60;
  const selected = new Date(dueInput).getTime();
  if (Number.isNaN(selected)) return 60;
  const diffMs = Math.max(selected - Date.now(), 5 * 60 * 1000);
  return Math.round(diffMs / 60000);
}

function applyPreset(
  target: Date,
  setDate: (value: string) => void,
  setTime: (value: string) => void,
) {
  target.setSeconds(0, 0);
  setDate(target.toISOString().slice(0, 10));
  setTime(target.toISOString().slice(11, 16));
}
