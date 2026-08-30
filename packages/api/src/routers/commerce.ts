import { schema } from "@hackathon/db";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { parseBoundedJsonOrRaw as parseHostJsonOrRaw } from "../commerce/host-context";
import {
  enqueueEnvelope,
  listMessages,
  listSessions,
  tickOnce,
} from "../commerce/orchestrator";
import { processWork } from "../commerce/process";
import { resetCommerceDemoData } from "../commerce/reset";
import { envelopeSchema } from "../commerce/types";
import { publicProcedure, router } from "../index";

export { parseBoundedJsonOrRaw } from "../commerce/host-context";

export const DEMO_USER_ID = "user_marta";
const userIdInput = z
  .object({ userId: z.string().optional() })
  .optional()
  .refine((input) => !input?.userId || input.userId === DEMO_USER_ID, {
    message: "Only the configured demo user is available",
  });
const sessionIdInput = z
  .object({ sessionId: z.string().optional() })
  .optional();
const messagesInput = z
  .object({ sessionId: z.string().optional(), userId: z.string().optional() })
  .optional()
  .refine((input) => !input?.userId || input.userId === DEMO_USER_ID, {
    message: "Only the configured demo user is available",
  });
const sessionInspectorInput = z.object({ sessionId: z.string() });
const jobLogsInput = z.object({ jobId: z.string() });
const pendingWorkInput = z
  .object({ sessionId: z.string().optional(), userId: z.string().optional() })
  .optional()
  .refine((input) => !input?.userId || input.userId === DEMO_USER_ID, {
    message: "Only the configured demo user is available",
  });

const activeJobStatuses = ["queued", "running"] as const;
const activeMessageQueueStatuses = ["pending", "processing"] as const;

export const serializeCurrentHostPlan = (
  plan:
    | {
        baseRevision: number;
        decisionJson: string;
        decisionSummary: string;
        id: string;
        status: string;
      }
    | undefined
) =>
  plan
    ? {
        baseRevision: plan.baseRevision,
        decision: parseHostJsonOrRaw(plan.decisionJson),
        decisionSummary: plan.decisionSummary,
        id: plan.id,
        status: plan.status,
      }
    : null;

export const commerceRouter = router({
  getJobLogs: publicProcedure.input(jobLogsInput).query(
    async ({ ctx, input }) =>
      await ctx.db
        .select({ log: schema.executionLogs })
        .from(schema.executionLogs)
        .innerJoin(
          schema.sessions,
          eq(schema.executionLogs.sessionId, schema.sessions.id)
        )
        .where(
          and(
            eq(schema.executionLogs.jobId, input.jobId),
            eq(schema.sessions.userId, DEMO_USER_ID)
          )
        )
        .orderBy(
          asc(schema.executionLogs.createdAt),
          asc(schema.executionLogs.id)
        )
        .limit(500)
        .then((rows) => rows.map(({ log }) => log))
  ),
  getLogs: publicProcedure
    .input(sessionIdInput)
    .query(async ({ ctx, input }) => {
      const sessionId = input?.sessionId;
      return await ctx.db
        .select({ log: schema.executionLogs })
        .from(schema.executionLogs)
        .innerJoin(
          schema.sessions,
          eq(schema.executionLogs.sessionId, schema.sessions.id)
        )
        .where(
          and(
            eq(schema.sessions.userId, DEMO_USER_ID),
            sessionId
              ? eq(schema.executionLogs.sessionId, sessionId)
              : undefined
          )
        )
        .orderBy(
          asc(schema.executionLogs.createdAt),
          asc(schema.executionLogs.id)
        )
        .limit(500)
        .then((rows) => rows.map(({ log }) => log));
    }),
  getMessages: publicProcedure
    .input(messagesInput)
    .query(
      async ({ ctx, input }) =>
        await listMessages(ctx.db, DEMO_USER_ID, input?.sessionId)
    ),
  getPendingWork: publicProcedure
    .input(pendingWorkInput)
    .query(async ({ ctx, input }) => {
      const [jobCounts, messageQueueCounts] = await Promise.all([
        ctx.db
          .select({
            count: sql<number>`count(*)`,
            status: schema.jobs.status,
          })
          .from(schema.jobs)
          .innerJoin(
            schema.sessions,
            eq(schema.jobs.sessionId, schema.sessions.id)
          )
          .where(
            and(
              inArray(schema.jobs.status, activeJobStatuses),
              input?.sessionId
                ? and(
                    eq(schema.jobs.sessionId, input.sessionId),
                    eq(schema.sessions.userId, DEMO_USER_ID)
                  )
                : eq(schema.sessions.userId, DEMO_USER_ID)
            )
          )
          .groupBy(schema.jobs.status),
        (async () => {
          let queueUserId = input?.userId;
          if (!queueUserId && input?.sessionId) {
            const [session] = await ctx.db
              .select({ userId: schema.sessions.userId })
              .from(schema.sessions)
              .where(eq(schema.sessions.id, input.sessionId))
              .limit(1);
            queueUserId = session?.userId;
          }

          return await ctx.db
            .select({
              count: sql<number>`count(*)`,
              status: schema.messageQueue.status,
            })
            .from(schema.messageQueue)
            .where(
              and(
                inArray(schema.messageQueue.status, activeMessageQueueStatuses),
                eq(schema.messageQueue.userId, DEMO_USER_ID)
              )
            )
            .groupBy(schema.messageQueue.status);
        })(),
      ]);

      const jobs: Record<(typeof activeJobStatuses)[number], number> = {
        queued: 0,
        running: 0,
      };
      for (const row of jobCounts) {
        if (row.status === "queued" || row.status === "running") {
          jobs[row.status] = row.count;
        }
      }

      const messageQueue: Record<
        (typeof activeMessageQueueStatuses)[number],
        number
      > = {
        pending: 0,
        processing: 0,
      };
      for (const row of messageQueueCounts) {
        if (row.status === "pending" || row.status === "processing") {
          messageQueue[row.status] = row.count;
        }
      }

      return {
        counts: {
          jobs,
          messageQueue,
        },
        pending:
          jobs.queued > 0 ||
          jobs.running > 0 ||
          messageQueue.pending > 0 ||
          messageQueue.processing > 0,
      } as const;
    }),
  getSessionInspector: publicProcedure
    .input(sessionInspectorInput)
    .query(async ({ ctx, input }) => {
      const [session] = await ctx.db
        .select()
        .from(schema.sessions)
        .where(
          and(
            eq(schema.sessions.id, input.sessionId),
            eq(schema.sessions.userId, DEMO_USER_ID)
          )
        )
        .limit(1);

      if (!session) {
        return null;
      }

      const jobs = await ctx.db
        .select({
          attempts: schema.jobs.attempts,
          errorText: schema.jobs.errorText,
          finishedAt: schema.jobs.finishedAt,
          id: schema.jobs.id,
          inputJson: schema.jobs.inputJson,
          kind: schema.jobs.kind,
          promptText: schema.jobs.promptText,
          resultJson: schema.jobs.resultJson,
          startedAt: schema.jobs.startedAt,
          status: schema.jobs.status,
          subagentName: schema.jobs.subagentName,
        })
        .from(schema.jobs)
        .innerJoin(
          schema.sessions,
          eq(schema.jobs.sessionId, schema.sessions.id)
        )
        .where(
          and(
            eq(schema.jobs.sessionId, input.sessionId),
            eq(schema.sessions.userId, DEMO_USER_ID)
          )
        )
        .orderBy(asc(schema.jobs.createdAt), asc(schema.jobs.id));
      const [latestPlan] = await ctx.db
        .select({
          baseRevision: schema.hostPlans.baseRevision,
          decisionJson: schema.hostPlans.decisionJson,
          decisionSummary: schema.hostPlans.decisionSummary,
          id: schema.hostPlans.id,
          status: schema.hostPlans.status,
        })
        .from(schema.hostPlans)
        .where(eq(schema.hostPlans.sessionId, input.sessionId))
        .orderBy(
          desc(schema.hostPlans.baseRevision),
          desc(schema.hostPlans.createdAt),
          desc(schema.hostPlans.id)
        )
        .limit(1);

      const jobCounts = {
        done: 0,
        failed: 0,
        queued: 0,
        running: 0,
      };
      for (const job of jobs) {
        jobCounts[job.status] += 1;
      }

      return {
        currentHostPlan: serializeCurrentHostPlan(latestPlan),
        jobCounts,
        jobs: jobs.map((job) => ({
          ...job,
          error: job.errorText,
          input: parseHostJsonOrRaw(job.inputJson),
          result: parseHostJsonOrRaw(job.resultJson),
        })),
        plan: parseHostJsonOrRaw(session.planJson),
        session,
      } as const;
    }),
  getSessions: publicProcedure
    .input(userIdInput)
    .query(async ({ ctx }) => await listSessions(ctx.db, DEMO_USER_ID)),
  resetDemoData: publicProcedure.mutation(
    async ({ ctx }) => await resetCommerceDemoData(ctx.db)
  ),
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
