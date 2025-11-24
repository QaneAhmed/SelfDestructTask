import { NextRequest, NextResponse } from "next/server";

type TaskPriority = "low" | "medium" | "high";

type TimeHint = {
  hour: number;
  minute: number;
};

type ParseRequestBody = {
  input?: string;
  timezone?: string;
  nowISO?: string;
  timeHint?: TimeHint | null;
};

type ParsedTask = {
  title: string;
  due: string | null;
  priority: TaskPriority;
  reasoning?: string | null;
};

type HeuristicResult = {
  cleanedText: string;
  durationMinutes?: number;
  dueISO?: string;
  priority?: TaskPriority;
  notes: string[];
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

  const text = body?.input?.trim();

  if (!text) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const timezone =
    typeof body.timezone === "string" && body.timezone.length > 0 ? body.timezone : "UTC";
  const nowISO =
    typeof body.nowISO === "string" && !Number.isNaN(Date.parse(body.nowISO))
      ? body.nowISO
      : new Date().toISOString();

  const heuristics = applyHeuristics(text, timezone, nowISO, body.timeHint);

  const userPrompt = [
    `Raw text: ${text}`,
    `Timezone: ${timezone}`,
    `Current ISO time: ${nowISO}`,
    heuristics.durationMinutes
      ? `Heuristic duration: ${heuristics.durationMinutes} minutes (user phrases referenced).`
      : null,
    heuristics.dueISO ? `Heuristic due timestamp: ${heuristics.dueISO}.` : null,
    heuristics.priority ? `Priority hint: ${heuristics.priority}.` : null,
    "Rewrite the task as a concise imperative title (≤ 8 words).",
    "Return compact JSON with keys: title, due (ISO 8601 or null), priority (low|medium|high), reasoning (one short sentence).",
    "If the heuristic due seems valid, keep it; otherwise infer one reasonably.",
  ]
    .filter(Boolean)
    .join("\n");

  const payload = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a strict task parser. Return ONLY compact JSON with keys title (≤8 words), due (ISO 8601 or null), priority (low|medium|high), reasoning (≤15 words). No preface.",
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
        durationMinutes: heuristics.durationMinutes ?? 60,
        priority: heuristics.priority ?? "medium",
        reasoning: heuristics.notes.join(" ") || null,
        usedFallback: true,
        dueISO: heuristics.dueISO ?? null,
      });
    }

    const mergedPriority = heuristics.priority ?? parsed.priority;
    const finalDueISO = heuristics.dueISO ?? parsed.due ?? null;

    let durationMinutes = heuristics.durationMinutes ?? null;
    if (!durationMinutes && finalDueISO) {
      durationMinutes = durationFromDue(finalDueISO, nowISO);
    }

    if (!durationMinutes) {
      durationMinutes = inferDurationFromPriority(mergedPriority);
    }

    const reasoningParts = [...heuristics.notes, parsed.reasoning ?? ""].filter(Boolean);

    return NextResponse.json({
      title: parsed.title,
      durationMinutes: Math.max(5, durationMinutes),
      priority: mergedPriority,
      reasoning: reasoningParts.join(" "),
      usedFallback: !heuristics.notes.length,
      dueISO: finalDueISO,
    });
  } catch (error) {
    console.error("[parse-task] error", error);
    return NextResponse.json(
      {
        title: text,
        durationMinutes: heuristics.durationMinutes ?? 60,
        priority: heuristics.priority ?? "medium",
        reasoning: heuristics.notes.join(" ") || null,
        usedFallback: true,
        dueISO: heuristics.dueISO ?? null,
      },
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

function durationFromDue(dueISO: string, nowISO: string) {
  const due = Date.parse(dueISO);
  const now = Date.parse(nowISO);
  if (Number.isNaN(due) || Number.isNaN(now)) {
    return 60;
  }
  return Math.max(5, Math.round((due - now) / 60000));
}

function inferDurationFromPriority(priority: "low" | "medium" | "high") {
  if (priority === "high") return 60;
  if (priority === "low") return 8 * 60;
  return 2 * 60;
}

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  if (!dtfCache.has(timeZone)) {
    dtfCache.set(
      timeZone,
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }
  return dtfCache.get(timeZone)!;
}

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getLocalParts(date: Date, timeZone: string): LocalParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const filled: LocalParts = {
    year: 1970,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
  };
  for (const part of parts) {
    if (part.type === "literal") continue;
    const value = Number(part.value);
    if (!Number.isNaN(value) && part.type in filled) {
      // @ts-expect-error intentional dynamic assignment
      filled[part.type] = value;
    }
  }
  return filled;
}

function getOffsetMinutes(date: Date, timeZone: string) {
  const parts = getFormatter(timeZone).formatToParts(date);
  const data: Record<string, number> = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    data[part.type] = Number(part.value);
  }
  const asUTC = Date.UTC(
    data.year ?? date.getUTCFullYear(),
    (data.month ?? date.getUTCMonth() + 1) - 1,
    data.day ?? date.getUTCDate(),
    data.hour ?? date.getUTCHours(),
    data.minute ?? date.getUTCMinutes(),
    data.second ?? date.getUTCSeconds()
  );
  return (asUTC - date.getTime()) / 60000;
}

function localPartsToDate(parts: Partial<LocalParts>, timeZone: string) {
  const fallback: LocalParts = {
    year: parts.year ?? 1970,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
    second: parts.second ?? 0,
  };
  const roughUTC = new Date(
    Date.UTC(fallback.year, fallback.month - 1, fallback.day, fallback.hour, fallback.minute, fallback.second)
  );
  const offsetMinutes = getOffsetMinutes(roughUTC, timeZone);
  return new Date(roughUTC.getTime() - offsetMinutes * 60000);
}

function addDaysToParts(parts: LocalParts, days: number): LocalParts {
  const temp = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
  temp.setUTCDate(temp.getUTCDate() + days);
  return {
    year: temp.getUTCFullYear(),
    month: temp.getUTCMonth() + 1,
    day: temp.getUTCDate(),
    hour: temp.getUTCHours(),
    minute: temp.getUTCMinutes(),
    second: temp.getUTCSeconds(),
  };
}

const PRIORITY_HINTS: Array<{ regex: RegExp; value: TaskPriority }> = [
  { regex: /\b(urgent|asap|immediately|right away|critical)\b/i, value: "high" },
  { regex: /\b(today|tonight|soon)\b/i, value: "medium" },
  { regex: /\b(low|maybe|someday|later)\b/i, value: "low" },
];

const RELATIVE_PATTERNS = [
  { regex: /\bin\s+(\d+)\s*(minutes?|mins?|m)\b/i, multiplier: 1 },
  { regex: /\bin\s+(\d+)\s*(hours?|hrs?|h)\b/i, multiplier: 60 },
];

function applyHeuristics(text: string, timeZone: string, nowISO: string, hint?: TimeHint | null): HeuristicResult {
  const now = new Date(nowISO);
  const lower = text.toLowerCase();
  const notes: string[] = [];

  let durationMinutes: number | undefined;
  let dueISO: string | undefined;
  let priority: TaskPriority | undefined;

  for (const hintConfig of PRIORITY_HINTS) {
    if (hintConfig.regex.test(lower)) {
      priority = hintConfig.value;
      notes.push(`Priority nudged to ${hintConfig.value} based on phrasing.`);
      break;
    }
  }

  for (const pattern of RELATIVE_PATTERNS) {
    const match = lower.match(pattern.regex);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value) && value > 0) {
        durationMinutes = Math.max(5, value * pattern.multiplier);
        notes.push(`Relative time “${match[0]}” ⇒ ${durationMinutes} minutes.`);
        break;
      }
    }
  }

  const timeMatch = lower.match(/(?:at|by|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  const bareTimeMatch = !timeMatch ? lower.match(/\b(\d{1,2}):(\d{2})\b/) : null;

  let targetHour: number | null = null;
  let targetMinute: number | null = null;

  if (timeMatch) {
    targetHour = parseInt(timeMatch[1]!, 10);
    targetMinute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (timeMatch[3]) {
      const meridiem = timeMatch[3].toLowerCase();
      if (meridiem === "pm" && targetHour < 12) targetHour += 12;
      if (meridiem === "am" && targetHour === 12) targetHour = 0;
    }
  } else if (bareTimeMatch) {
    targetHour = parseInt(bareTimeMatch[1]!, 10);
    targetMinute = parseInt(bareTimeMatch[2]!, 10);
  } else if (hint && Number.isFinite(hint.hour)) {
    targetHour = Math.max(0, Math.min(23, hint.hour));
    targetMinute = Math.max(0, Math.min(59, hint.minute ?? 0));
  }

  if (targetHour !== null && targetMinute !== null) {
    const localParts = getLocalParts(now, timeZone);
    const tomorrow = /\btomorrow\b/.test(lower);
    const localTarget = {
      ...localParts,
      hour: targetHour,
      minute: targetMinute,
      second: 0,
    };
    const baseLocalDate = tomorrow ? addDaysToParts(localTarget, 1) : localTarget;
    let candidate = localPartsToDate(baseLocalDate, timeZone);
    if (!tomorrow && candidate.getTime() <= now.getTime()) {
      const nextDay = addDaysToParts(baseLocalDate, 1);
      candidate = localPartsToDate(nextDay, timeZone);
    }
    dueISO = candidate.toISOString();
    durationMinutes = Math.max(5, Math.round((candidate.getTime() - now.getTime()) / 60000));
    notes.push(
      `Scheduled for ${new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      }).format(candidate)} based on "${timeMatch ? timeMatch[0] : "time hint"}".`
    );
  }

  return {
    cleanedText: text,
    durationMinutes,
    dueISO,
    priority,
    notes,
  };
}
