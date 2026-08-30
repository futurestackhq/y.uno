import { describe, expect, it } from "bun:test";

import type { HostModel } from "./host-agent";
import {
  hasComposeReplyMarker,
  hasSourceJobId,
  rankCatalogItems,
} from "./job-runner-helpers";

it("supports a deterministic host adapter for replay tests", () => {
  const host: HostModel = {
    plan: () => Promise.reject(new Error("fixture only")),
    synthesize: () => Promise.reject(new Error("fixture only")),
  };

  expect(typeof host.plan).toBe("function");
  expect(typeof host.synthesize).toBe("function");
});

describe("rankCatalogItems", () => {
  it("prioritizes active matching catalog items", () => {
    const ranked = rankCatalogItems(
      [
        {
          attributesJson: "{}",
          connectionId: "conn_1",
          createdAt: "2026-08-30T00:00:00.000Z",
          currency: "BRL",
          id: "inactive",
          imageUrl: null,
          isActive: false,
          kind: "sku",
          priceCents: 100,
          subtitle: null,
          title: "Inactive pet food",
        },
        {
          attributesJson: "{}",
          connectionId: "conn_1",
          createdAt: "2026-08-30T00:00:00.000Z",
          currency: "BRL",
          id: "food",
          imageUrl: null,
          isActive: true,
          kind: "sku",
          priceCents: 200,
          subtitle: "Cachorro",
          title: "Premium Pet Food",
        },
        {
          attributesJson: "{}",
          connectionId: "conn_1",
          createdAt: "2026-08-30T00:00:00.000Z",
          currency: "BRL",
          id: "toy",
          imageUrl: null,
          isActive: true,
          kind: "sku",
          priceCents: 50,
          subtitle: null,
          title: "Bola",
        },
      ],
      "I want pet food"
    );

    expect(ranked.map((item) => item.id)).toEqual(["food", "toy"]);
  });
});

describe("hasSourceJobId", () => {
  it("matches jobs linked to the source job", () => {
    expect(hasSourceJobId('{"sourceJobId":"job_1"}', "job_1")).toBe(true);
    expect(hasSourceJobId('{"sourceJobId":"job_2"}', "job_1")).toBe(false);
  });

  it("treats invalid job input as no match", () => {
    expect(hasSourceJobId("not json", "job_1")).toBe(false);
  });
});

describe("hasComposeReplyMarker", () => {
  it("matches assistant messages linked to the compose job", () => {
    expect(
      hasComposeReplyMarker('{"text":"ok","composeJobId":"job_1"}', "job_1")
    ).toBe(true);
    expect(
      hasComposeReplyMarker('{"text":"ok","composeJobId":"job_2"}', "job_1")
    ).toBe(false);
  });

  it("treats invalid message content as no match", () => {
    expect(hasComposeReplyMarker("not json", "job_1")).toBe(false);
  });
});
