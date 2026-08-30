import { describe, expect, it } from "bun:test";

import { isSmallTalk } from "./small-talk";

describe("isSmallTalk", () => {
  it("detects greetings", () => {
    expect(isSmallTalk("oi")).toBe(true);
    expect(isSmallTalk("Bom dia!")).toBe(true);
    expect(isSmallTalk("e aí")).toBe(true);
  });

  it("does not mark product intent as small talk", () => {
    expect(isSmallTalk("quero ração pro meu cachorro")).toBe(false);
    expect(isSmallTalk("banho e tosa amanhã")).toBe(false);
    expect(isSmallTalk("oi, quero ração pro meu cachorro")).toBe(false);
    expect(isSmallTalk("bom dia, banho e tosa amanhã")).toBe(false);
    expect(isSmallTalk("e aí, preciso de ração")).toBe(false);
  });
});
