import { Badge } from "@hackathon/ui/components/badge";

import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@/components/ai-elements/task";

interface PlanNode {
  deps: string[];
  id: string;
  jobId?: string;
  kind: string;
  status: "pending" | "ready" | "running" | "done" | "failed" | "blocked";
}

interface SessionPlan {
  nodes: PlanNode[];
  version: number;
}

const isSessionPlan = (value: unknown): value is SessionPlan => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const plan = value as { nodes?: unknown; version?: unknown };
  return typeof plan.version === "number" && Array.isArray(plan.nodes);
};

export const PlanAccordion = (props: { plan: unknown; status?: string }) => {
  if (!isSessionPlan(props.plan)) {
    return (
      <Task className="rounded border" defaultOpen={false}>
        <TaskTrigger className="px-3 py-2" title="Plan unavailable" />
      </Task>
    );
  }

  const counts = {
    blocked: 0,
    failed: 0,
    ready: 0,
    running: 0,
  };
  for (const node of props.plan.nodes) {
    if (node.status in counts) {
      counts[node.status as keyof typeof counts] += 1;
    }
  }

  return (
    <Task className="rounded border" defaultOpen={false}>
      <TaskTrigger
        className="px-3 py-2"
        title={`${props.status === "superseded" ? "Plano substituído · " : ""}Plan · nodes ${props.plan.nodes.length} · ready ${counts.ready} · blocked ${counts.blocked} · running ${counts.running} · failed ${counts.failed}`}
      />
      <TaskContent className="border-t px-2 pb-2">
        {props.plan.nodes.map((node) => (
          <details className="bg-background/50 rounded border" key={node.id}>
            <summary className="cursor-pointer px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{node.kind}</span>
                <Badge variant="outline">{node.status}</Badge>
              </div>
              <div className="text-muted-foreground mt-1">{node.id}</div>
            </summary>
            <div className="space-y-2 border-t p-3 text-xs">
              <TaskItem>
                <span className="font-medium">Deps: </span>
                <span className="text-muted-foreground">
                  {node.deps.length > 0 ? node.deps.join(", ") : "none"}
                </span>
              </TaskItem>
              <TaskItem>
                <span className="font-medium">Job: </span>
                <span className="text-muted-foreground">
                  {node.jobId ?? "not linked"}
                </span>
              </TaskItem>
            </div>
          </details>
        ))}
      </TaskContent>
    </Task>
  );
};
