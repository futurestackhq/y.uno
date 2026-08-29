import { cn } from "@hackathon/ui/lib/utils";
import { Handle, Position } from "@xyflow/react";
import type { CSSProperties } from "react";

import { PhosphorCaretCircleRight, PhosphorMinusCircle } from "./phosphor";

interface NodeHandleButtonProps {
  connected: boolean;
  onHandleClick: (sourceHandle: string) => void;
  sourceHandle: string;
  style?: CSSProperties;
}

export const NodeTargetHandle = () => (
  <Handle
    className="!size-2 !border-0 !bg-transparent opacity-0"
    isConnectable={false}
    isConnectableEnd={false}
    isConnectableStart={false}
    position={Position.Left}
    type="target"
  />
);

export const NodeHandleButton = ({
  connected,
  onHandleClick,
  sourceHandle,
  style,
}: NodeHandleButtonProps) => (
  <>
    <Handle
      className="pointer-events-none !right-[-14px] !size-8 !border-0 !bg-transparent opacity-0"
      id={sourceHandle}
      isConnectable={false}
      isConnectableEnd={false}
      isConnectableStart={false}
      position={Position.Right}
      style={style}
      type="source"
    />
    <button
      className={cn(
        "yuno-handle-btn nodrag nopan relative z-10",
        connected && "yuno-handle-btn-connected"
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onHandleClick(sourceHandle);
      }}
      type="button"
    >
      {connected ? (
        <PhosphorMinusCircle size={24} />
      ) : (
        <PhosphorCaretCircleRight size={24} />
      )}
    </button>
  </>
);
