import { describe, expect, it } from "vitest";
import phasesFile from "../data/calendar_phases.json";
import {
  SIGNAL_LEVELS,
  TRUST_READING,
  isPhaseLevel,
  trustReading,
  type PhaseLevel,
} from "./phases";

const phases = (phasesFile as { phases: { key: string; signal_level: string }[] })
  .phases;

describe("calendar phase trust levels", () => {
  // The guard. The first version of this map handled three levels while the
  // data carried four; the calendar was recalibrated to three authored tiers
  // on 2026-08-22 (vhigh retired), and this keeps map and data in lockstep.
  it("every signal_level in the data has a trust reading", () => {
    for (const p of phases) {
      expect(
        isPhaseLevel(p.signal_level),
        `phase "${p.key}" has signal_level "${p.signal_level}" which is not in SIGNAL_LEVELS`
      ).toBe(true);
      expect(
        TRUST_READING[p.signal_level as PhaseLevel],
        `phase "${p.key}" (${p.signal_level}) has no sentence in TRUST_READING`
      ).toBeTruthy();
    }
  });

  it("SIGNAL_LEVELS carries no level the data never uses", () => {
    const used = new Set(phases.map((p) => p.signal_level));
    for (const lvl of SIGNAL_LEVELS) {
      expect(used.has(lvl), `SIGNAL_LEVELS declares "${lvl}" but no phase uses it`).toBe(
        true
      );
    }
  });

  it("the data still carries the three levels this was written against", () => {
    const used = [...new Set(phases.map((p) => p.signal_level))].sort();
    expect(used).toEqual(["high", "low", "med"]);
  });

  it("an unknown level returns text that reads as a defect, not as copy", () => {
    const out = trustReading("catastrophic");
    expect(out).toContain("Unhandled trust level");
    expect(out).toContain("bug");
  });

  it("every reading is a complete sentence", () => {
    for (const [lvl, text] of Object.entries(TRUST_READING)) {
      expect(text.endsWith("."), `${lvl} reading does not end in a period`).toBe(true);
      expect(text[0], `${lvl} reading is not capitalised`).toBe(text[0].toUpperCase());
    }
  });
});
