import { createContext } from "@hackathon/api/context";
import { appRouter } from "@hackathon/api/routers/index";
import { env } from "@hackathon/env/server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    allowMethods: ["GET", "POST", "OPTIONS"],
    origin: env.CORS_ORIGIN,
  })
);

app.use(
  "/trpc/*",
  trpcServer({
    createContext: (_opts, context) => createContext({ context }),
    router: appRouter,
  })
);

app.get("/", (c) => c.text("OK"));

export default app;
