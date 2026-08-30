import type { AppRouter } from "@hackathon/api/routers/index";
import { env } from "@hackathon/env/web";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

const configuredServerUrl = import.meta.env.DEV
  ? "http://localhost:3003"
  : env.VITE_SERVER_URL;

const serverUrl = configuredServerUrl.endsWith("/")
  ? configuredServerUrl.slice(0, -1)
  : configuredServerUrl;

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${serverUrl}/trpc`,
    }),
  ],
});
