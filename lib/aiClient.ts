import type { TaskPriority } from "@/types/ux";

export type ParsedTask = {
  title: string;
  priority: TaskPriority;
  durationMinutes: number;
  reasoning?: string | null;
  dueISO?: string | null;
  usedFallback?: boolean;
};

type TimeHint = { hour: number; minute: number } | null;

export async function parseTaskText(input: string, signal?: AbortSignal): Promise<ParsedTask> {
  const { cleanedText, timeHint } = extractTimeHint(input);
  const response = await fetch("/api/ai/parse-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: cleanedText,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      nowISO: new Date().toISOString(),
      timeHint,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to parse task");
  }

  const data = await response.json();
  return {
    title: data.title,
    priority: (data.priority ?? "medium") as TaskPriority,
    durationMinutes: typeof data.durationMinutes === "number" ? Math.max(5, data.durationMinutes) : 60,
    reasoning: data.reasoning ?? null,
    dueISO: typeof data.dueISO === "string" ? data.dueISO : null,
    usedFallback: Boolean(data.usedFallback),
  };
}

export function extractTimeHint(raw: string): { cleanedText: string; timeHint: TimeHint } {
  const match = raw.match(/^(.*\S)?\s+(\d{1,2})(?::(\d{2}))?\s*$/);
  if (!match) {
    return { cleanedText: raw.trim(), timeHint: null };
  }
  const base = (match[1] ?? "").trim();
  const hour = Number(match[2]);
  const minute = match[3] ? Number(match[3]) : 0;
  if (!Number.isFinite(hour) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { cleanedText: raw.trim(), timeHint: null };
  }
  return {
    cleanedText: base.length > 0 ? base : raw.trim(),
    timeHint: { hour, minute },
  };
}

export async function getCompletionMessage(title: string, priority: TaskPriority): Promise<string> {
  const response = await fetch("/api/ai/completion-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, priority }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch completion message");
  }
  const data = (await response.json()) as { message?: string };
  return data.message ?? "Nice work finishing that task.";
}
