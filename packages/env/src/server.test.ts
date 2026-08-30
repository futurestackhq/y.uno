import { expect, it } from "bun:test";

import { env } from "./server";

it("loads the Worker env through the Bun test mock", () => {
  expect(env).toEqual({});
});
