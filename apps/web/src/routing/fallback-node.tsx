import type { Node, NodeProps } from "@xyflow/react";

import { useFlowActions } from "./flow-actions-context";
import type { FallbackNodeData } from "./flow-graph";
import { NodeFlyout } from "./node-flyout";
import { NodeHandleButton, NodeTargetHandle } from "./node-handle-button";

export type FallbackFlowNode = Node<
  FallbackNodeData & {
    connectedHandles: string[];
    menuMode: "actions" | "outcomes" | null;
  },
  "fallback"
>;

export const FallbackNode = ({ data, id }: NodeProps<FallbackFlowNode>) => {
  const { onHandleClick } = useFlowActions();
  const connected = data.connectedHandles.includes("out");

  return (
    <div className="yuno-node-shadow relative flex cursor-pointer rounded-lg bg-white">
      <NodeFlyout id={id} menuMode={data.menuMode} />
      <NodeTargetHandle />
      <div className="flex h-[135px] w-[375px] items-center justify-center">
        <p className="text-center text-base font-bold">{data.label}</p>
      </div>
      <div className="yuno-node-rail">
        <NodeHandleButton
          connected={connected}
          onHandleClick={(sourceHandle) => {
            onHandleClick(id, sourceHandle);
          }}
          sourceHandle="out"
        />
      </div>
    </div>
  );
};
