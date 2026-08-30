import { createDb } from "@hackathon/db";
import type { Context as HonoContext } from "hono";

export interface CreateContextOptions {
  context: HonoContext;
}

export const createContext = (_options: CreateContextOptions) => {
  const db = createDb();

  return {
    auth: null,
    db,
    session: null,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
