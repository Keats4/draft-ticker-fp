/**
 * Eval grading rules, in one place so the page, the tests and the data cannot
 * drift apart.
 *
 * The five column keys were previously a local const inside EvalScorecard,
 * read as `r.grades?.[key] ?? null`. That meant renaming a key in
 * data/note_grades.json silently rendered every cell in that column as
 * ungraded, with no error and no build failure. Same shape as the cross
 * source join bug in RESEARCH_LOG finding 12: a lookup on an unstable key
 * that returns empty instead of throwing. lib/evals.test.ts now asserts every
 * key exists on every row of every pass, so that rename fails the test run.
 */

export const EVAL_COLUMNS = [
  { key: "ungrounded_claim", short: "Ungrounded" },
  { key: "numeric_drift", short: "Numeric" },
  { key: "causal_overreach", short: "Causal" },
  { key: "prediction", short: "Prediction" },
  { key: "hedge_mismatch", short: "Hedge" },
] as const;

export const EVAL_COLUMN_KEYS: readonly string[] = EVAL_COLUMNS.map((c) => c.key);

export type Grades = Record<string, boolean | null>;
export type EvalResult = { rows: number; pass: number; fail: number; live: number };

/** True when every one of the five cells carries a verdict. */
export function isComplete(g: Grades | undefined): boolean {
  return EVAL_COLUMN_KEYS.every((k) => (g?.[k] ?? null) !== null);
}

/**
 * EVALS.md section 3: "A note passes only if it passes all five. Any single
 * failure fails the note." This is that rule as code rather than as a
 * sentence. An incomplete row returns null, never a verdict.
 */
export function derivePass(g: Grades | undefined): boolean | null {
  if (!isComplete(g)) return null;
  return EVAL_COLUMN_KEYS.every((k) => g?.[k] === true);
}

/**
 * Counts derived from the cells. `live` is NOT derivable from a grade sheet,
 * it is a fact about the product, so it is carried through from the recorded
 * result rather than invented here.
 */
export function deriveResult(
  rows: { grades: Grades }[],
  live: number
): EvalResult {
  const verdicts = rows.map((r) => derivePass(r.grades));
  return {
    rows: rows.length,
    pass: verdicts.filter((v) => v === true).length,
    fail: verdicts.filter((v) => v === false).length,
    live,
  };
}

/** Field-by-field comparison, used to surface a warning rather than to pick a winner. */
export function resultsDisagree(
  derived: EvalResult,
  recorded: EvalResult | null
): boolean {
  if (!recorded) return false;
  return (
    derived.rows !== recorded.rows ||
    derived.pass !== recorded.pass ||
    derived.fail !== recorded.fail ||
    derived.live !== recorded.live
  );
}
