import type { Db } from "@hackathon/db";

import { dispatchOnce } from "./dispatcher";
import { runJobsOnce } from "./job-runner";

export const processWork = async (
  db: Db,
  params: { maxDispatch: number; maxJobs: number }
) => {
  const dispatchUntilLimit = async (
    remaining: number,
    processed: number
  ): Promise<number> => {
    if (remaining <= 0) {
      return processed;
    }

    const result = await dispatchOnce(db);
    if (result.processed === 0) {
      return processed;
    }

    return await dispatchUntilLimit(
      remaining - 1,
      processed + result.processed
    );
  };

  const runJobsUntilLimit = async (
    remaining: number,
    ran: number
  ): Promise<number> => {
    if (remaining <= 0) {
      return ran;
    }

    const result = await runJobsOnce(db, { limit: 1 });
    if (result.ran === 0) {
      return ran;
    }

    return await runJobsUntilLimit(remaining - 1, ran + result.ran);
  };

  const dispatched = await dispatchUntilLimit(params.maxDispatch, 0);
  const ran = await runJobsUntilLimit(params.maxJobs, 0);

  return { dispatched, ran } as const;
};
