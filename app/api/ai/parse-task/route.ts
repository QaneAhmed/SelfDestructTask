import { NextRequest, NextResponse } from "next/server";

type ParsedTask = {
  title: string;
  due: string | null;
  priority: "low" | "medium" | "high";
};

const MODEL = "gpt-4o-mini";
const FALLBACK_MODEL = "gpt-4o";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY." },
      { status: 500, statusText: "Configuration error" }
    );
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = body?.text?.trim();

  if (!text) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const payload = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a strict task parser. Return ONLY compact JSON with keys title (≤8 words), due (ISO 8601 or null), priority (low|medium|high). No preface.",
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" as const },
  };

  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  };

  try {
    let response = await fetch("https://api.openai.com/v1/chat/completions", requestInit);

    if (!response.ok && response.status === 404) {
      const fallbackPayload = { ...payload, model: FALLBACK_MODEL };
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        ...requestInit,
        body: JSON.stringify(fallbackPayload),
      });
    }

    if (!response.ok) {
      const message = await safeJson(response);
      throw new Error(message?.error?.message ?? `OpenAI error (${response.status})`);
    }

    const data = await response.json();
    const content: string | undefined = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from model.");
    }

    let parsed: ParsedTask | null = null;

    try {
      parsed = JSON.parse(content) as ParsedTask;
      if (
        !parsed?.title ||
        typeof parsed.title !== "string" ||
        !["low", "medium", "high"].includes(parsed.priority)
      ) {
        throw new Error("Invalid shape");
      }
      if (parsed.due !== null && typeof parsed.due !== "string") {
        parsed.due = null;
      }
    } catch {
      parsed = null;
    }

    if (!parsed) {
      return NextResponse.json({
        title: text,
        due: null,
        priority: "medium",
        fallback: true,
      });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[parse-task] error", error);
    return NextResponse.json(
      { title: text, due: null, priority: "medium", fallback: true },
      { status: 200 }
    );
  }
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
