import { NextRequest, NextResponse } from "next/server";

type CompletedTask = {
  title: string;
  durationMins?: number;
};

type SummaryRequestBody = {
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

  let body: SummaryRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.completed) || !body.dateISO) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const date = new Date(body.dateISO);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid dateISO value." }, { status: 400 });
  }

  const userPrompt = [
    `Date: ${date.toISOString().split("T")[0]}`,
    "Completed tasks:",
    ...body.completed.map((task, index) => {
      const duration = Number.isFinite(task.durationMins)
        ? `${task.durationMins} mins`
        : "duration unknown";
      return `${index + 1}. ${task.title} (${duration})`;
    }),
  ].join("\n");

  const payload = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "Write one encouraging sentence (≤18 words) summarizing user's day based on the completed tasks. No emojis.",
      },
      {
        role: "user",
        content: userPrompt,
      },
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
    console.error("[daily-summary] error", detail);
    return NextResponse.json({ error: "Failed to generate summary." }, { status: 500 });
  }

  const data = await response.json();
  const summary: string | undefined = data.choices?.[0]?.message?.content?.trim();

  if (!summary) {
    return NextResponse.json({ error: "Empty summary response." }, { status: 500 });
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
