import { publicProcedure, router } from "../index";
import { commerceRouter } from "./commerce";

export const appRouter = router({
  commerce: commerceRouter,
  healthCheck: publicProcedure.query(() => "OK"),
});
export type AppRouter = typeof appRouter;
