import { NextRequest, NextResponse } from "next/server";

type ParsedTask = {
  title: string;
  due: string | null;
  priority: "low" | "medium" | "high";
};

type TimeHint = {
  hour: number;
  minute: number;
};

type ParseRequestBody = {
  text?: string;
  timezone?: string;
  nowISO?: string;
  timeHint?: TimeHint | null;
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

  let body: ParseRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = body?.text?.trim();

  if (!text) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const timezone =
    typeof body.timezone === "string" && body.timezone.length > 0 ? body.timezone : "UTC";
  const nowISO =
    typeof body.nowISO === "string" && !Number.isNaN(Date.parse(body.nowISO))
      ? body.nowISO
      : new Date().toISOString();

  const timeHintLine =
    body.timeHint && Number.isFinite(body.timeHint.hour)
      ? `User supplied explicit 24h time hint: ${body.timeHint.hour
          .toString()
          .padStart(2, "0")}:${body.timeHint.minute?.toString().padStart(2, "0") || "00"}.`
      : null;

  const userPrompt = [
    `Task description: ${text}`,
    `User timezone: ${timezone}`,
    `Current local time: ${nowISO}`,
    "Interpret bare numbers immediately following the task text as 24-hour times (e.g., '14' → 14:00, '21' → 21:00) unless the user explicitly mentions am/pm.",
    "Do NOT infer a different calendar date unless the user clearly states one; otherwise keep the due date on the user's current day unless that time has already passed.",
    "When the user only specifies an hour, default minutes to 00.",
    "If the user mentions a specific time or part of day, interpret it in the provided timezone.",
    "If no explicit time is given, fall back to default behavior.",
  ]
    .concat(timeHintLine ? [timeHintLine] : [])
    .join("\n");

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
        content: userPrompt,
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
