import { NextRequest, NextResponse } from "next/server";

type CompletionBody = {
  title?: string;
  priority?: "low" | "medium" | "high";
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

  let body: CompletionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const userPrompt = `Task: ${body.title}\nPriority: ${body.priority ?? "medium"}`;

  const payload = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a warm, concise accountability coach. When the user completes a task, respond with one sentence (under 20 words) celebrating momentum and reduced stress. Reference the task by name. No emojis, hashtags, or questions.",
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
  const message: string | undefined = data.choices?.[0]?.message?.content?.trim();

  if (!message) {
    return NextResponse.json({ error: "Empty response from model." }, { status: 500 });
  }

  return NextResponse.json({ message });
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
