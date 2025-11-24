"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { NewTaskPayload, Task, TaskPriority } from "@/types/ux";
import { useTaskPanel } from "@/components/layout/TaskPanelProvider";
import { AIPrompt } from "@/components/ai-prompt";
import { TaskCreator } from "@/components/task-creator";

interface TaskCreationPanelProps {
  onCreate: (payload: NewTaskPayload) => void;
  onUpdateTask: (taskId: string, updates: { title: string; priority: TaskPriority }) => void;
}

export function TaskCreationPanel({ onCreate, onUpdateTask }: TaskCreationPanelProps) {
  const { isOpen, mode, editingTask, close } = useTaskPanel();
  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");

  useEffect(() => {
    if (mode === "edit") {
      setActiveTab("manual");
    }
  }, [mode]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handler);
    }
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  const handleCreate = (payload: NewTaskPayload) => {
    onCreate(payload);
    close();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="task-panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
          onClick={close}
        >
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#0B1020] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  {mode === "edit" ? "Edit task" : "Create task"}
                </p>
                <h2 className="text-2xl font-semibold">{mode === "edit" ? editingTask?.title : "Bring a task to life"}</h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
              >
                Close
              </button>
            </div>
            {mode === "edit" && editingTask ? (
              <EditTaskForm task={editingTask} onUpdate={onUpdateTask} onClose={close} />
            ) : (
              <div className="mt-6 space-y-4">
                <div className="flex rounded-full border border-white/10 bg-white/5 p-1 text-sm text-slate-300">
                  {["ai", "manual"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab as "ai" | "manual")}
                      className={`flex-1 rounded-full px-4 py-2 capitalize transition ${
                        activeTab === tab ? "bg-gradient-to-r from-indigo-500 to-cyan-400 text-slate-950" : ""
                      }`}
                    >
                      {tab} creator
                    </button>
                  ))}
                </div>
                {activeTab === "ai" ? (
                  <AIPrompt onCreate={handleCreate} />
                ) : (
                  <TaskCreator onCreate={handleCreate} variant="full" />
                )}
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EditTaskForm({
  task,
  onUpdate,
  onClose,
}: {
  task: Task;
  onUpdate: (taskId: string, updates: { title: string; priority: TaskPriority }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onUpdate(task.id, { title, priority });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Title</label>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Priority</label>
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value as TaskPriority)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
        >
          {["low", "medium", "high"].map((level) => (
            <option key={level} value={level} className="bg-[#050814] text-slate-900">
              {level}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 text-sm">
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl border border-white/10 px-4 py-2 text-slate-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-4 py-2 font-semibold text-slate-950 shadow-[0_12px_35px_rgba(15,23,42,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        >
          Save changes
        </button>
      </div>
    </form>
  );
}
