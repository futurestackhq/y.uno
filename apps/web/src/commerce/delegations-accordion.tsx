import { Task, TaskContent, TaskTrigger } from "@/components/ai-elements/task";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

export interface DelegationJob {
  attempts: number;
  error: string | null;
  finishedAt: string | null;
  id: string;
  input?: unknown;
  kind: string;
  promptText: string | null;
  result?: unknown;
  startedAt: string | null;
  status: string;
  subagentName: string | null;
}

export const getJobDisplayStatus = (job: DelegationJob): string => {
  if (
    job.status === "done" &&
    job.result &&
    typeof job.result === "object" &&
    "planSuperseded" in job.result &&
    job.result.planSuperseded === true
  ) {
    return "superseded";
  }

  return job.status;
};

const formatJson = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const getDurationLabel = (job: DelegationJob): string => {
  if (!job.startedAt) {
    return "not started";
  }

  const end = job.finishedAt ? new Date(job.finishedAt) : new Date();
  const start = new Date(job.startedAt);
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms) || ms < 0) {
    return "running";
  }

  return `${Math.max(1, Math.round(ms / 1000))}s`;
};

export const DelegationsAccordion = (props: { jobs: DelegationJob[] }) => {
  const sortedJobs = props.jobs.toSorted((a, b) => {
    if (a.status === "running" && b.status !== "running") {
      return -1;
    }
    if (b.status === "running" && a.status !== "running") {
      return 1;
    }
    return (b.startedAt ?? b.finishedAt ?? "").localeCompare(
      a.startedAt ?? a.finishedAt ?? ""
    );
  });

  return (
    <Task className="rounded border" defaultOpen>
      <TaskTrigger
        className="px-3 py-2"
        title={`Delegations (${sortedJobs.length})`}
      />
      <TaskContent className="border-t px-2 pb-2">
        {sortedJobs.length === 0 ? (
          <div className="text-muted-foreground px-1 py-4 text-xs">
            No delegations yet.
          </div>
        ) : (
          sortedJobs.map((job) => (
            <Tool className="bg-background/50" defaultOpen={false} key={job.id}>
              <ToolHeader
                state={getJobDisplayStatus(job)}
                title={`${job.subagentName ?? "subagent"} · ${job.kind} · attempt ${job.attempts} · ${getDurationLabel(job)}`}
                toolType={`tool-${job.kind}`}
              />
              <ToolContent>
                <section>
                  <div className="mb-1 font-medium">Prompt</div>
                  <pre className="bg-muted max-h-48 overflow-auto rounded p-2 whitespace-pre-wrap">
                    {job.promptText ?? "No prompt recorded."}
                  </pre>
                </section>
                <ToolInput input={job.input} />
                {job.result ? (
                  <ToolOutput output={formatJson(job.result)} />
                ) : null}
                {job.error ? <ToolOutput errorText={job.error} /> : null}
              </ToolContent>
            </Tool>
          ))
        )}
      </TaskContent>
    </Task>
  );
};
