import { createContext, use } from "react";

import type { StepOutcome } from "./add-step-dialog";
import type { HandleAction } from "./handle-action-menu";

interface FlowActions {
  menuNodeId: string | null;
  menuMode: "actions" | "outcomes" | null;
  onHandleClick: (nodeId: string, handleId: string) => void;
  onMenuAction: (action: HandleAction) => void;
  onSelectOutcome: (outcome: StepOutcome) => void;
}

export const FlowActionsContext = createContext<FlowActions | null>(null);

export const useFlowActions = (): FlowActions => {
  const value = use(FlowActionsContext);
  if (!value) {
    throw new Error("useFlowActions must be used inside FlowActionsContext");
  }
  return value;
};
