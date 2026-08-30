import { Badge } from "@hackathon/ui/components/badge";

import type { DelegationJob } from "./delegations-accordion";
import { DelegationsAccordion } from "./delegations-accordion";
import { PlanAccordion } from "./plan-accordion";

interface SessionRow {
  id: string;
  intent: string;
  revision: number;
  status: string;
  updatedAt: string;
}

interface SessionInspector {
  jobCounts: {
    done: number;
    failed: number;
    queued: number;
    running: number;
  };
  jobs: DelegationJob[];
  plan?: unknown;
  currentHostPlan: {
    baseRevision: number;
    decision?: unknown;
    decisionSummary: string;
    id: string;
    status: string;
  } | null;
  session: SessionRow;
}

export const SessionInspectorPanel = (props: {
  inspector: SessionInspector | null | undefined;
  isLoading?: boolean;
  onSelectSessionId: (id: string) => void;
  selectedSessionId: string | null;
  sessions: SessionRow[];
}) => {
  const {
    inspector,
    isLoading = false,
    onSelectSessionId,
    selectedSessionId,
    sessions,
  } = props;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-3 text-sm font-medium">
        Session Inspector
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="mb-3 space-y-1">
          {sessions.map((session) => (
            <button
              className={
                selectedSessionId === session.id
                  ? "w-full rounded border bg-[rgb(62_79_224/8%)] px-3 py-2 text-left text-xs"
                  : "w-full rounded border px-3 py-2 text-left text-xs"
              }
              key={session.id}
              onClick={() => onSelectSessionId(session.id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{session.intent}</span>
                <Badge variant="outline">{session.status}</Badge>
              </div>
              <div className="text-muted-foreground mt-1 truncate">
                {session.id} · {session.updatedAt}
              </div>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-muted-foreground rounded border px-3 py-6 text-center text-xs">
            Carregando sessão...
          </div>
        ) : null}

        {!isLoading && !inspector ? (
          <div className="text-muted-foreground rounded border px-3 py-6 text-center text-xs">
            Selecione uma sessão para ver plano e delegações.
          </div>
        ) : null}

        {inspector ? (
          <div className="space-y-3">
            <div className="rounded border px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{inspector.session.intent}</span>
                <Badge variant="outline">{inspector.session.status}</Badge>
              </div>
              <div className="text-muted-foreground mt-1 truncate">
                {inspector.session.id}
              </div>
              <div className="text-muted-foreground mt-2">
                jobs: {inspector.jobCounts.running} running ·{" "}
                {inspector.jobCounts.queued} queued · {inspector.jobCounts.done}{" "}
                done · {inspector.jobCounts.failed} failed
              </div>
            </div>
            {inspector.currentHostPlan ? (
              <div className="rounded border px-3 py-2">
                <p className="text-muted-foreground text-xs">
                  Revisão {inspector.session.revision} ·{" "}
                  {inspector.currentHostPlan.status}
                </p>
                <p className="text-sm">
                  {inspector.currentHostPlan.decisionSummary}
                </p>
              </div>
            ) : null}
            <DelegationsAccordion jobs={inspector.jobs} />
            <PlanAccordion
              plan={inspector.plan}
              status={inspector.currentHostPlan?.status}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};
