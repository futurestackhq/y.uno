import { z } from "zod";

import {
  enqueueEnvelope,
  listLogs,
  listMessages,
  listSessions,
  tickOnce,
} from "../commerce/orchestrator";
import { processWork } from "../commerce/process";
import { envelopeSchema } from "../commerce/types";
import { publicProcedure, router } from "../index";

const userIdInput = z.object({ userId: z.string().optional() }).optional();
const sessionIdInput = z
  .object({ sessionId: z.string().optional() })
  .optional();
const messagesInput = z
  .object({ sessionId: z.string().optional(), userId: z.string().optional() })
  .optional();

export const commerceRouter = router({
  getLogs: publicProcedure
    .input(sessionIdInput)
    .query(async ({ ctx, input }) => {
      const sessionId = input?.sessionId;
      return await listLogs(ctx.db, sessionId);
    }),
  getMessages: publicProcedure
    .input(messagesInput)
    .query(async ({ ctx, input }) => {
      const userId = input?.userId ?? "user_marta";
      return await listMessages(ctx.db, userId, input?.sessionId);
    }),
  getSessions: publicProcedure
    .input(userIdInput)
    .query(async ({ ctx, input }) => {
      const userId = input?.userId ?? "user_marta";
      return await listSessions(ctx.db, userId);
    }),
  sendEnvelope: publicProcedure
    .input(envelopeSchema)
    .mutation(async ({ ctx, input }) => {
      await enqueueEnvelope(ctx.db, input);
      ctx.executionCtx?.waitUntil(
        processWork(ctx.db, { maxDispatch: 25, maxJobs: 25 })
      );
      return { ok: true } as const;
    }),
  tick: publicProcedure.mutation(async ({ ctx }) => await tickOnce(ctx.db)),
});
