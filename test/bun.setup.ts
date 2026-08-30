import { mock } from "bun:test";

mock.module("cloudflare:workers", () => ({
  env: {},
}));
