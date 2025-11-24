"use client";

import { AnimatePresence, motion } from "framer-motion";

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

export function Toast({ message, onDismiss }: ToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-1/2 z-50 w-[min(90%,22rem)] -translate-x-1/2 rounded-3xl border border-emerald-400/30 bg-[#101528]/95 p-4 text-sm text-slate-50 shadow-[0_18px_45px_rgba(0,0,0,0.75)] sm:left-1/2"
        >
          <div className="space-y-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300">Nice work</p>
            <p className="text-sm">{message}</p>
            <button
              className="rounded-full border border-white/15 px-4 py-1 text-xs text-slate-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
              onClick={onDismiss}
              type="button"
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
