import { z } from "zod";

import { publicProcedure, router } from "../index";

export const commerceRouter = router({
  getLogs: publicProcedure
    .input(z.object({ sessionId: z.string().optional() }).optional())
    .query(({ ctx }) => {
      void ctx.db;
      return [];
    }),
  getMessages: publicProcedure.query(({ ctx }) => {
    void ctx.db;
    return [];
  }),
  getSessions: publicProcedure.query(({ ctx }) => {
    void ctx.db;
    return [];
  }),
  sendEnvelope: publicProcedure
    .input(
      z.object({
        payload: z.unknown(),
        type: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      void ctx.db;
      void input;
      return { ok: true } as const;
    }),
  tick: publicProcedure.mutation(({ ctx }) => {
    void ctx.db;
    return { ok: true } as const;
  }),
});
