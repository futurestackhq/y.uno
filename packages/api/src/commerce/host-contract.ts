import { z } from "zod";

const planNodeKinds = [
  "catalog_search",
  "catalog_details",
  "create_order",
  "prepare_checkout",
] as const;

export const hostPlanNodeSchema = z.object({
  dependsOn: z.array(z.string().min(1)).max(8),
  id: z.string().min(1).max(80),
  input: z.record(z.string(), z.unknown()),
  kind: z.enum(planNodeKinds),
  objective: z.string().min(1).max(600),
  successCriteria: z.array(z.string().min(1).max(200)).max(8),
});

const planSchema = z
  .object({
    goal: z.string().min(1).max(600),
    nodes: z.array(hostPlanNodeSchema).max(8),
  })
  .superRefine((plan, context) => {
    const ids = new Set<string>();
    for (const node of plan.nodes) {
      if (ids.has(node.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate plan node id: ${node.id}`,
          path: ["nodes"],
        });
      }
      ids.add(node.id);
      if (node.dependsOn.includes(node.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Plan node cannot depend on itself: ${node.id}`,
          path: ["nodes"],
        });
      }
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const dependencies = new Map(
      plan.nodes.map((node) => [node.id, node.dependsOn])
    );
    const visit = (id: string): void => {
      if (visiting.has(id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Plan dependencies must be acyclic",
          path: ["nodes"],
        });
        return;
      }
      if (visited.has(id)) {
        return;
      }
      visiting.add(id);
      for (const dependency of dependencies.get(id) ?? []) {
        if (dependencies.has(dependency)) {
          visit(dependency);
        }
      }
      visiting.delete(id);
      visited.add(id);
    };
    for (const node of plan.nodes) {
      visit(node.id);
    }
  });

export const hostPlanDecisionSchema = z.object({
  conversation: z.object({
    missingInformation: z.array(z.string().min(1).max(120)).max(8),
    question: z.string().min(1).max(500).nullable(),
    state: z.enum([
      "needs_clarification",
      "ready_to_delegate",
      "waiting_result",
    ]),
  }),
  decisionSummary: z.string().min(1).max(1000),
  plan: planSchema,
  session: z.object({
    action: z.enum(["continue", "create", "close"]),
    sessionId: z.string().min(1).nullable(),
  }),
  understanding: z.object({
    confidence: z.number().min(0).max(1),
    constraints: z.record(z.string(), z.unknown()),
    entities: z.record(z.string(), z.unknown()),
    intent: z.string().min(1).max(120),
    references: z.record(z.string(), z.unknown()),
    summary: z.string().min(1).max(1000),
  }),
  userMessage: z.string().min(1).max(2000).nullable(),
});

export const hostSynthesisDecisionSchema = z.object({
  assistantMessage: z.object({
    content: z.record(z.string(), z.unknown()),
    type: z.enum(["text", "carousel", "purchase_summary"]),
  }),
  nextAction: z.enum(["await_user", "delegate", "complete"]),
});

export type HostPlanDecision = z.infer<typeof hostPlanDecisionSchema>;
export type HostPlanNode = z.infer<typeof hostPlanNodeSchema>;
export type HostSynthesisDecision = z.infer<typeof hostSynthesisDecisionSchema>;
