import { describe, expect, it } from "vitest";
import {
  hostRankEcrGap,
  movement,
  signalLabel,
  THRESHOLDS,
} from "./math";

describe("hostRankEcrGap", () => {
  it("positive when host boards place him later than expert rank", () => {
    expect(hostRankEcrGap(72, 61)).toBe(11);
  });
  it("negative when host boards place him earlier than expert rank", () => {
    expect(hostRankEcrGap(14, 22)).toBe(-8);
  });
  it("null when either side missing, never a fake zero", () => {
    expect(hostRankEcrGap(null, 12)).toBeNull();
    expect(hostRankEcrGap(12, null)).toBeNull();
    expect(hostRankEcrGap(null, null)).toBeNull();
  });
  it("rounds to one decimal", () => {
    expect(hostRankEcrGap(10.25, 8)).toBe(2.3);
  });
});

describe("movement", () => {
  it("positive = rising (host rank 72 → 61 means up 11 spots)", () => {
    expect(movement(61, 72)).toBe(11);
  });
  it("negative = falling", () => {
    expect(movement(30, 24)).toBe(-6);
  });
  it("null with only one day of data", () => {
    expect(movement(61, null)).toBeNull();
    expect(movement(null, 72)).toBeNull();
  });
});

describe("signalLabel", () => {
  it("null (tracking) when movement history is missing", () => {
    expect(signalLabel({ hostRankDelta: null, ecrDelta: null, gap: 11 })).toBeNull();
    expect(signalLabel({ hostRankDelta: 5, ecrDelta: null, gap: 11 })).toBeNull();
  });
  it("Market moving faster: both move same way, market much harder", () => {
    expect(signalLabel({ hostRankDelta: 11, ecrDelta: 2, gap: 4 })).toBe(
      "Market moving faster"
    );
  });
  it("Broad agreement: both move same way at similar size", () => {
    expect(signalLabel({ hostRankDelta: 4, ecrDelta: 3, gap: 1 })).toBe(
      "Broad agreement"
    );
  });
  it("Experts moving first: ECR moves, market hasn't yet", () => {
    expect(signalLabel({ hostRankDelta: 1, ecrDelta: 4, gap: -3 })).toBe(
      "Experts moving first"
    );
  });
  it("Market catching up: market-only move that shrinks the gap", () => {
    // gap now +5; before the +6 rise it was +11 → move closed the gap
    expect(signalLabel({ hostRankDelta: 6, ecrDelta: 0, gap: 5 })).toBe(
      "Market catching up to experts"
    );
  });
  it("Market moving faster: market-only move that widens the gap", () => {
    // gap now -9; before the +6 rise it was -3 → market ran past experts
    expect(signalLabel({ hostRankDelta: 6, ecrDelta: 0, gap: -9 })).toBe(
      "Market moving faster"
    );
  });
  it("opposite directions, gap widening: diverging", () => {
    // prior gap = 5 + 6 - (-4) = 15; now 5 -> that SHRANK, so this is converging
    expect(signalLabel({ hostRankDelta: 6, ecrDelta: -4, gap: 5 })).toBe(
      "Market and experts converging"
    );
    // and the mirror case: prior gap = -2 + -5 - 3 = -10, now -2 -> shrank
    expect(signalLabel({ hostRankDelta: -5, ecrDelta: 3, gap: -2 })).toBe(
      "Market and experts converging"
    );
  });
  it("opposite directions split on DISTANCE, not just direction", () => {
    // gap now +5, prior gap = 5 + 6 - (-4) = 15 -> gap SHRANK -> converging
    expect(signalLabel({ hostRankDelta: 6, ecrDelta: -4, gap: 5 })).toBe(
      "Market and experts converging"
    );
    // gap now -32.4, prior = -32.4 + 3 - (-6) = -23.4 -> gap GREW -> diverging
    expect(signalLabel({ hostRankDelta: 3, ecrDelta: -6, gap: -32.4 })).toBe(
      "Market and experts diverging"
    );
  });
  it("a converging pair is never labelled diverging", () => {
    // Diggs shape: market falls 4.2, experts rise 18, gap closes 50.1 -> 27.9
    expect(signalLabel({ hostRankDelta: -4.2, ecrDelta: 18, gap: -27.9 })).toBe(
      "Market and experts converging"
    );
  });
  it("diverging never collapses into Broad agreement", () => {
    expect(signalLabel({ hostRankDelta: 3, ecrDelta: -2, gap: 0 })).not.toBe(
      "Broad agreement"
    );
  });
  it("Both holding when neither side clears its threshold", () => {
    expect(signalLabel({ hostRankDelta: 2, ecrDelta: -1, gap: 4 })).toBe(
      "Both holding"
    );
  });
  it("thresholds are what the legend says they are", () => {
    expect(THRESHOLDS.HOST_RANK_MOVE).toBe(3);
    expect(THRESHOLDS.ECR_MOVE).toBe(2);
    expect(THRESHOLDS.GAP_NOTABLE).toBe(6);
  });
});
