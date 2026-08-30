export type PlanNodeStatus =
  | "pending"
  | "ready"
  | "running"
  | "done"
  | "failed"
  | "blocked";

export interface PlanNode {
  id: string;
  kind: string;
  deps: string[];
  status: PlanNodeStatus;
  jobId?: string;
}

export interface SessionPlan {
  version: 1;
  createdAt: string;
  updatedAt: string;
  nodes: PlanNode[];
}

const nowIso = () => new Date().toISOString();

const PLAN_NODE_IDS = ["host_plan", "rank_catalog", "compose_reply"] as const;

const isPlanNodeStatus = (value: unknown): value is PlanNodeStatus =>
  value === "pending" ||
  value === "ready" ||
  value === "running" ||
  value === "done" ||
  value === "failed" ||
  value === "blocked";

const isPlanNode = (value: unknown): value is PlanNode => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const node = value as Partial<PlanNode>;
  return (
    typeof node.id === "string" &&
    typeof node.kind === "string" &&
    Array.isArray(node.deps) &&
    node.deps.every((dep) => typeof dep === "string") &&
    isPlanNodeStatus(node.status)
  );
};
const normalizeIntent = (intent: string) =>
  intent === "unknown" || intent.length === 0 ? "generic_request" : intent;

export const buildPlan = (intent: string): SessionPlan => {
  const ts = nowIso();

  const nodes: PlanNode[] = [
    {
      deps: [],
      id: "host_plan",
      kind: "host_plan",
      status: "ready",
    },
    {
      deps: ["host_plan"],
      id: "rank_catalog",
      kind: "rank_catalog",
      status: intent === "generic_request" ? "blocked" : "pending",
    },
    {
      deps: ["rank_catalog"],
      id: "compose_reply",
      kind: "compose_reply",
      status: "pending",
    },
  ];

  return { createdAt: ts, nodes, updatedAt: ts, version: 1 };
};

export const normalizePlanJson = (
  planJson: string,
  intent: string
): SessionPlan => {
  const fallback = buildPlan(normalizeIntent(intent));
  let parsed: unknown;

  try {
    parsed = JSON.parse(planJson);
  } catch {
    return fallback;
  }

  if (!parsed || typeof parsed !== "object") {
    return fallback;
  }

  const existing = parsed as Partial<SessionPlan> & {
    nodes?: unknown;
  };
  if (!Array.isArray(existing.nodes)) {
    return fallback;
  }

  const validNodes = existing.nodes.filter(isPlanNode);
  const validNodeIds = new Set(validNodes.map((node) => node.id));
  const dependencySafeNodes = validNodes.filter((node) =>
    node.deps.every((dependency) => validNodeIds.has(dependency))
  );
  const existingById = new Map(
    dependencySafeNodes.map((node) => [node.id, node])
  );
  const missingNodes = fallback.nodes.filter(
    (node) => !existingById.has(node.id)
  );
  const nodes = [...dependencySafeNodes, ...missingNodes].toSorted((a, b) => {
    const aIndex = PLAN_NODE_IDS.indexOf(
      a.id as (typeof PLAN_NODE_IDS)[number]
    );
    const bIndex = PLAN_NODE_IDS.indexOf(
      b.id as (typeof PLAN_NODE_IDS)[number]
    );
    return (
      (aIndex === -1 ? PLAN_NODE_IDS.length : aIndex) -
      (bIndex === -1 ? PLAN_NODE_IDS.length : bIndex)
    );
  });

  return {
    ...existing,
    createdAt:
      typeof existing.createdAt === "string"
        ? existing.createdAt
        : fallback.createdAt,
    nodes,
    updatedAt:
      typeof existing.updatedAt === "string"
        ? existing.updatedAt
        : fallback.updatedAt,
    version: 1,
  };
};
