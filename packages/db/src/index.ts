import { env } from "@hackathon/env/server";
import { drizzle } from "drizzle-orm/d1";

import { schema } from "./schema";

export type Db = ReturnType<typeof createDb>;

export { schema } from "./schema";

export const createDb = () => drizzle(env.DB, { schema });
