"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { parseTaskText } from "@/lib/aiClient";
import { fireConfetti } from "@/lib/confetti";
import type { TaskPriority } from "@/types/ux";

type DemoResult = {
  status: "success" | "failed";
  title: string;
};

type DemoTask = {
  title: string;
  priority: TaskPriority;
  reasoning: string;
  dueLabel?: string | null;
};

type DemoTaskCardProps = {
  task: DemoTask;
  timeLeft: number;
  totalDuration: number;
  onComplete: () => void;
};

const DEMO_DURATION_MS = 5000;

const PRIORITY_STYLES: Record<
  TaskPriority,
  { label: string; className: string }
> = {
  high: {
    label: "High",
    className: "bg-rose-500/10 text-rose-200 ring-1 ring-rose-400/40",
  },
  medium: {
    label: "Medium",
    className: "bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-400/40",
  },
  low: {
    label: "Low",
    className: "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/40",
  },
};

function formatTimeLabel(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${seconds}`;
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050815] text-slate-100">
      <BackgroundGlows />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="hidden w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-md shadow-none sm:mx-auto sm:flex sm:px-6 sm:py-5 sm:shadow-[0_5px_20px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 text-base font-bold text-slate-900 shadow-[0_0_15px_rgba(56,189,248,0.3)] sm:h-11 sm:w-11 sm:text-lg sm:shadow-[0_0_25px_rgba(56,189,248,0.4)]">
                <LandingClockIcon size={36} />
              </div>
              <div>
                <p className="text-base font-semibold text-white sm:text-lg">Taskonate</p>
              </div>
            </div>
          <div className="flex w-full max-w-xs flex-col gap-2 text-sm font-medium sm:w-auto sm:flex-row sm:items-center">
            <Link
              href="/login"
              className="w-full rounded-full border border-white/20 px-4 py-2 text-center text-slate-200 transition hover:bg-white/10 hover:text-white sm:w-auto sm:px-5"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-2 text-center font-semibold text-slate-950 shadow-[0_6px_20px_rgba(56,189,248,0.25)] transition hover:opacity-95 sm:w-auto sm:px-6 sm:shadow-[0_10px_30px_rgba(56,189,248,0.3)]"
            >
              Sign up
            </Link>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 pb-20 sm:px-6">
          <section className="mt-6 flex w-full flex-col items-center text-center sm:mt-10">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl text-white shadow-[0_12px_25px_rgba(0,0,0,0.35)] sm:h-20 sm:w-20 sm:text-3xl sm:shadow-[0_20px_40px_rgba(2,6,23,0.5)]">
              <LandingClockIcon size={52} />
            </div>
            <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight text-white sm:text-6xl sm:leading-tight">
              Beat the clock. Stay ahead of self-destructing tasks.
            </h1>
            <p className="hidden max-w-2xl text-balance text-base text-slate-300 sm:mt-4 sm:text-xl sm:block">
              A refined AI task system that keeps every move intentional—calm when you’re on track, dramatic when you drift.
            </p>
            <div className="mt-6 flex flex-col gap-3 text-sm font-semibold sm:mt-8 sm:flex-row sm:hidden">
              <Link
                href="/signup"
                className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-3 text-slate-900 shadow-[0_10px_25px_rgba(56,189,248,0.25)] transition hover:scale-[1.02] hover:opacity-95"
              >
                Create free account
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-white/15 px-6 py-3 text-white transition hover:bg-white/10"
              >
                Log in
              </Link>
            </div>
          </section>

          <section className="mt-10 w-full sm:mt-12">
            <DemoGame />
          </section>
        </main>
      </div>
    </div>
  );
}

function DemoGame() {
  const [inputValue, setInputValue] = useState("");
  const [task, setTask] = useState<DemoTask | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "finished">("idle");
  const [timeLeft, setTimeLeft] = useState(DEMO_DURATION_MS);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<DemoResult | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeTitleRef = useRef<string>("");

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const resetDemo = useCallback(() => {
    controllerRef.current?.abort();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    activeTitleRef.current = "";
    setInputValue("");
    setTask(null);
    setStatus("idle");
    setError(null);
    setTimeLeft(DEMO_DURATION_MS);
    setOutcome(null);
  }, []);

  const startCountdown = useCallback(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const next = Math.max(DEMO_DURATION_MS - elapsed, 0);
      setTimeLeft(next);
      if (next <= 0) {
        rafRef.current = null;
        handleFailure();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const handleFailure = useCallback(() => {
    setStatus("finished");
    setOutcome({ status: "failed", title: activeTitleRef.current || "Your task" });
    setTask(null);
  }, []);

  const handleSuccess = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setStatus("finished");
    setOutcome({ status: "success", title: activeTitleRef.current || "Your task" });
    setTask(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || status === "loading" || status === "running") return;
    setError(null);
    setStatus("loading");
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const parsed = await parseTaskText(inputValue.trim(), controller.signal);
      const reasoning = parsed.reasoning || `Auto-scheduled for ${Math.max(5, parsed.durationMinutes)} min.`;
      const taskObj: DemoTask = {
        title: parsed.title,
        priority: parsed.priority,
        reasoning,
        dueLabel: parsed.dueISO
          ? new Date(parsed.dueISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : null,
      };
      activeTitleRef.current = parsed.title;
      setTask(taskObj);
      setTimeLeft(DEMO_DURATION_MS);
      setStatus("running");
      startCountdown();
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      setError("Our AI is busy. Try again in a second.");
      setStatus("idle");
    }
  }, [inputValue, status, startCountdown]);

  const handleComplete = useCallback(() => {
    if (status !== "running") return;
    fireConfetti(window.innerWidth > 768 ? "medium" : "low");
    handleSuccess();
  }, [status, handleSuccess]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1224]/90 p-4 backdrop-blur-lg shadow-none sm:p-8 sm:rounded-[2rem] sm:shadow-[0_30px_70px_rgba(2,6,23,0.6)]">
      <div className="mt-2 sm:mt-4">
        <AnimatePresence mode="wait">
          {status === "running" && task ? (
            <motion.div
              key="task"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <DemoTaskCard task={task} timeLeft={timeLeft} totalDuration={DEMO_DURATION_MS} onComplete={handleComplete} />
              <p className="mt-3 text-xs text-slate-400 sm:text-xs">Complete it before the timer implodes.</p>
            </motion.div>
          ) : status === "finished" ? (
            <motion.div
              key="finished"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="rounded-2xl border border-white/10 bg-[#0e142a]/90 p-5 text-center backdrop-blur-lg sm:p-8 sm:rounded-3xl sm:shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
            >
              <h3 className="mt-2 text-2xl font-bold text-white tracking-tight sm:text-3xl">
                {outcome?.status === "success" ? "You beat the clock" : "It self-destructed"}
              </h3>
              <p className="mt-2 text-sm text-slate-300 sm:mt-3 sm:text-base">
                {outcome?.status === "success"
                  ? "That dopamine hit is waiting in the real app."
                  : "No worries—reset and see how fast you can be."}
              </p>
              <div className="mt-5 flex flex-col gap-3 text-sm font-semibold sm:mt-6 sm:flex-row">
                <Link
                  href="/signup"
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 text-slate-900 transition shadow-[0_8px_20px_rgba(56,189,248,0.3)] sm:rounded-2xl sm:px-4 sm:shadow-[0_12px_30px_rgba(56,189,248,0.35)]"
                  aria-label="Go to sign up"
                >
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className="w-full rounded-xl border border-white/20 px-4 py-3 text-white transition hover:bg-white/10 sm:rounded-2xl"
                  aria-label="Go to login"
                >
                  Log in
                </Link>
              </div>
              <button
                type="button"
                onClick={resetDemo}
                className="mt-4 text-sm font-semibold text-cyan-300 transition hover:text-white"
                aria-label="Try the demo again"
              >
                Try the demo again
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Type anything you need to do</h2>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm">Press Enter to submit. We’ll handle the countdown.</p>
              <div className="mt-5 rounded-2xl border border-cyan-400/60 bg-[#060c1d] px-3 py-2 shadow-[0_12px_35px_rgba(8,15,35,0.65)] ring-1 ring-cyan-400/30 transition sm:rounded-3xl sm:px-4 sm:py-3">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={status === "loading"}
                  placeholder="Example: Mail John Doe"
                  className="h-24 w-full resize-none bg-transparent text-base text-white placeholder:text-slate-500/70 focus:outline-none sm:h-32 sm:text-lg"
                  aria-label="Describe a task for the AI demo"
                />
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={status === "loading" || !inputValue.trim()}
                  className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 text-center text-sm font-semibold text-slate-900 shadow-[0_8px_25px_rgba(56,189,248,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
                  aria-label="Create demo task"
                >
                  {status === "loading" ? "Thinking..." : "Create task"}
                </button>
              </div>
              {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DemoTaskCard({ task, timeLeft, totalDuration, onComplete }: DemoTaskCardProps) {
  const priority = PRIORITY_STYLES[task.priority];
  const progress = Math.min(100, Math.max(0, (1 - timeLeft / totalDuration) * 100));
  const tone = timeLeft < 1500 ? "text-rose-300" : timeLeft < 3000 ? "text-amber-300" : "text-white";

  return (
    <div className="rounded-xl border border-white/10 bg-[#0e152b]/90 p-5 backdrop-blur-lg shadow-none sm:p-6 sm:rounded-3xl sm:shadow-[0_25px_50px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between text-[0.7rem] sm:text-xs">
        <span className="rounded-full bg-white/5 px-3 py-1 text-white/70">AI task</span>
        <span className={`rounded-full px-3 py-1 text-[0.7rem] font-semibold ${priority.className} sm:text-xs`}>
          {priority.label}
        </span>
      </div>
      <h3 className="mt-3 text-xl font-semibold text-white sm:mt-4 sm:text-2xl">{task.title}</h3>
      {task.dueLabel && <p className="mt-1 text-xs text-slate-500 sm:text-xs">Due around {task.dueLabel}</p>}
      <div className="mt-5 flex items-center justify-between text-xs font-mono text-white/80 sm:text-sm">
        <span>Vanishing in</span>
        <motion.span key={Math.ceil(timeLeft / 100)} className={`text-lg sm:text-xl ${tone}`}>
          {formatTimeLabel(timeLeft)}
        </motion.span>
      </div>
      <div className="mt-3 h-[6px] overflow-hidden rounded-full bg-white/10 sm:h-2">
        <motion.div
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: "linear" }}
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
        />
      </div>
      <motion.button
        onClick={onComplete}
        whileTap={{ scale: 0.97 }}
        className="mt-5 w-full rounded-lg bg-gradient-to-r from-emerald-300 to-cyan-300 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_6px_18px_rgba(16,185,129,0.25)] transition hover:scale-[1.02] sm:mt-6 sm:rounded-xl sm:py-3"
        aria-label="Complete demo task"
      >
        Complete
      </motion.button>
    </div>
  );
}

function BackgroundGlows() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-[-25%] top-[-20%] h-56 w-56 rounded-full bg-cyan-400/15 blur-[90px] sm:h-[28rem] sm:w-[28rem] sm:blur-[150px]" />
      <div className="absolute inset-x-1/2 top-[8%] h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/15 blur-[110px] sm:h-[35rem] sm:w-[35rem] sm:blur-[200px]" />
      <div className="absolute bottom-[-20%] right-[-20%] h-52 w-52 rounded-full bg-sky-400/15 blur-[100px] sm:h-[26rem] sm:w-[26rem] sm:blur-[170px]" />
    </div>
  );
}

export function LandingClockIcon({ size = 48 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      animate={{
        rotate: [-3, 3, -3],
        y: [0, -1.5, 0],
      }}
      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id="clockBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
        <radialGradient id="fuseGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#dc2626" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="36" r="18" fill="url(#clockBody)" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
      <circle cx="32" cy="36" r="15" fill="#050815" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
      <line x1="32" y1="36" x2="32" y2="23" stroke="#fdf2f8" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="36" x2="41" y2="42" stroke="#fdf2f8" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="36" r="2" fill="#fdf2f8" />
      <motion.path
        d="M16 15 Q20 5 30 12"
        stroke="#94a3b8"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        animate={{ y: [-0.5, 0.5, -0.5] }}
        transition={{ repeat: Infinity, duration: 1.6 }}
      />
      <motion.path
        d="M48 15 Q44 5 34 12"
        stroke="#94a3b8"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        animate={{ y: [0.5, -0.5, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.6 }}
      />
      <motion.path
        d="M32 51 C38 55 42 50 46 54 C50 58 54 57 58 60"
        stroke="#fde68a"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="2 4"
        fill="none"
        animate={{ strokeDashoffset: [0, 8] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
      />
      <motion.circle
        cx="58"
        cy="60"
        r="3.5"
        fill="url(#fuseGlow)"
        animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
      />
    </motion.svg>
  );
}
