import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const runtimeEnv = (
  import.meta as unknown as { env: Record<string, string | undefined> }
).env;

export const env = createEnv({
  client: {
    VITE_SERVER_URL: z.url().default("http://127.0.0.1:3000"),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv,
});
