import { describe, expect, it } from "bun:test";

import { buildDelegationPrompt } from "./prompts";

describe("buildDelegationPrompt", () => {
  it("includes stable header and expected output contract", () => {
    const prompt = buildDelegationPrompt({
      kind: "classify_intent",
      input: { text: "quero ração" },
      session: { id: "sess_1", intent: "unknown" },
    });

    expect(prompt).toContain("You are a subagent");
    expect(prompt).toContain("Return JSON");
    expect(prompt).toContain("classify_intent");
    expect(prompt).toContain("sess_1");
    expect(prompt).toContain("Session intent: unknown");
    expect(prompt).toContain('"summary": "short summary string"');
    expect(prompt).toContain('"artifacts": []');
    expect(prompt).toContain('"warnings": []');
    expect(prompt).toContain('"toolCalls": []');
    expect(prompt).toContain('"next": null');
    expect(prompt).toContain('"text": "quero ração"');
  });

  it("is deterministic for object key ordering", () => {
    const a = buildDelegationPrompt({
      kind: "rank_candidates",
      input: { b: 2, a: 1, nested: { y: 2, x: 1 } },
      session: { id: "sess_det", intent: "product_pet_food" },
    });

    const b = buildDelegationPrompt({
      kind: "rank_candidates",
      input: { a: 1, b: 2, nested: { x: 1, y: 2 } },
      session: { id: "sess_det", intent: "product_pet_food" },
    });

    expect(a).toBe(b);
  });

  it("replaces circular references with a sentinel", () => {
    const obj: Record<string, unknown> & { self?: unknown } = { a: 1 };
    obj.self = obj;

    const prompt = buildDelegationPrompt({
      kind: "cycle_check",
      input: obj,
      session: { id: "sess_cycle", intent: "unknown" },
    });

    expect(prompt).toContain('"self": "[Circular]"');
  });

  it("detects circular references in arrays", () => {
    const arr: unknown[] = [1];
    arr.push(arr);

    const prompt = buildDelegationPrompt({
      kind: "cycle_check_array",
      input: arr,
      session: { id: "sess_cycle_arr", intent: "unknown" },
    });

    expect(prompt).toContain("[Circular]");
    expect(prompt).toContain("Input JSON:");
  });
});
