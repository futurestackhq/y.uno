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

export const buildPlan = (intent: string): SessionPlan => {
  const ts = nowIso();

  const nodes: PlanNode[] = [
    {
      deps: [],
      id: "classify_intent",
      kind: "classify_intent",
      status: "ready",
    },
    {
      deps: ["classify_intent"],
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
