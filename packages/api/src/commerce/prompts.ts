type SessionLite = { id: string; intent: string };

type DelegationPromptParams = {
  kind: string;
  input: unknown;
  session: SessionLite;
};

const normalizeJsonValue = (value: unknown, seen: WeakSet<object>): unknown => {
  if (value === null) {
    return null;
  }

  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") {
    return value;
  }
  if (t === "bigint") {
    return value.toString();
  }
  if (t === "undefined") {
    return null;
  }
  if (t === "function") {
    return "[Function]";
  }
  if (t === "symbol") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof RegExp) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item, seen));
  }

  if (value instanceof Map) {
    const normalized = Array.from(value.entries()).map(([k, v]) => [
      normalizeJsonValue(k, seen),
      normalizeJsonValue(v, seen),
    ]);
    normalized.sort((a, b) =>
      JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0]))
    );
    return normalized;
  }

  if (value instanceof Set) {
    const normalized = Array.from(value.values()).map((v) =>
      normalizeJsonValue(v, seen)
    );
    normalized.sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b))
    );
    return normalized;
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);

    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      out[key] = normalizeJsonValue(obj[key], seen);
    }
    return out;
  }

  return String(value);
};

const stableJsonStringify = (value: unknown): string => {
  const normalized = normalizeJsonValue(value, new WeakSet<object>());
  return JSON.stringify(normalized, null, 2);
};

const outputContractJson = stableJsonStringify({
  summary: "short summary string",
  artifacts: [],
  warnings: [],
  toolCalls: [],
  next: null,
});

export const buildDelegationPrompt = (
  params: DelegationPromptParams
): string => {
  const inputJson = stableJsonStringify(params.input);

  return [
    "You are a subagent in an orchestration harness.",
    "You execute exactly one task and return JSON only.",
    "Do not return markdown. Do not wrap JSON in code fences.",
    "",
    `Task kind: ${params.kind}`,
    `Session id: ${params.session.id}`,
    `Session intent: ${params.session.intent}`,
    "",
    "Return JSON that conforms exactly to this contract:",
    outputContractJson,
    "",
    "Input JSON:",
    inputJson,
    "",
  ].join("\n");
};
