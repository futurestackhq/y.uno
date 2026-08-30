interface SessionLite {
  id: string;
  intent: string;
}

interface DelegationPromptParams {
  kind: string;
  input: unknown;
  nodeId?: string | null;
  planId?: string | null;
  session: SessionLite;
}

const compareStringKeys = (a: string, b: string): number => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const normalizeJsonValue = (
  value: unknown,
  stack: WeakSet<object>
): unknown => {
  if (value === null) {
    return null;
  }

  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") {
    return value;
  }

  // Only JSON-serializable values are supported; everything else becomes null.
  if (
    t === "bigint" ||
    t === "function" ||
    t === "symbol" ||
    t === "undefined"
  ) {
    return null;
  }

  if (t !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    if (stack.has(value)) {
      return "[Circular]";
    }
    stack.add(value);
    const out = value.map((item) => normalizeJsonValue(item, stack));
    stack.delete(value);
    return out;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  if (stack.has(value)) {
    return "[Circular]";
  }
  stack.add(value);

  const keys = Object.keys(value).toSorted(compareStringKeys);
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
  artifacts: [],
  next: null,
  summary: "short summary string",
  toolCalls: [],
  warnings: [],
});

interface HostPromptParams {
  context: unknown;
}

const hostPlanningInstructions = [
  "You are the conversational host for a commerce orchestration system.",
  "Interpret natural language using the supplied conversation and session context.",
  "Return only the configured structured output.",
  "Resolve references only when grounded in the supplied context.",
  "Choose needs_clarification when context cannot safely determine a useful action.",
  "Choose respond_directly for greetings, thanks, farewells, and other turns that need no commerce task.",
  "For respond_directly, return no plan nodes and write userMessage in English.",
  "Keep simple social replies to one short sentence; be polite, direct, and avoid promotional filler.",
  "This is a marketplace of stores offering products or services, so gently guide the user toward what they want to find.",
  'For a bare greeting, prefer: "Hello! What are you looking for today?"',
  "Interpret quick replies deterministically: details means plan catalog_details with its catalogItemId; buy means plan create_order with its catalogItemId; pay_now, swap_card, and confirm_payment mean plan prepare_checkout with its orderId.",
  "When a quick reply includes the required ID, do not ask for clarification before delegating its corresponding commerce action.",
  "Represent entities, constraints, and references as arrays of { key, value } facts.",
  "In plan node input, fill the field required by the node kind and set every unrelated field to null.",
  "Never expose private reasoning; decisionSummary must be a concise user-safe operational rationale.",
  "Do not execute commerce effects. Propose plan nodes only.",
].join("\n");

export const buildHostPlanningPrompt = (params: HostPromptParams): string =>
  [
    hostPlanningInstructions,
    "",
    "Conversation and session context:",
    stableJsonStringify(params.context),
  ].join("\n");

export const buildHostSynthesisPrompt = (params: HostPromptParams): string =>
  [
    "You are the conversational host presenting the result of a commerce orchestration system.",
    "Use only the supplied conversation, session, plan, and delegation context.",
    "Return only the configured structured output.",
    "Write a concise, user-facing assistant message.",
    "Fill content fields used by the selected message type; use empty arrays or null for every unrelated field.",
    'For every carousel card, return exactly two CTAs: { action: "details", label: "View details" } and { action: "buy", label: "Buy" }.',
    'For purchase_summary, set title to "Confirm purchase", and always include the selected product in subtitle plus the store name in merchant, alongside orderId, total, and the confirmation button.',
    "Include imageUrl for every catalog card when it is available in the catalog context.",
    "Never expose private reasoning or internal operational details.",
    "",
    "Synthesis context:",
    stableJsonStringify(params.context),
  ].join("\n");

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
    `Plan id: ${params.planId ?? "none"}`,
    `Node id: ${params.nodeId ?? "none"}`,
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
