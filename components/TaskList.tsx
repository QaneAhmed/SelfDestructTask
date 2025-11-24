"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import type { Task } from "@/types/ux";
import { TaskCard } from "@/components/task-card";
import { useFilter } from "@/components/layout/FilterProvider";

interface TaskListProps {
  tasks: Task[];
  onComplete: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onSelectTask: (task: Task) => void;
}

const variants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.98, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.25 } },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.7,
    filter: "blur(18px)",
    boxShadow: "0 0 50px rgba(148,163,184,0.25)",
    transition: { duration: 0.5, ease: [0.42, 0, 1, 1] },
  },
};

export function TaskList({ tasks, onComplete, onDelete, onSelectTask }: TaskListProps) {
  const { activeFilter } = useFilter();

  const filtered = tasks.filter((task) => {
    if (activeFilter === "all") return true;
    return task.priority === activeFilter;
  });

  if (activeFilter === "all") {
    filtered.sort((a, b) => a.remainingMs - b.remainingMs);
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.65)]">
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-slate-400">
          Nothing here yet. Try adding a task or switch filters.
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {filtered.map((task) => (
              <motion.div
                key={task.id}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                style={{ overflow: "visible" }}
              >
                <TaskCard task={task} onComplete={() => onComplete(task)} onDelete={onDelete} onSelect={() => onSelectTask(task)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
