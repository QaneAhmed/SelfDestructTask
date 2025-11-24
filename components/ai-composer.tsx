"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { NewTaskPayload } from "@/types/ux";
import { parseTaskText } from "@/lib/aiClient";

interface AIComposerProps {
  onCreate: (payload: NewTaskPayload) => void;
}

export function AIComposer({ onCreate }: AIComposerProps) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<NewTaskPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const result = await parseTaskText(trimmed);
      setPreview({ title: result.title, priority: result.priority, durationMinutes: result.durationMinutes, source: "ai", reasoning: result.reasoning });
    } catch (err) {
      setError((err as Error).message || "Could not interpret");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!preview) return;
    onCreate(preview);
    setPreview(null);
    setText("");
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4 text-white shadow-lg backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Walk the dog 18, send status note"
          className="flex-1 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none"
        />
        <button
          type="button"
          onClick={handleParse}
          className="rounded-2xl bg-gradient-to-r from-sky-400 via-violet-400 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow disabled:opacity-50"
          disabled={loading || text.length === 0}
        >
          {loading ? "Parsing…" : "Interpret with AI"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="mt-4 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/80"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-white">{preview.title}</p>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                  {preview.durationMinutes} min · {preview.priority}
                </p>
              </div>
              <button
                type="button"
                onClick={handleApply}
                className="rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-3 py-1 text-xs font-semibold text-slate-900"
              >
                Apply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
