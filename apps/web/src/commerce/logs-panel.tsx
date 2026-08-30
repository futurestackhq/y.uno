export interface ExecutionLogRow {
  id: string;
  sessionId: string;
  level: "info" | "warn" | "error";
  eventType: string;
  dataJson: string;
  createdAt: string;
}

export const LogsPanel = (props: { logs: ExecutionLogRow[] }) => {
  const { logs } = props;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-3 text-sm font-medium">Executions</div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <ul className="flex flex-col gap-1">
          {logs.map((l) => (
            <li key={l.id} className="rounded border px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{l.eventType}</span>
                <span className="text-muted-foreground">{l.level}</span>
              </div>
              <div className="text-muted-foreground mt-1 text-[11px]">
                {l.createdAt} · {l.sessionId}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
