import { openai } from "@ai-sdk/openai";
import type { Db } from "@hackathon/db";
import { env } from "@hackathon/env/server";
import { generateText, Output, stepCountIs } from "ai";

import { assembleHostContext } from "./host-context";
import type { HostContextSnapshot } from "./host-context";
import {
  decodeHostPlanOutput,
  decodeHostSynthesisOutput,
  hostPlanOutputSchema,
  hostSynthesisOutputSchema,
} from "./host-contract";
import type { HostPlanDecision, HostSynthesisDecision } from "./host-contract";
import { createHostTools } from "./host-tools";
import { buildHostPlanningPrompt, buildHostSynthesisPrompt } from "./prompts";
import type { Envelope } from "./types";

const HOST_MODEL_TIMEOUT_MS = 30_000;

export interface HostSynthesisInput {
  context: unknown;
  envelope: Envelope;
  snapshot: HostContextSnapshot;
}

export interface HostModel {
  plan: (snapshot: HostContextSnapshot) => Promise<HostPlanDecision>;
  synthesize: (input: HostSynthesisInput) => Promise<HostSynthesisDecision>;
}

const lunaModel: HostModel = {
  async plan(snapshot) {
    const result = await generateText({
      model: openai.responses(env.ORCHESTRATOR_MODEL),
      output: Output.object({ schema: hostPlanOutputSchema }),
      prompt: buildHostPlanningPrompt({ context: snapshot }),
      providerOptions: {
        openai: {
          reasoningEffort: "low",
          reasoningSummary: null,
          textVerbosity: "low",
        },
      },
      stopWhen: stepCountIs(4),
      timeout: HOST_MODEL_TIMEOUT_MS,
      tools: createHostTools(snapshot),
    });
    if (!result.output) {
      throw new Error("Host returned no structured planning decision");
    }
    return decodeHostPlanOutput(result.output);
  },
  async synthesize(input) {
    const result = await generateText({
      model: openai.responses(env.ORCHESTRATOR_MODEL),
      output: Output.object({ schema: hostSynthesisOutputSchema }),
      prompt: buildHostSynthesisPrompt({
        context: { ...input.snapshot, result: input.context },
      }),
      providerOptions: {
        openai: {
          reasoningEffort: "low",
          reasoningSummary: null,
          textVerbosity: "low",
        },
      },
      stopWhen: stepCountIs(4),
      timeout: HOST_MODEL_TIMEOUT_MS,
      tools: createHostTools(input.snapshot),
    });
    if (!result.output) {
      throw new Error("Host returned no structured synthesis decision");
    }
    return decodeHostSynthesisOutput(result.output);
  },
};

export const runHostPlan = async (input: {
  db: Db;
  envelope: Envelope;
  sessionId?: string;
  snapshot?: HostContextSnapshot;
  model?: HostModel;
}): Promise<HostPlanDecision> => {
  const snapshot =
    input.snapshot ??
    (await assembleHostContext(input.db, {
      envelope: input.envelope,
      sessionId: input.sessionId,
    }));
  return await (input.model ?? lunaModel).plan(snapshot);
};

export const runHostSynthesis = async (input: {
  db: Db;
  envelope: Envelope;
  context: unknown;
  snapshot?: HostContextSnapshot;
  model?: HostModel;
}): Promise<HostSynthesisDecision> => {
  const snapshot =
    input.snapshot ??
    (await assembleHostContext(input.db, {
      envelope: input.envelope,
      sessionId: input.envelope.sessionId,
    }));
  return await (input.model ?? lunaModel).synthesize({
    context: input.context,
    envelope: input.envelope,
    snapshot,
  });
};
