type SessionLite = { id: string; intent: string };

type DelegationPromptParams = {
  kind: string;
  input: unknown;
  session: SessionLite;
};

const compareStringKeys = (a: string, b: string): number => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

const isPlainObject = (value: object): value is Record<string, unknown> => {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const normalizeJsonValue = (
  value: unknown,
  stack: WeakSet<object>
): unknown => {
  if (value === null) return null;

  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return value;

  // Only JSON-serializable values are supported; everything else becomes null.
  if (
    t === "bigint" ||
    t === "function" ||
    t === "symbol" ||
    t === "undefined"
  ) {
    return null;
  }

  if (t !== "object") return null;

  if (Array.isArray(value)) {
    if (stack.has(value)) return "[Circular]";
    stack.add(value);
    const out = value.map((item) => normalizeJsonValue(item, stack));
    stack.delete(value);
    return out;
  }

  if (!isPlainObject(value)) return null;

  if (stack.has(value)) return "[Circular]";
  stack.add(value);

  const keys = Object.keys(value).sort(compareStringKeys);
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    out[key] = normalizeJsonValue(value[key], stack);
  }

  stack.delete(value);
  return out;
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
