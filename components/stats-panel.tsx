"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MOCK_HEATMAP = [0, 1, 3, 2, 0, 4, 1];

export function StatsPanel() {
  const [open, setOpen] = useState(false);
  const ratio = { completed: 8, expired: 2 };
  const streak = 5;

  const panel = (
    <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-medium text-neutral-600">Streak</p>
        <p className="text-2xl font-semibold">{streak} days</p>
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-600">Daily completion heatmap</p>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {MOCK_HEATMAP.map((value, index) => (
            <span
              key={index}
              className={`h-6 rounded ${value === 0 ? "bg-neutral-200" : value < 3 ? "bg-neutral-400" : "bg-black"}`}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-600">Completions vs expired</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-2 flex-1 rounded bg-neutral-200">
            <div className="h-full rounded bg-black" style={{ width: `${(ratio.completed / (ratio.completed + ratio.expired)) * 100}%` }} />
          </div>
          <p className="text-sm text-neutral-600">{ratio.completed} / {ratio.expired}</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-600">Guidance</p>
        <p className="mt-1 text-sm text-neutral-500">Clear two tasks before midday to keep the streak alive.</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:block">{panel}</div>
      <div className="lg:hidden">
        <button
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm"
          type="button"
          onClick={() => setOpen(true)}
        >
          Open stats
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setOpen(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 240, damping: 28 }}
                className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-6 shadow-lg"
              >
                <button
                  className="mb-4 text-sm text-neutral-500 underline"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
                {panel}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
