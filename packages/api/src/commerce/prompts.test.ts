import { describe, expect, it } from "bun:test";

import {
  buildDelegationPrompt,
  buildHostPlanningPrompt,
  buildHostSynthesisPrompt,
} from "./prompts";

describe("buildHostPlanningPrompt", () => {
  it("requires concise marketplace responses for social turns", () => {
    const prompt = buildHostPlanningPrompt({ context: {} });

    expect(prompt).toContain("respond_directly");
    expect(prompt).toContain("Olá! O que você procura hoje?");
    expect(prompt).toContain(
      "marketplace of stores offering products or services"
    );
    expect(prompt).toContain("one short sentence");
  });
});

describe("buildDelegationPrompt", () => {
  it("includes stable header and expected output contract", () => {
    const prompt = buildDelegationPrompt({
      input: { text: "quero ração" },
      kind: "classify_intent",
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
      input: { a: 1, b: 2, nested: { x: 1, y: 2 } },
      kind: "rank_candidates",
      session: { id: "sess_det", intent: "product_pet_food" },
    });

    const b = buildDelegationPrompt({
      input: { a: 1, b: 2, nested: { x: 1, y: 2 } },
      kind: "rank_candidates",
      session: { id: "sess_det", intent: "product_pet_food" },
    });

    expect(a).toBe(b);
  });

  it("replaces circular references with a sentinel", () => {
    const obj: Record<string, unknown> & { self?: unknown } = { a: 1 };
    obj.self = obj;

    const prompt = buildDelegationPrompt({
      input: obj,
      kind: "cycle_check",
      session: { id: "sess_cycle", intent: "unknown" },
    });

    expect(prompt).toContain('"self": "[Circular]"');
  });

  it("detects circular references in arrays", () => {
    const arr: unknown[] = [1];
    arr.push(arr);

    const prompt = buildDelegationPrompt({
      input: arr,
      kind: "cycle_check_array",
      session: { id: "sess_cycle_arr", intent: "unknown" },
    });

    expect(prompt).toContain("[Circular]");
    expect(prompt).toContain("Input JSON:");
  });
});

describe("buildHostSynthesisPrompt", () => {
  it("requires details and purchase actions for carousel cards", () => {
    const prompt = buildHostSynthesisPrompt({ context: {} });

    expect(prompt).toContain('"details", label: "Ver detalhes"');
    expect(prompt).toContain('"buy", label: "Comprar"');
  });
});
