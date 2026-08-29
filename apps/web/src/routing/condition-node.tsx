import type { Node, NodeProps } from "@xyflow/react";

import { useFlowActions } from "./flow-actions-context";
import type { ConditionNodeData } from "./flow-graph";
import { NodeFlyout } from "./node-flyout";
import { NodeHandleButton, NodeTargetHandle } from "./node-handle-button";
import {
  PhosphorBellSlash,
  PhosphorCreditCard,
  PhosphorDotsThreeVertical,
} from "./phosphor";

export type ConditionFlowNode = Node<
  ConditionNodeData & {
    connectedHandles: string[];
    menuMode: "actions" | "outcomes" | null;
  },
  "condition"
>;

export const ConditionNode = ({ data, id }: NodeProps<ConditionFlowNode>) => {
  const { onHandleClick } = useFlowActions();
  const connected = data.connectedHandles.includes("out");

  return (
    <div className="yuno-node-shadow relative flex rounded-lg bg-white">
      <NodeFlyout id={id} menuMode={data.menuMode} />
      <NodeTargetHandle />
      <div className="flex p-4">
        <div className="mr-4 w-[250px] rounded-lg border border-[#eceff2] bg-white p-4">
          <div className="mb-4 flex flex-col gap-2">
            <div className="text-primary flex size-8 items-center justify-center rounded-full bg-[#e3eeff]">
              <PhosphorCreditCard size={16} />
            </div>
            <p className="text-base font-bold">{data.title}</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="yuno-chip yuno-chip-primary">{data.operator}</span>
            <span className="yuno-chip">{data.value}</span>
          </div>
        </div>
        <div className="text-muted-foreground flex flex-col">
          <PhosphorDotsThreeVertical />
          <div className="mt-3">
            <PhosphorBellSlash />
          </div>
        </div>
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
