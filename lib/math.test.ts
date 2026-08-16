import { describe, expect, it } from "vitest";
import {
  adpEcrGap,
  matchFfcToFp,
  movement,
  normalizeName,
  signalLabel,
  THRESHOLDS,
  type FfcLite,
  type FpLite,
} from "./math";

describe("adpEcrGap", () => {
  it("positive when market drafts later than expert rank", () => {
    expect(adpEcrGap(72, 61)).toBe(11);
  });
  it("negative when market pays earlier than expert rank", () => {
    expect(adpEcrGap(14, 22)).toBe(-8);
  });
  it("null when either side missing, never a fake zero", () => {
    expect(adpEcrGap(null, 12)).toBeNull();
    expect(adpEcrGap(12, null)).toBeNull();
    expect(adpEcrGap(null, null)).toBeNull();
  });
  it("rounds to one decimal", () => {
    expect(adpEcrGap(10.25, 8)).toBe(2.3);
  });
});

describe("movement", () => {
  it("positive = rising (ADP 72 → 61 means up 11 picks)", () => {
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
    expect(signalLabel({ adpDelta: null, ecrDelta: null, gap: 11 })).toBeNull();
    expect(signalLabel({ adpDelta: 5, ecrDelta: null, gap: 11 })).toBeNull();
  });
  it("Market moving faster: both move same way, market much harder", () => {
    expect(signalLabel({ adpDelta: 11, ecrDelta: 2, gap: 4 })).toBe(
      "Market moving faster"
    );
  });
  it("Broad agreement: both move same way at similar size", () => {
    expect(signalLabel({ adpDelta: 4, ecrDelta: 3, gap: 1 })).toBe(
      "Broad agreement"
    );
  });
  it("Experts moving first: ECR moves, market hasn't yet", () => {
    expect(signalLabel({ adpDelta: 1, ecrDelta: 4, gap: -3 })).toBe(
      "Experts moving first"
    );
  });
  it("Market catching up: market-only move that shrinks the gap", () => {
    // gap now +5; before the +6 rise it was +11 → move closed the gap
    expect(signalLabel({ adpDelta: 6, ecrDelta: 0, gap: 5 })).toBe(
      "Market catching up to experts"
    );
  });
  it("Market moving faster: market-only move that widens the gap", () => {
    // gap now -9; before the +6 rise it was -3 → market ran past experts
    expect(signalLabel({ adpDelta: 6, ecrDelta: 0, gap: -9 })).toBe(
      "Market moving faster"
    );
  });
  it("opposite directions, gap widening: diverging", () => {
    // prior gap = 5 + 6 - (-4) = 15; now 5 -> that SHRANK, so this is converging
    expect(signalLabel({ adpDelta: 6, ecrDelta: -4, gap: 5 })).toBe(
      "Market and experts converging"
    );
    // and the mirror case: prior gap = -2 + -5 - 3 = -10, now -2 -> shrank
    expect(signalLabel({ adpDelta: -5, ecrDelta: 3, gap: -2 })).toBe(
      "Market and experts converging"
    );
  });
  it("opposite directions split on DISTANCE, not just direction", () => {
    // gap now +5, prior gap = 5 + 6 - (-4) = 15 -> gap SHRANK -> converging
    expect(signalLabel({ adpDelta: 6, ecrDelta: -4, gap: 5 })).toBe(
      "Market and experts converging"
    );
    // gap now -32.4, prior = -32.4 + 3 - (-6) = -23.4 -> gap GREW -> diverging
    expect(signalLabel({ adpDelta: 3, ecrDelta: -6, gap: -32.4 })).toBe(
      "Market and experts diverging"
    );
  });
  it("a converging pair is never labelled diverging", () => {
    // Diggs shape: market falls 4.2, experts rise 18, gap closes 50.1 -> 27.9
    expect(signalLabel({ adpDelta: -4.2, ecrDelta: 18, gap: -27.9 })).toBe(
      "Market and experts converging"
    );
  });
  it("diverging never collapses into Broad agreement", () => {
    expect(signalLabel({ adpDelta: 3, ecrDelta: -2, gap: 0 })).not.toBe(
      "Broad agreement"
    );
  });
  it("Broad agreement still fires when neither side clears its threshold", () => {
    expect(signalLabel({ adpDelta: 2, ecrDelta: -1, gap: 4 })).toBe(
      "Broad agreement"
    );
  });
  it("thresholds are what the legend says they are", () => {
    expect(THRESHOLDS.ADP_MOVE).toBe(3);
    expect(THRESHOLDS.ECR_MOVE).toBe(2);
    expect(THRESHOLDS.GAP_NOTABLE).toBe(6);
  });
});

describe("normalizeName", () => {
  it("strips apostrophes and periods", () => {
    expect(normalizeName("Ja'Marr Chase")).toBe("jamarr chase");
    expect(normalizeName("D.J. Moore")).toBe("dj moore");
  });
  it("strips generational suffixes", () => {
    expect(normalizeName("Marvin Harrison Jr.")).toBe("marvin harrison");
    expect(normalizeName("Jeff Wilson III")).toBe("jeff wilson");
  });
});

const fp = (
  name: string,
  team: string,
  pos: string,
  ecr: number
): FpLite => ({
  player_id: Math.abs(name.length * 1000 + ecr),
  player_name: name,
  player_team_id: team,
  player_position_id: pos,
  rank_ecr: ecr,
});

const ffc = (
  id: number,
  name: string,
  team: string,
  pos: string
): FfcLite => ({ player_id: id, name, team, position: pos });

describe("matchFfcToFp", () => {
  const fpRows = [
    fp("Ja'Marr Chase", "CIN", "WR", 1),
    fp("Puka Nacua", "LAR", "WR", 2),
    fp("Josh Allen", "BUF", "QB", 20),
    fp("DJ Moore", "CHI", "WR", 40),
  ];

  it("exact name+team+pos match wins", () => {
    const r = matchFfcToFp([ffc(1, "Ja'Marr Chase", "CIN", "WR")], fpRows);
    expect(r.matched.get(1)?.rank_ecr).toBe(1);
    expect(r.unmatched).toHaveLength(0);
  });

  it("punctuation differences still match (D.J. vs DJ)", () => {
    const r = matchFfcToFp([ffc(2, "D.J. Moore", "CHI", "WR")], fpRows);
    expect(r.matched.get(2)?.rank_ecr).toBe(40);
  });

  it("team mismatch matches loosely but is logged, never silent", () => {
    const r = matchFfcToFp([ffc(3, "Puka Nacua", "HOU", "WR")], fpRows);
    expect(r.matched.get(3)?.rank_ecr).toBe(2);
    expect(r.teamMismatch).toHaveLength(1);
  });

  it("player missing from FP lands in unmatched, ECR stays null downstream", () => {
    const r = matchFfcToFp([ffc(4, "Jahmyr Gibbs", "DET", "RB")], fpRows);
    expect(r.matched.size).toBe(0);
    expect(r.unmatched.map((u) => u.name)).toEqual(["Jahmyr Gibbs"]);
  });

  it("two same-name same-pos candidates are ambiguous, never auto-picked", () => {
    const dupes = [...fpRows, fp("Josh Allen", "NE", "QB", 90)];
    const r = matchFfcToFp([ffc(5, "Josh Allen", "BUF", "QB")], dupes);
    // exact key (name+team+pos) still resolves BUF uniquely
    expect(r.matched.get(5)?.rank_ecr).toBe(20);
    // but a team-less row for the same name goes to ambiguous
    const r2 = matchFfcToFp([ffc(6, "Josh Allen", "FA", "QB")], dupes);
    expect(r2.matched.size).toBe(0);
    expect(r2.ambiguous).toHaveLength(1);
    expect(r2.ambiguous[0].candidates).toHaveLength(2);
  });
});
