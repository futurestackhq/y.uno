import { z } from "zod";

const planNodeKinds = [
  "catalog_search",
  "catalog_details",
  "create_order",
  "prepare_checkout",
] as const;

const conversationSchema = z.object({
  missingInformation: z.array(z.string().min(1).max(120)).max(8),
  question: z.string().min(1).max(500).nullable(),
  state: z.enum([
    "needs_clarification",
    "ready_to_delegate",
    "respond_directly",
    "waiting_result",
  ]),
});

const sessionDecisionSchema = z.object({
  action: z.enum(["continue", "create", "close"]),
  sessionId: z.string().min(1).nullable(),
});

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
      for (const dependency of node.dependsOn) {
        if (!plan.nodes.some((candidate) => candidate.id === dependency)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown plan node dependency: ${dependency}`,
            path: ["nodes"],
          });
        }
      }
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

const hostPlanNodeOutputSchema = z
  .object({
    dependsOn: z.array(z.string().min(1)).max(8),
    id: z.string().min(1).max(80),
    input: z.object({
      catalogItemId: z.string().min(1).max(200).nullable(),
      itemId: z.string().min(1).max(200).nullable(),
      orderId: z.string().min(1).max(200).nullable(),
      quantity: z.number().int().positive().nullable(),
      query: z.string().min(1).max(500).nullable(),
    }),
    kind: z.enum(planNodeKinds),
    objective: z.string().min(1).max(600),
    successCriteria: z.array(z.string().min(1).max(200)).max(8),
  })
  .superRefine((node, context) => {
    const requiredInputByKind = {
      catalog_details: node.input.itemId,
      catalog_search: node.input.query,
      create_order: node.input.catalogItemId,
      prepare_checkout: node.input.orderId,
    } as const;
    if (requiredInputByKind[node.kind] === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Missing required input for ${node.kind}`,
        path: ["input"],
      });
    }
  });

const hostFactSchema = z.object({
  key: z.string().min(1).max(120),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});

const validateConversationPlanConsistency = (
  decision: {
    conversation: { state: string };
    plan: { nodes: unknown[] };
    userMessage: string | null;
  },
  context: z.RefinementCtx
): void => {
  if (
    ["needs_clarification", "respond_directly"].includes(
      decision.conversation.state
    ) &&
    decision.userMessage === null
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        decision.conversation.state === "respond_directly"
          ? "Direct responses require a user message"
          : "Clarifications require a user message",
      path: ["userMessage"],
    });
  }
  if (
    decision.conversation.state === "respond_directly" &&
    decision.plan.nodes.length > 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Direct responses cannot delegate plan nodes",
      path: ["plan", "nodes"],
    });
  }
  if (
    decision.conversation.state === "ready_to_delegate" &&
    decision.plan.nodes.length === 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Delegation requires at least one plan node",
      path: ["plan", "nodes"],
    });
  }
};

export const hostPlanOutputSchema = z
  .object({
    conversation: conversationSchema,
    decisionSummary: z.string().min(1).max(1000),
    plan: z.object({
      goal: z.string().min(1).max(600),
      nodes: z.array(hostPlanNodeOutputSchema).max(8),
    }),
    session: sessionDecisionSchema,
    understanding: z.object({
      confidence: z.number().min(0).max(1),
      constraints: z.array(hostFactSchema).max(32),
      entities: z.array(hostFactSchema).max(32),
      intent: z.string().min(1).max(120),
      references: z.array(hostFactSchema).max(32),
      summary: z.string().min(1).max(1000),
    }),
    userMessage: z.string().min(1).max(2000).nullable(),
  })
  .superRefine(validateConversationPlanConsistency);

export const hostPlanDecisionSchema = z
  .object({
    conversation: conversationSchema,
    decisionSummary: z.string().min(1).max(1000),
    plan: planSchema,
    session: sessionDecisionSchema,
    understanding: z.object({
      confidence: z.number().min(0).max(1),
      constraints: z.record(z.string(), z.unknown()),
      entities: z.record(z.string(), z.unknown()),
      intent: z.string().min(1).max(120),
      references: z.record(z.string(), z.unknown()),
      summary: z.string().min(1).max(1000),
    }),
    userMessage: z.string().min(1).max(2000).nullable(),
  })
  .superRefine(validateConversationPlanConsistency);

const hostActionSchema = z.object({
  action: z.string().min(1).max(120),
  label: z.string().min(1).max(120),
});

export const hostSynthesisOutputSchema = z
  .object({
    assistantMessage: z.object({
      content: z.object({
        buttons: z.array(hostActionSchema).max(4),
        cards: z
          .array(
            z.object({
              catalogItemId: z.string().min(1).max(200).nullable(),
              ctas: z.array(hostActionSchema).max(4),
              id: z.string().min(1).max(200),
              merchant: z.string().min(1).max(200),
              price: z.string().min(1).max(120),
              subtitle: z.string().max(500).nullable(),
              title: z.string().min(1).max(500),
            })
          )
          .max(12),
        merchant: z.string().min(1).max(200).nullable(),
        orderId: z.string().min(1).max(200).nullable(),
        paymentHint: z.string().max(500).nullable(),
        subtitle: z.string().max(500).nullable(),
        text: z.string().min(1).max(4000).nullable(),
        title: z.string().min(1).max(500).nullable(),
        total: z.string().min(1).max(120).nullable(),
      }),
      type: z.enum(["text", "carousel", "purchase_summary"]),
    }),
    nextAction: z.enum(["await_user", "delegate", "complete"]),
  })
  .superRefine((decision, context) => {
    const { content, type } = decision.assistantMessage;
    const hasRequiredContent =
      (type === "text" && content.text !== null) ||
      (type === "carousel" && content.cards.length > 0) ||
      (type === "purchase_summary" &&
        content.buttons.length > 0 &&
        content.merchant !== null &&
        content.orderId !== null &&
        content.title !== null &&
        content.total !== null);
    if (!hasRequiredContent) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Missing required content for ${type}`,
        path: ["assistantMessage", "content"],
      });
    }
  });

export const hostSynthesisDecisionSchema = z.object({
  assistantMessage: z.object({
    content: z.record(z.string(), z.unknown()),
    type: z.enum(["text", "carousel", "purchase_summary"]),
  }),
  nextAction: z.enum(["await_user", "delegate", "complete"]),
});

const factsToRecord = (
  facts: z.infer<typeof hostFactSchema>[]
): Record<string, string | number | boolean | null> =>
  Object.fromEntries(facts.map(({ key, value }) => [key, value]));

export const decodeHostPlanOutput = (
  output: z.infer<typeof hostPlanOutputSchema>
): HostPlanDecision =>
  hostPlanDecisionSchema.parse({
    ...output,
    understanding: {
      ...output.understanding,
      constraints: factsToRecord(output.understanding.constraints),
      entities: factsToRecord(output.understanding.entities),
      references: factsToRecord(output.understanding.references),
    },
  });

export const decodeHostSynthesisOutput = (
  output: z.infer<typeof hostSynthesisOutputSchema>
): HostSynthesisDecision => hostSynthesisDecisionSchema.parse(output);

export type HostPlanDecision = z.infer<typeof hostPlanDecisionSchema>;
export type HostPlanNode = z.infer<typeof hostPlanNodeSchema>;
export type HostSynthesisDecision = z.infer<typeof hostSynthesisDecisionSchema>;
