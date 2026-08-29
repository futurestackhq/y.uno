import type { Node, NodeProps } from "@xyflow/react";

import { useFlowActions } from "./flow-actions-context";
import type { OutcomeId, ProviderNodeData } from "./flow-graph";
import { NodeFlyout } from "./node-flyout";
import { NodeHandleButton, NodeTargetHandle } from "./node-handle-button";
import {
  PhosphorCheckCircle,
  PhosphorClock,
  PhosphorProhibit,
  PhosphorWarningCircle,
} from "./phosphor";

export type ProviderFlowNode = Node<
  ProviderNodeData & {
    connectedHandles: string[];
    menuMode: "actions" | "outcomes" | null;
  },
  "provider"
>;

const OUTCOMES: {
  fill: string;
  icon: typeof PhosphorCheckCircle;
  id: OutcomeId;
  label: string;
}[] = [
  {
    fill: "#12823B",
    icon: PhosphorCheckCircle,
    id: "succeeded",
    label: "Succedded",
  },
  {
    fill: "#086BFF",
    icon: PhosphorClock,
    id: "pending",
    label: "Pending",
  },
  {
    fill: "#E07A3E",
    icon: PhosphorProhibit,
    id: "declined",
    label: "Declined",
  },
  {
    fill: "#D13B3B",
    icon: PhosphorWarningCircle,
    id: "error",
    label: "Error / Paused",
  },
];

const HEADER_HEIGHT = 116;
const ROW_HEIGHT = 33;

export const ProviderNode = ({ data, id }: NodeProps<ProviderFlowNode>) => {
  const { onHandleClick } = useFlowActions();

  return (
    <div className="yuno-node-shadow relative w-[200px] cursor-pointer rounded-lg bg-white">
      <NodeFlyout id={id} menuMode={data.menuMode} />
      <NodeTargetHandle />
      <div className="flex flex-col items-center px-4 py-4">
        <img
          alt=""
          className="size-10 object-contain"
          height={40}
          src={`/providers/${data.provider}.png`}
          width={40}
        />
        <p className="mt-2 text-base">{data.name}</p>
        <p className="text-muted-foreground text-xs">{data.environment}</p>
      </div>
      <div className="flex flex-col">
        {OUTCOMES.map((outcome, index) => {
          const Icon = outcome.icon;
          const connected = data.connectedHandles.includes(outcome.id);
          return (
            <div className="yuno-provider-row relative" key={outcome.id}>
              <span className="flex items-center">
                <Icon fill={outcome.fill} />
                <span className="ml-2 text-xs">{outcome.label}</span>
              </span>
              <NodeHandleButton
                connected={connected}
                onHandleClick={(sourceHandle) => {
                  onHandleClick(id, sourceHandle);
                }}
                sourceHandle={outcome.id}
                style={{
                  top: HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
