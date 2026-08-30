import { createDb } from "@hackathon/db";
import type { Context as HonoContext } from "hono";

export interface CreateContextOptions {
  context: HonoContext;
}

export const createContext = async function createContext(
  options: CreateContextOptions
) {
  const db = createDb();
  // Keep this function async for future auth/session work.
  await Promise.resolve();

  return {
    auth: null,
    db,
    executionCtx: options.context.executionCtx,
    session: null,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
