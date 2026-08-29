import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { config } from "dotenv";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

export const db = Cloudflare.D1.Database("database", {
  migrationsDir: "../../packages/db/src/migrations",
});

export const server = Cloudflare.Worker("server", {
  compatibility: {
    flags: ["nodejs_compat"],
  },
  dev: {
    port: 3000,
  },
  env: {
    CORS_ORIGIN: Config.string("CORS_ORIGIN").pipe(Config.withDefault("*")),
    DB: db,
  },
  main: "../../apps/server/src/index.ts",
  name: "server",
});

export type ServerEnv = Cloudflare.InferEnv<typeof server>;

export default Alchemy.Stack(
  "hackathon",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const serverWorker = yield* server;
    const webWorker = yield* Cloudflare.Website.Vite("web", {
      assets: {
        htmlHandling: "auto-trailing-slash",
        notFoundHandling: "single-page-application",
      },
      dev: {
        port: 3001,
      },
      env: {
        VITE_SERVER_URL: serverWorker.url.as<string>(),
      },
      name: "web",
      rootDir: "../../apps/web",
    });

    return {
      server: serverWorker.url,
      web: webWorker.url,
    };
  })
);
