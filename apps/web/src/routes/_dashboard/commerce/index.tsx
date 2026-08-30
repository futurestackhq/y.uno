import { Button } from "@hackathon/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@hackathon/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hackathon/ui/components/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { SendableEnvelope } from "@/commerce/chat-panel";
import { ChatPanel } from "@/commerce/chat-panel";
import { DeviceBrowserSheet } from "@/commerce/device-browser-sheet";
import { SessionInspectorPanel } from "@/commerce/session-inspector-panel";
import { SubagentsLivePanel } from "@/commerce/subagents-live-panel";
import { queryClient, trpc } from "@/utils/trpc";

const refreshCommerceQueries = async () => {
  await queryClient.invalidateQueries({
    queryKey: trpc.commerce.getMessages.queryKey(),
  });
  await queryClient.invalidateQueries({
    queryKey: trpc.commerce.getSessions.queryKey(),
  });
  await queryClient.invalidateQueries({ queryKey: trpc.commerce.pathKey() });
};

const CommercePage = () => {
  const [browserOpen, setBrowserOpen] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("/checkout?orderId=ord_demo");
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(
    null
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const pageTransform = useMemo(
    () =>
      browserOpen
        ? "origin-top transition-transform duration-200 ease-out scale-[0.97] translate-y-1"
        : "origin-top transition-transform duration-200 ease-out",
    [browserOpen]
  );

  const messagesQuery = useQuery(trpc.commerce.getMessages.queryOptions());
  const sessionsQuery = useQuery(trpc.commerce.getSessions.queryOptions());
  const pendingWorkQuery = useQuery(
    trpc.commerce.getPendingWork.queryOptions(
      selectedSessionId
        ? { sessionId: selectedSessionId, userId: "user_marta" }
        : { userId: "user_marta" },
      { refetchInterval: (query) => (query.state.data?.pending ? 500 : false) }
    )
  );
  const isWorking = pendingWorkQuery.data?.pending ?? false;
  const activeRefetchInterval = isWorking ? 500 : false;
  const inspectorQuery = useQuery(
    trpc.commerce.getSessionInspector.queryOptions(
      { sessionId: selectedSessionId ?? "" },
      {
        enabled: Boolean(selectedSessionId),
        refetchInterval: activeRefetchInterval,
      }
    )
  );
  const selectedJobLogsQuery = useQuery(
    trpc.commerce.getJobLogs.queryOptions(
      { jobId: selectedJobId ?? "" },
      {
        enabled: Boolean(selectedJobId),
        refetchInterval: activeRefetchInterval,
      }
    )
  );
  const sendEnvelopeMutation = useMutation(
    trpc.commerce.sendEnvelope.mutationOptions()
  );
  const resetDemoDataMutation = useMutation(
    trpc.commerce.resetDemoData.mutationOptions({
      onSuccess: async () => {
        setSelectedSessionId(null);
        setSelectedJobId(null);
        setCheckoutSessionId(null);
        setBrowserOpen(false);
        setResetDialogOpen(false);
        await refreshCommerceQueries();
        toast.success("Demo resetado com sucesso.");
      },
      onError: (error) => {
        toast.error(`Não foi possível resetar o demo: ${error.message}`);
      },
    })
  );

  const send = async (envelope: SendableEnvelope) => {
    if (envelope.type === "user_text") {
      await sendEnvelopeMutation.mutateAsync({
        sessionId: envelope.payload.sessionId,
        text: envelope.payload.text,
        idempotencyKey: envelope.payload.idempotencyKey,
        type: "user_text",
        userId: "user_marta",
      });
    } else if (envelope.type === "quick_reply") {
      const action = envelope.payload.action as
        | "details"
        | "buy"
        | "pay_now"
        | "swap_card"
        | "confirm_payment";
      await sendEnvelopeMutation.mutateAsync({
        action,
        catalogItemId: envelope.payload.catalogItemId,
        orderId: envelope.payload.orderId,
        sessionId: envelope.payload.sessionId,
        type: "quick_reply",
        userId: "user_marta",
      });
    }

    await refreshCommerceQueries();
  };

  return (
    <>
      <div className={pageTransform}>
        <div className="grid h-full min-h-0 grid-cols-3 gap-0">
          <Card className="flex min-h-0 flex-col rounded-none border-r ring-0">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Chat</CardTitle>
                <Button
                  disabled={resetDemoDataMutation.isPending}
                  onClick={() => {
                    setResetDialogOpen(true);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {resetDemoDataMutation.isPending
                    ? "Limpando..."
                    : "Resetar demo"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 px-0">
              <ChatPanel
                messages={messagesQuery.data ?? []}
                isWorking={isWorking}
                onOpenCheckout={(orderId, sessionId) => {
                  setCheckoutSessionId(sessionId);
                  setCheckoutUrl(`/checkout?orderId=${orderId}`);
                  setBrowserOpen(true);
                }}
                sendEnvelope={send}
              />
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-col rounded-none border-r ring-0">
            <CardContent className="min-h-0 flex-1 px-0">
              <SessionInspectorPanel
                inspector={inspectorQuery.data}
                isLoading={inspectorQuery.isLoading}
                onSelectSessionId={(id) => {
                  setSelectedSessionId(id);
                  setSelectedJobId(null);
                }}
                selectedSessionId={selectedSessionId}
                sessions={(sessionsQuery.data ?? []).map((s) => ({
                  id: s.id,
                  intent: s.intent,
                  revision: s.revision,
                  status: s.status,
                  updatedAt: s.updatedAt,
                }))}
              />
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-col rounded-none ring-0">
            <CardContent className="min-h-0 flex-1 px-0">
              <SubagentsLivePanel
                jobs={inspectorQuery.data?.jobs ?? []}
                logs={(selectedJobLogsQuery.data ?? []).map((l) => ({
                  createdAt: l.createdAt,
                  eventType: l.eventType,
                  id: l.id,
                  level: l.level,
                  line: l.line,
                }))}
                onSelectJobId={(jobId) => setSelectedJobId(jobId)}
                selectedJobId={selectedJobId}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DeviceBrowserSheet
        onCheckoutReturned={async (msg) => {
          setBrowserOpen(false);
          if (!checkoutSessionId) {
            return;
          }

          await sendEnvelopeMutation.mutateAsync({
            brand: msg.brand,
            last4: msg.last4,
            orderId: msg.order_id,
            sessionId: checkoutSessionId,
            status: msg.status,
            tokenSaved: msg.tokenSaved,
            type: "checkout_returned",
            userId: "user_marta",
          });
          await refreshCommerceQueries();
        }}
        onClose={() => {
          setBrowserOpen(false);
        }}
        open={browserOpen}
        url={checkoutUrl}
      />
      <Dialog onOpenChange={setResetDialogOpen} open={resetDialogOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Resetar demo?</DialogTitle>
            <DialogDescription>
              Isso apaga mensagens, sessões, jobs, pedidos, pagamentos e
              catálogos do Yuno Commerce. Usuários e dados de outros módulos não
              serão alterados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={resetDemoDataMutation.isPending}
              onClick={() => setResetDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              disabled={resetDemoDataMutation.isPending}
              onClick={() => {
                resetDemoDataMutation.mutate();
              }}
              type="button"
              variant="destructive"
            >
              {resetDemoDataMutation.isPending ? "Limpando..." : "Resetar demo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const Route = createFileRoute("/_dashboard/commerce/")({
  component: CommercePage,
});
