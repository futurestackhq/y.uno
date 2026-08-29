export const NODE_IDS = {
  ayden40: "psp-ayden-40",
  aydenFailover: "psp-ayden-failover",
  condition: "condition-card-brand",
  cybersource: "psp-cybersource",
  fallback: "fallback",
  stripe60: "psp-stripe-60",
  stripeFailover: "psp-stripe-failover",
} as const;

export type OutcomeId = "succeeded" | "pending" | "declined" | "error";

export type ProviderKey = "cybersource" | "stripe" | "ayden";

export type FlowNodeType = "fallback" | "condition" | "provider";

export interface FallbackNodeData extends Record<string, unknown> {
  kind: "fallback";
  label: string;
}

export interface ConditionNodeData extends Record<string, unknown> {
  kind: "condition";
  operator: string;
  title: string;
  value: string;
}

export interface ProviderNodeData extends Record<string, unknown> {
  environment: string;
  kind: "provider";
  name: string;
  provider: ProviderKey;
}

export type FlowNodeData =
  | FallbackNodeData
  | ConditionNodeData
  | ProviderNodeData;

export interface FlowNodeDef {
  data: FlowNodeData;
  id: string;
  position: { x: number; y: number };
  type: FlowNodeType;
}

export interface FlowEdgeDef {
  id: string;
  label?: string;
  source: string;
  sourceHandle: OutcomeId | "out";
  target: string;
}

export interface FlowGraph {
  edges: FlowEdgeDef[];
  nodes: FlowNodeDef[];
}

const PROVIDERS: Record<ProviderKey, { environment: string; name: string }> = {
  ayden: { environment: "Test", name: "Ayden" },
  cybersource: { environment: "Test", name: "Cybersource" },
  stripe: { environment: "Test", name: "Stripe" },
};

const providerNode = (
  id: string,
  provider: ProviderKey,
  position: { x: number; y: number }
): FlowNodeDef => ({
  data: { kind: "provider", provider, ...PROVIDERS[provider] },
  id,
  position,
  type: "provider",
});

export const createInitialGraph = (): FlowGraph => ({
  edges: [],
  nodes: [
    {
      data: { kind: "fallback", label: "All other payments" },
      id: NODE_IDS.fallback,
      position: { x: 80, y: 160 },
      type: "fallback",
    },
  ],
});

export const applyCardBrandCondition = (graph: FlowGraph): FlowGraph => {
  const withoutFallback = graph.nodes.filter(
    (node) => node.id !== NODE_IDS.fallback
  );
  const hasCondition = withoutFallback.some(
    (node) => node.id === NODE_IDS.condition
  );

  if (hasCondition) {
    return { ...graph, nodes: withoutFallback };
  }

  return {
    edges: graph.edges,
    nodes: [
      ...withoutFallback,
      {
        data: {
          kind: "condition",
          operator: "Equal",
          title: "Card brand",
          value: "Mastercard",
        },
        id: NODE_IDS.condition,
        position: { x: 40, y: 140 },
        type: "condition",
      },
    ],
  };
};

export const applySucceededStep = (
  graph: FlowGraph,
  sourceId: string = NODE_IDS.condition
): FlowGraph => {
  const hasCybersource = graph.nodes.some(
    (node) => node.id === NODE_IDS.cybersource
  );

  if (hasCybersource) {
    return graph;
  }

  const sourceNode = graph.nodes.find((node) => node.id === sourceId);
  const sourceHandle = sourceNode?.type === "provider" ? "succeeded" : "out";

  return {
    edges: [
      ...graph.edges,
      {
        id: "e-condition-cybersource",
        source: sourceId,
        sourceHandle,
        target: NODE_IDS.cybersource,
      },
      {
        id: "e-cybersource-stripe",
        label: "60%",
        source: NODE_IDS.cybersource,
        sourceHandle: "succeeded",
        target: NODE_IDS.stripe60,
      },
      {
        id: "e-cybersource-ayden",
        label: "40%",
        source: NODE_IDS.cybersource,
        sourceHandle: "succeeded",
        target: NODE_IDS.ayden40,
      },
    ],
    nodes: [
      ...graph.nodes,
      providerNode(NODE_IDS.cybersource, "cybersource", { x: 380, y: 80 }),
      providerNode(NODE_IDS.stripe60, "stripe", { x: 720, y: 40 }),
      providerNode(NODE_IDS.ayden40, "ayden", { x: 720, y: 360 }),
    ],
  };
};

export const applyStripeDeclinedFailover = (graph: FlowGraph): FlowGraph => {
  const hasFailover = graph.nodes.some(
    (node) => node.id === NODE_IDS.aydenFailover
  );

  if (hasFailover) {
    return graph;
  }

  return {
    edges: [
      ...graph.edges,
      {
        id: "e-stripe-declined-ayden",
        source: NODE_IDS.stripe60,
        sourceHandle: "declined",
        target: NODE_IDS.aydenFailover,
      },
      {
        id: "e-stripe-error-ayden",
        source: NODE_IDS.stripe60,
        sourceHandle: "error",
        target: NODE_IDS.aydenFailover,
      },
      {
        id: "e-ayden-declined-stripe",
        source: NODE_IDS.ayden40,
        sourceHandle: "declined",
        target: NODE_IDS.stripeFailover,
      },
      {
        id: "e-ayden-error-stripe",
        source: NODE_IDS.ayden40,
        sourceHandle: "error",
        target: NODE_IDS.stripeFailover,
      },
    ],
    nodes: [
      ...graph.nodes,
      providerNode(NODE_IDS.aydenFailover, "ayden", { x: 1060, y: 40 }),
      providerNode(NODE_IDS.stripeFailover, "stripe", { x: 1060, y: 360 }),
    ],
  };
};

export const connectedHandlesFor = (
  graph: FlowGraph,
  nodeId: string
): Set<string> => {
  const handles = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.source === nodeId) {
      handles.add(edge.sourceHandle);
    }
  }
  return handles;
};
