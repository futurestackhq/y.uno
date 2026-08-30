import type { AppRouter } from "@hackathon/api/routers/index";
import { env } from "@hackathon/env/web";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

const serverUrl = env.VITE_SERVER_URL.endsWith("/")
  ? env.VITE_SERVER_URL.slice(0, -1)
  : env.VITE_SERVER_URL;

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${serverUrl}/trpc`,
    }),
  ],
});
