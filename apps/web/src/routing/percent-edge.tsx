import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";

export const PercentEdge = ({
  id,
  label,
  sourcePosition,
  sourceX,
  sourceY,
  style,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan text-sm font-bold"
            style={{
              pointerEvents: "all",
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
};
