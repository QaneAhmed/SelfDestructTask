import { NextRequest, NextResponse } from "next/server";

type CompletedTask = {
  title: string;
  durationMins?: number;
};

type CompletionRequest = {
  completed: CompletedTask[];
  dateISO: string;
};

const MODEL = "gpt-4o-mini";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY." },
      { status: 500, statusText: "Configuration error" }
    );
  }

  let body: CompletionRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.completed) || body.completed.length === 0) {
    return NextResponse.json({ error: "At least one completed task is required." }, { status: 400 });
  }

  const topTask = body.completed[0];
  if (!topTask?.title) {
    return NextResponse.json({ error: "Task title is required." }, { status: 400 });
  }

  const userPrompt = [
    `Completed tasks:`,
    ...body.completed.map((task, index) => {
      const duration =
        Number.isFinite(task.durationMins) && task.durationMins
          ? `${task.durationMins} mins`
          : "duration unknown";
      return `${index + 1}. ${task.title} (${duration})`;
    }),
    `Date: ${body.dateISO}`,
  ].join("\n");

  const payload = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "Write one encouraging sentence (≤18 words) celebrating the user's task completion. Mention the most important task by name.",
      },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await safeJson(response);
    console.error("[completion-message] error", detail);
    return NextResponse.json({ error: "Failed to generate message." }, { status: 500 });
  }

  const data = await response.json();
  const summary: string | undefined = data.choices?.[0]?.message?.content?.trim();

  if (!summary) {
    return NextResponse.json({ error: "Empty response from model." }, { status: 500 });
  }

  return NextResponse.json({ summary });
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
