import { Panel, ReactFlow } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AddConditionSheet } from "./add-condition-sheet";
import type { StepOutcome } from "./add-step-dialog";
import { ConditionNode } from "./condition-node";
import { FallbackNode } from "./fallback-node";
import { FlowActionsContext } from "./flow-actions-context";
import type { FlowGraph } from "./flow-graph";
import {
  NODE_IDS,
  applyCardBrandCondition,
  applyStripeDeclinedFailover,
  applySucceededStep,
  connectedHandlesFor,
  createInitialGraph,
} from "./flow-graph";
import type { HandleAction } from "./handle-action-menu";
import { PercentEdge } from "./percent-edge";
import { PhosphorPlusCircle } from "./phosphor";
import { ProviderNode } from "./provider-node";

import "@xyflow/react/dist/style.css";

const nodeTypes = {
  condition: ConditionNode,
  fallback: FallbackNode,
  provider: ProviderNode,
};

const edgeTypes = {
  percent: PercentEdge,
};

const toFlowNodes = (
  graph: FlowGraph,
  menuNodeId: string | null,
  menuMode: "actions" | "outcomes" | null
): Node[] =>
  graph.nodes.map((node) => ({
    data: {
      ...node.data,
      connectedHandles: [...connectedHandlesFor(graph, node.id)],
      menuMode: menuNodeId === node.id ? menuMode : null,
    },
    id: node.id,
    position: node.position,
    type: node.type,
  }));

const toFlowEdges = (graph: FlowGraph): Edge[] =>
  graph.edges.map((edge) => ({
    id: edge.id,
    label: edge.label,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    style: { stroke: "#c5cad3", strokeWidth: 1.5 },
    target: edge.target,
    type: edge.label ? "percent" : "smoothstep",
  }));

export const FlowCanvas = () => {
  const [graph, setGraph] = useState<FlowGraph>(createInitialGraph);
  const [conditionOpen, setConditionOpen] = useState(false);
  const [menuNodeId, setMenuNodeId] = useState<string | null>(null);
  const [menuMode, setMenuMode] = useState<"actions" | "outcomes" | null>(null);
  const [stepSourceId, setStepSourceId] = useState<string>(NODE_IDS.condition);

  const nodes = useMemo(
    () => toFlowNodes(graph, menuNodeId, menuMode),
    [graph, menuMode, menuNodeId]
  );
  const edges = useMemo(() => toFlowEdges(graph), [graph]);

  const actions = useMemo(
    () => ({
      menuMode,
      menuNodeId,
      onHandleClick: (nodeId: string, handleId: string) => {
        const isStripeDecline =
          nodeId === NODE_IDS.stripe60 &&
          (handleId === "declined" || handleId === "error");
        if (isStripeDecline) {
          setGraph((current) => applyStripeDeclinedFailover(current));
          setMenuMode(null);
          setMenuNodeId(null);
          return;
        }
        setMenuNodeId(nodeId);
        setMenuMode("actions");
      },
      onMenuAction: (action: HandleAction) => {
        if (action === "Add step") {
          setStepSourceId(menuNodeId ?? NODE_IDS.condition);
          setMenuMode("outcomes");
          return;
        }
        toast("Not wired in this mock");
        setMenuMode(null);
        setMenuNodeId(null);
      },
      onSelectOutcome: (outcome: StepOutcome) => {
        if (outcome === "Succedded") {
          setGraph((current) => applySucceededStep(current, stepSourceId));
        } else {
          toast("Not wired in this mock");
        }
        setMenuMode(null);
        setMenuNodeId(null);
      },
    }),
    [menuMode, menuNodeId, stepSourceId]
  );

  return (
    <FlowActionsContext value={actions}>
      <div className="min-h-0 flex-1 bg-[var(--canvas)]">
        <ReactFlow
          className="h-full"
          defaultViewport={{ x: 40, y: 40, zoom: 0.85 }}
          edges={edges}
          edgeTypes={edgeTypes}
          fitView
          nodes={nodes}
          connectOnClick={false}
          nodesConnectable={false}
          nodeTypes={nodeTypes}
          onPaneClick={(event) => {
            const { target } = event;
            if (
              target instanceof Element &&
              target.closest(
                ".react-flow__handle, .yuno-handle-btn, .yuno-handle-menu"
              )
            ) {
              return;
            }
            setMenuMode(null);
            setMenuNodeId(null);
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Panel position="top-left">
            <button
              className="yuno-btn-contained flex items-center gap-2"
              onClick={() => {
                setConditionOpen(true);
              }}
              type="button"
            >
              <PhosphorPlusCircle />
              Add new condition
            </button>
          </Panel>
        </ReactFlow>
      </div>
      <AddConditionSheet
        onOpenChange={setConditionOpen}
        onSave={() => {
          setGraph((current) => applyCardBrandCondition(current));
        }}
        open={conditionOpen}
      />
    </FlowActionsContext>
  );
};
