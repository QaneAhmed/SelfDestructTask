"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { NewTaskPayload, TaskPriority } from "@/types/ux";
import { parseTaskText } from "@/lib/aiClient";

interface AIPromptProps {
  onCreate: (payload: NewTaskPayload) => void;
}

type PreviewState = NewTaskPayload & {
  reasoning?: string | null;
  dueISO?: string | null;
  usedFallback?: boolean;
};

export function AIPrompt({ onCreate }: AIPromptProps) {
  const [value, setValue] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeholder = useMemo(
    () =>
      "Write anything, I’ll turn it into a countdown task.\nExamples:\n• “Mail Oskar in 30 min”\n• “Walk the dog at 13”\n• “Finish essay before Friday 18:00”\nI’ll guess time, deadline and priority for you.",
    [],
  );

  const handleParse = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      triggerShake();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await parseTaskText(trimmed);
      const fallbackReasoning = `Timer set for ${formatDuration(result.durationMinutes)} based on your input.`;
      const dueISO = result.dueISO ?? deriveDueFromDuration(result.durationMinutes);
      setPreview({
        title: result.title,
        priority: result.priority,
        durationMinutes: result.durationMinutes,
        reasoning: result.reasoning ?? fallbackReasoning,
        source: "ai",
        dueISO,
        usedFallback: result.usedFallback,
      });
    } catch (err) {
      setError((err as Error).message || "Could not parse");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!preview) return;
    onCreate(preview);
    setPreview(null);
    setValue("");
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.key === "Enter" && !event.shiftKey) || (event.key === "Enter" && (event.metaKey || event.ctrlKey))) {
      event.preventDefault();
      if (preview) {
        handleConfirm();
      } else {
        handleParse();
      }
    }
  };

  return (
    <section className="space-y-4 rounded-3xl border border-white/5 bg-[#0B1020] p-5 text-slate-50 shadow-[0_18px_45px_rgba(0,0,0,0.65)] sm:p-6">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">Self-destructing tasks</p>
        <h2 className="text-2xl font-semibold">Describe your task and let me handle the countdown.</h2>
      </div>
      <div
        className={`relative rounded-2xl border border-cyan-300/60 bg-[#081021] px-4 py-4 shadow-[0_0_35px_rgba(14,165,233,0.25)] sm:px-5 ${
          shake ? "animate-shake" : ""
        } focus-within:ring-2 focus-within:ring-cyan-400/80`}
      >
        <span className="pointer-events-none absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full border border-cyan-300/30 bg-[#050a17] px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-200 shadow-lg">
          AI field
          <svg className="h-2.5 w-2.5 text-cyan-300" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2.5 11.2 6l3.8.3-3 2.3.9 3.7-2.9-2-2.9 2 .9-3.7-3-2.3 3.8-.3L10 2.5Z" />
          </svg>
        </span>
        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-cyan-200/20 opacity-70 blur-xl" />
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="relative z-10 min-h-[140px] w-full resize-none rounded-xl border border-white/10 bg-[#030812]/60 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/80"
          aria-label="Describe your task"
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className="sm:ml-auto rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_12px_35px_rgba(15,23,42,0.6)] transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
            type="button"
            onClick={handleParse}
            disabled={loading}
          >
            {loading ? "Parsing…" : "Create task with AI"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="space-y-4 rounded-2xl border border-white/10 bg-[#101528] p-5 text-sm text-slate-100"
          >
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-50">{preview.title}</p>
              {preview.reasoning && <p className="text-sm text-slate-400">{preview.reasoning}</p>}
              <div className="grid gap-3 text-xs uppercase tracking-[0.2em] text-slate-400 sm:grid-cols-3">
                <Detail label="Duration" value={formatDuration(preview.durationMinutes)} />
                <Detail label="Due" value={formatDue(preview.dueISO, preview.durationMinutes)} />
                <Detail label="Priority" value={preview.priority} />
              </div>
              {preview.usedFallback && (
                <p className="text-xs text-amber-300/80">Time guessed from context; adjust priority if needed.</p>
              )}
            </div>
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Priority</p>
              <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs">
                {(["low", "medium", "high"] as TaskPriority[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setPreview((prev) => (prev ? { ...prev, priority: level } : prev))}
                    className={`rounded-full px-4 py-1 font-semibold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
                      preview.priority === level
                        ? "bg-gradient-to-r from-indigo-500 to-cyan-400 text-slate-950"
                        : "text-slate-200"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-5 py-2 text-sm font-semibold text-slate-900 shadow-[0_12px_35px_rgba(15,23,42,0.6)] transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                type="button"
                onClick={handleConfirm}
              >
                Confirm task
              </button>
              <button
                className="text-sm text-slate-400 underline transition hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                type="button"
                onClick={() => setPreview(null)}
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatDue(dueISO: string | null | undefined, minutes: number) {
  if (dueISO) {
    const date = new Date(dueISO);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
    }
  }
  return `~${formatDuration(minutes)} from now`;
}

function deriveDueFromDuration(minutes: number) {
  return new Date(Date.now() + minutes * 60000).toISOString();
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p>{label}</p>
      <p className="mt-1 text-base tracking-normal text-slate-50">{value}</p>
    </div>
  );
}
