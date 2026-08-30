import { Badge } from "@hackathon/ui/components/badge";
import { Button } from "@hackathon/ui/components/button";
import { useMemo } from "react";

import { Terminal } from "@/components/ai-elements/terminal";

import { getJobDisplayStatus } from "./delegations-accordion";
import type { DelegationJob } from "./delegations-accordion";

interface JobLogRow {
  createdAt: string;
  eventType: string;
  id: string;
  level: "info" | "warn" | "error";
  line: string | null;
}

const jobTimestamp = (job: DelegationJob): string =>
  job.startedAt ?? job.finishedAt ?? "";

export const SubagentsLivePanel = (props: {
  jobs: DelegationJob[];
  logs: JobLogRow[];
  onSelectJobId: (jobId: string) => void;
  selectedJobId: string | null;
}) => {
  const { jobs, logs, onSelectJobId, selectedJobId } = props;
  const defaultJobId = useMemo(() => {
    const running = jobs
      .filter((job) => job.status === "running")
      .toSorted((a, b) => jobTimestamp(b).localeCompare(jobTimestamp(a)))
      .at(0);
    if (running) {
      return running.id;
    }

    return jobs
      .toSorted((a, b) => jobTimestamp(b).localeCompare(jobTimestamp(a)))
      .at(0)?.id;
  }, [jobs]);

  const activeJobId = selectedJobId ?? defaultJobId ?? null;
  const activeJob = jobs.find((job) => job.id === activeJobId) ?? null;

  const queuedCount = jobs.filter((job) => job.status === "queued").length;
  const runningJobs = jobs.filter((job) => job.status === "running");
  const terminalOutput =
    logs.length === 0
      ? "waiting for output..."
      : logs
          .map((log) =>
            log.line
              ? `${log.createdAt} ${log.eventType} ${log.line}`
              : `${log.createdAt} ${log.eventType}`
          )
          .join("\n");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-3 text-sm font-medium">
        Subagents Live
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {runningJobs.map((job) => (
            <Button
              key={job.id}
              onClick={() => {
                onSelectJobId(job.id);
              }}
              size="sm"
              type="button"
              variant={activeJobId === job.id ? "default" : "outline"}
            >
              {job.subagentName ?? job.kind}
            </Button>
          ))}
          <Badge variant="outline">queued {queuedCount}</Badge>
        </div>

        {activeJob ? (
          <div className="space-y-3">
            <div className="rounded border px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {activeJob.subagentName ?? "subagent"} · {activeJob.kind}
                </span>
                <Badge variant="outline">
                  {getJobDisplayStatus(activeJob)}
                </Badge>
              </div>
              <div className="text-muted-foreground mt-1 truncate">
                {activeJob.id}
              </div>
            </div>
            <Terminal
              isStreaming={activeJob.status === "running"}
              output={terminalOutput}
            />
          </div>
        ) : (
          <div className="text-muted-foreground rounded border px-3 py-6 text-center text-xs">
            No subagents are running yet.
          </div>
        )}
      </div>
    </div>
  );
};
