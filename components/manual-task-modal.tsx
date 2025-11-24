"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FormEvent, useState } from "react";
import type { NewTaskPayload, TaskPriority } from "@/types/ux";

interface ManualTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: NewTaskPayload) => void;
}

export function ManualTaskModal({ open, onClose, onCreate }: ManualTaskModalProps) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("1h");
  const [priority, setPriority] = useState("medium");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate({
      title: trimmed,
      durationMinutes: toMinutes(duration),
      priority: priority as TaskPriority,
      source: "manual",
    });
    setTitle("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.form
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="absolute inset-x-0 top-24 mx-auto w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl"
          >
            <h3 className="text-lg font-semibold">New task</h3>
            <div className="space-y-1.5">
              <label className="text-sm text-white/70" htmlFor="manual-title">
                Title
              </label>
              <input
                id="manual-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm text-white/70">Duration</label>
                <select
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                >
                  {"30m,1h,2h,6h,24h".split(",").map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-white/70">Priority</label>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                >
                  {"low,medium,high".split(",").map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 text-sm">
              <button className="rounded-lg bg-white/10 px-4 py-2" type="button" onClick={onClose}>
                Cancel
              </button>
              <button className="rounded-lg bg-gradient-to-r from-sky-400 to-violet-400 px-4 py-2 font-medium text-slate-950" type="submit">
                Create
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function toMinutes(value: string) {
  if (value.endsWith("m")) return Number(value.replace("m", ""));
  if (value.endsWith("h")) return Number(value.replace("h", "")) * 60;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 60;
}
