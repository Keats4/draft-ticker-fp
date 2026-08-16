import { describe, expect, it } from "vitest";
import gradesFile from "../data/note_grades.json";
import {
  EVAL_COLUMN_KEYS,
  derivePass,
  deriveResult,
  isComplete,
  resultsDisagree,
  type Grades,
} from "./evals";

type Row = { case: string; grades: Grades; pass: boolean | null };
type Pass = { rows: Row[]; result: { rows: number; pass: number; fail: number; live: number } | null };

const PASSES: [string, Pass][] = [
  ["pass_1", gradesFile.pass_1 as unknown as Pass],
  ["pass_2", gradesFile.pass_2 as unknown as Pass],
];

describe("grade key integrity", () => {
  // The guard. EvalScorecard reads r.grades?.[key] ?? null, so a renamed or
  // dropped key renders as "ungraded" with no error. This turns that silent
  // failure into a red test.
  for (const [name, p] of PASSES) {
    it(`${name}: every row carries all five column keys`, () => {
      for (const row of p.rows) {
        for (const key of EVAL_COLUMN_KEYS) {
          expect(
            Object.prototype.hasOwnProperty.call(row.grades, key),
            `${name} row "${row.case}" is missing grade key "${key}"`
          ).toBe(true);
        }
      }
    });

    it(`${name}: no row carries a grade key outside the five columns`, () => {
      for (const row of p.rows) {
        for (const key of Object.keys(row.grades)) {
          expect(
            EVAL_COLUMN_KEYS.includes(key),
            `${name} row "${row.case}" has unknown grade key "${key}"`
          ).toBe(true);
        }
      }
    });
  }
});

describe("derivePass", () => {
  it("passes only when all five cells are true", () => {
    const all = Object.fromEntries(EVAL_COLUMN_KEYS.map((k) => [k, true]));
    expect(derivePass(all)).toBe(true);
  });

  it("any single false fails the note", () => {
    for (const key of EVAL_COLUMN_KEYS) {
      const g = Object.fromEntries(EVAL_COLUMN_KEYS.map((k) => [k, true]));
      g[key] = false;
      expect(derivePass(g), `${key} false should fail the row`).toBe(false);
    }
  });

  it("any null leaves the row ungraded rather than passing it", () => {
    for (const key of EVAL_COLUMN_KEYS) {
      const g: Grades = Object.fromEntries(EVAL_COLUMN_KEYS.map((k) => [k, true]));
      g[key] = null;
      expect(derivePass(g), `${key} null should leave the row ungraded`).toBe(null);
    }
  });

  it("isComplete tracks the same condition", () => {
    const g: Grades = Object.fromEntries(EVAL_COLUMN_KEYS.map((k) => [k, true]));
    expect(isComplete(g)).toBe(true);
    g[EVAL_COLUMN_KEYS[0]] = null;
    expect(isComplete(g)).toBe(false);
  });
});

describe("committed grades agree with the derived verdicts", () => {
  for (const [name, p] of PASSES) {
    it(`${name}: stored row.pass matches the AND of its cells`, () => {
      for (const row of p.rows) {
        expect(row.pass, `${name} row "${row.case}"`).toBe(derivePass(row.grades));
      }
    });

    it(`${name}: stored result matches the derived counts`, () => {
      const derived = deriveResult(p.rows, p.result?.live ?? 0);
      expect(resultsDisagree(derived, p.result)).toBe(false);
    });
  }
});
