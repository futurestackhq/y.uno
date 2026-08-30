export interface SessionRow {
  id: string;
  intent: string;
  status: string;
  updatedAt: string;
}

export const SessionsPanel = (props: {
  sessions: SessionRow[];
  selectedSessionId: string | null;
  onSelectSessionId: (id: string) => void;
}) => {
  const { onSelectSessionId, selectedSessionId, sessions } = props;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-3 text-sm font-medium">Sessions</div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <ul className="flex flex-col gap-1">
          {sessions.map((s) => {
            const active = selectedSessionId === s.id;
            return (
              <li key={s.id}>
                <button
                  className={
                    active
                      ? "w-full rounded border bg-[rgb(62_79_224/8%)] px-3 py-2 text-left text-xs"
                      : "w-full rounded border px-3 py-2 text-left text-xs"
                  }
                  onClick={() => onSelectSessionId(s.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{s.intent}</span>
                    <span className="text-muted-foreground">{s.status}</span>
                  </div>
                  <div className="text-muted-foreground mt-1 text-[11px]">
                    {s.id} · {s.updatedAt}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
