import { NodeToolbar, Position } from "@xyflow/react";

import { AddStepDialog } from "./add-step-dialog";
import { useFlowActions } from "./flow-actions-context";
import { HandleActionMenu } from "./handle-action-menu";

interface NodeFlyoutProps {
  id: string;
  menuMode: "actions" | "outcomes" | null;
}

export const NodeFlyout = ({ id, menuMode }: NodeFlyoutProps) => {
  const { onMenuAction, onSelectOutcome } = useFlowActions();

  if (!menuMode) {
    return null;
  }

  return (
    <NodeToolbar isVisible nodeId={id} offset={16} position={Position.Right}>
      {menuMode === "actions" ? (
        <HandleActionMenu onAction={onMenuAction} />
      ) : (
        <AddStepDialog onSelectOutcome={onSelectOutcome} />
      )}
    </NodeToolbar>
  );
};
