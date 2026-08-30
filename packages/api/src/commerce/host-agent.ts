import { openai } from "@ai-sdk/openai";
import type { Db } from "@hackathon/db";
import { env } from "@hackathon/env/server";
import { generateText, Output, stepCountIs } from "ai";

import { assembleHostContext } from "./host-context";
import type { HostContextSnapshot } from "./host-context";
import {
  hostPlanDecisionSchema,
  hostSynthesisDecisionSchema,
} from "./host-contract";
import type { HostPlanDecision, HostSynthesisDecision } from "./host-contract";
import { createHostTools } from "./host-tools";
import { buildHostPlanningPrompt, buildHostSynthesisPrompt } from "./prompts";
import type { Envelope } from "./types";

const model = () => openai.responses(env.ORCHESTRATOR_MODEL);

export const runHostPlan = async (input: {
  db: Db;
  envelope: Envelope;
  sessionId?: string;
  snapshot?: HostContextSnapshot;
}): Promise<HostPlanDecision> => {
  const snapshot =
    input.snapshot ??
    (await assembleHostContext(input.db, {
      envelope: input.envelope,
      sessionId: input.sessionId,
    }));
  const result = await generateText({
    model: model(),
    output: Output.object({ schema: hostPlanDecisionSchema }),
    prompt: buildHostPlanningPrompt(snapshot),
    providerOptions: {
      openai: {
        reasoningEffort: "low",
        reasoningSummary: null,
        textVerbosity: "low",
      },
    },
    stopWhen: stepCountIs(4),
    tools: createHostTools(snapshot),
  });
  if (!result.output) {
    throw new Error("Host returned no structured planning decision");
  }
  return hostPlanDecisionSchema.parse(result.output);
};

export const runHostSynthesis = async (input: {
  db: Db;
  envelope: Envelope;
  context: unknown;
  snapshot?: HostContextSnapshot;
}): Promise<HostSynthesisDecision> => {
  const snapshot =
    input.snapshot ??
    (await assembleHostContext(input.db, {
      envelope: input.envelope,
      sessionId: input.envelope.sessionId,
    }));
  const result = await generateText({
    model: model(),
    output: Output.object({ schema: hostSynthesisDecisionSchema }),
    prompt: buildHostSynthesisPrompt({
      context: { ...snapshot, result: input.context },
    }),
    providerOptions: {
      openai: {
        reasoningEffort: "low",
        reasoningSummary: null,
        textVerbosity: "low",
      },
    },
    stopWhen: stepCountIs(4),
    tools: createHostTools(snapshot),
  });
  if (!result.output) {
    throw new Error("Host returned no structured synthesis decision");
  }
  return hostSynthesisDecisionSchema.parse(result.output);
};
