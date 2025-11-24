"use client";

import { createContext, PropsWithChildren, useContext, useState } from "react";
import type { Task } from "@/types/ux";

type PanelMode = "create" | "edit";

type TaskPanelContextValue = {
  isOpen: boolean;
  mode: PanelMode;
  editingTask: Task | null;
  openCreate: () => void;
  openEdit: (task: Task) => void;
  close: () => void;
};

const TaskPanelContext = createContext<TaskPanelContextValue | undefined>(undefined);

export function TaskPanelProvider({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<PanelMode>("create");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const openCreate = () => {
    setMode("create");
    setEditingTask(null);
    setIsOpen(true);
  };

  const openEdit = (task: Task) => {
    setMode("edit");
    setEditingTask(task);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setEditingTask(null);
  };

  return (
    <TaskPanelContext.Provider value={{ isOpen, mode, editingTask, openCreate, openEdit, close }}>
      {children}
    </TaskPanelContext.Provider>
  );
}

export function useTaskPanel() {
  const ctx = useContext(TaskPanelContext);
  if (!ctx) {
    throw new Error("useTaskPanel must be used within TaskPanelProvider");
  }
  return ctx;
}
