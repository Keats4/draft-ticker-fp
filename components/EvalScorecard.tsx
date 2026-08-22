import { Fragment } from "react";
import grades from "@/data/note_grades.json";
import {
  EVAL_COLUMNS,
  derivePass,
  deriveResult,
  isComplete,
  resultsDisagree,
  type EvalResult,
  type Grades,
} from "@/lib/evals";

/**
 * Explanation eval scorecard. Reads data/note_grades.json and renders it.
 *
 * Two things ARE enforced here, and only two. The verdict shown for a row is
 * the AND of its five cells, computed by lib/evals.ts derivePass, not the
 * `pass` field typed into the file. The empty state is keyed on whether every
 * cell carries a verdict, not on whether a result object happens to exist, so
 * a typed verdict over an ungraded table cannot render.
 *
 * The recorded values are kept and shown beside the derived ones. Where they
 * disagree the page says so rather than silently preferring either. Everything
 * else about this harness, that a human graded each cell and that the
 * regression set is re-run before a prompt change ships, is a convention with
 * no mechanism behind it. EVALS.md section 9 says which is which.
 */
type Row = {
  case: string;
  player: string;
  note: string;
  data_given: Record<string, unknown>;
  grades: Grades;
  pass: boolean | null;
  grader_note?: string;
  regenerated?: string;
};
type Pass = {
  date: string | null;
  contract: string;
  result: EvalResult | null;
  finding?: string;
  rows: Row[];
};

function Cell({ v }: { v: boolean | null }) {
  if (v === null || v === undefined)
    return <span className="text-[var(--ink-3)]" title="ungraded">·</span>;
  return v ? (
    <span style={{ color: "var(--pos)" }} title="pass">pass</span>
  ) : (
    <span style={{ color: "var(--neg)" }} title="fail">fail</span>
  );
}

function PassBanner({ n, p }: { n: number; p: Pass }) {
  const derived = deriveResult(p.rows, p.result?.live ?? 0);
  const disagrees = resultsDisagree(derived, p.result);
  const graded = p.rows.filter((r) => isComplete(r.grades)).length;
  const complete = graded === p.rows.length && p.rows.length > 0;

  if (!complete) {
    return (
      <p className="mt-2 rounded border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--ink-3)]">
        Pass {n} is not scored. {graded} of {p.rows.length} notes have all five
        cells marked. No verdict is shown, and none is computed, until every
        cell carries one. A result typed into the file while cells are blank
        will not render here.
      </p>
    );
  }

  return (
    <div
      className="mt-2 rounded-lg border px-3 py-2"
      style={{ background: "var(--gold-bg)", borderColor: "var(--gold-border)" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
        Pass {n} · {p.date} · {derived.pass} of {derived.rows} passed,{" "}
        {derived.fail} failed, {derived.live} live
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--ink-3)]">
        Derived from the cells. Recorded in the file:{" "}
        {p.result
          ? `${p.result.pass} of ${p.result.rows} passed, ${p.result.fail} failed`
          : "no result recorded"}
        . Contract: {p.contract}.
      </p>
      {disagrees && (
        <p
          className="mt-1 rounded border px-2 py-1 text-[11px] font-semibold"
          style={{ color: "var(--neg)", borderColor: "var(--neg)" }}
        >
          Recorded and derived results disagree. The figure above is derived
          from the cells; the recorded value is wrong and should be corrected in
          data/note_grades.json.
        </p>
      )}
      {p.finding && <p className="mt-1 text-xs text-[var(--ink-2)]">{p.finding}</p>}
    </div>
  );
}

export default function EvalScorecard() {
  const schema = grades._schema as {
    columns: Record<string, string>;
    grade_values: string;
    graded_by: string;
    passes: string;
  };
  const p1 = grades.pass_1 as unknown as Pass;
  const p2 = grades.pass_2 as unknown as Pass;
  const rows = p2.rows ?? [];
  const d1 = deriveResult(p1.rows, p1.result?.live ?? 0);
  const d2 = deriveResult(p2.rows, p2.result?.live ?? 0);
  const bothComplete =
    p1.rows.every((r) => isComplete(r.grades)) &&
    p2.rows.every((r) => isComplete(r.grades));

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">Explanation eval scorecard</p>
        <p className="text-xs font-semibold text-[var(--ink-2)]">{schema?.graded_by}</p>
      </div>

      {/* Summary first: the two passes and the finding between them, every
          figure derived from the graded cells (never the typed result). The
          complete graded evidence sits behind the disclosure below. */}
      {bothComplete && (
        <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="shrink-0 text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
              Pass 1 · {p1.date}
            </p>
            <p className="text-2xl font-bold tabular-nums leading-tight text-[var(--text-info)]">
              {d1.pass} / {d1.rows}
            </p>
            <p className="text-[11px] text-[var(--ink-2)]">
              <span style={d1.fail > 0 ? { color: "var(--neg)", fontWeight: 600 } : undefined}>
                {d1.fail} failed
              </span>{" "}
              · {d1.live} live
            </p>
          </div>
          <span aria-hidden className="hidden text-[var(--ink-3)] sm:block">→</span>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--gold-ink)" }}>
              Contract defect found
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-[var(--ink-2)]">
              The failing phrasing was instructed by the grading contract
              itself; the vocabulary / contradiction rule was amended and the
              full set re-run against identical payloads.
            </p>
          </div>
          <span aria-hidden className="hidden text-[var(--ink-3)] sm:block">→</span>
          <div className="shrink-0 text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
              Pass 2 · {p2.date}
            </p>
            <p className="text-2xl font-bold tabular-nums leading-tight text-[var(--text-info)]">
              {d2.pass} / {d2.rows}
            </p>
            <p className="text-[11px] text-[var(--ink-2)]">{d2.fail} failed</p>
          </div>
          <span aria-hidden className="hidden text-[var(--ink-3)] sm:block">→</span>
          <div
            className="shrink-0 rounded-lg border px-3 py-2 text-center"
            style={{ borderColor: "var(--border-info-soft)" }}
          >
            <p className="text-base font-bold tabular-nums leading-tight">{d2.live} live</p>
            <p className="text-[10px] text-[var(--ink-3)]">usefulness criterion pending</p>
          </div>
        </div>
      )}

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">Rubric</p>
        <dl className="mt-1.5 grid grid-cols-1 divide-y divide-[var(--border)] text-xs text-[var(--ink-2)] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x lg:divide-[var(--border-info-soft)]">
          {EVAL_COLUMNS.map((c, i) => (
            <div key={c.key} className={`py-1.5 lg:py-0 ${i === 0 ? "lg:pr-3" : "lg:px-3"}`}>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-2)]">{c.short}</dt>
              <dd className="mt-0.5 text-[11px] leading-snug text-[var(--ink-3)]">{schema?.columns?.[c.key]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-1 text-[11px] text-[var(--ink-3)]">{schema?.grade_values}</p>
        <p className="mt-1 text-[11px] text-[var(--ink-3)]">
          Two rules sit outside the five columns and decide cases the columns
          cannot. <span className="font-medium">Vocabulary:</span> the payload&rsquo;s
          signal field is always a label, so a note may name the label and may
          say movement fell below a published threshold, but may never claim no
          signal exists. <span className="font-medium">Edge cases:</span> a
          correct refusal to generate passes all five, restating the signal
          label counts as grounded, and describing the sign of the gap is not a
          prediction while telling the reader what to do about it is. The
          vocabulary rule is what pass 1 exposed and what pass 2 tests.
        </p>
      </div>

      <details className="mt-3">
        <summary className="disclose">View all 13 graded cases</summary>
        <PassBanner n={1} p={p1} />
        <PassBanner n={2} p={p2} />
        <p className="mt-2 text-[11px] text-[var(--ink-3)]">
          Every verdict is computed from the cells below: a note passes only
          if all five are marked pass. The values recorded in the file are
          shown beside the computed ones so a disagreement is visible rather
          than assumed away.
        </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--ink-3)]">
              <th className="py-1.5 pr-3">Case</th>
              <th className="py-1.5 pr-3">Player</th>
              {EVAL_COLUMNS.map((c) => (
                <th key={c.key} className="py-1.5 pr-3 text-center">{c.short}</th>
              ))}
              <th className="py-1.5 text-center">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const derived = derivePass(r.grades);
              const mismatch = r.pass !== derived;
              return (
                <Fragment key={r.case}>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-1.5 pr-3 align-top text-[var(--ink-3)]">{r.case}</td>
                    <td className="py-1.5 pr-3 align-top font-medium">{r.player}</td>
                    {EVAL_COLUMNS.map((c) => (
                      <td key={c.key} className="py-1.5 pr-3 text-center align-top">
                        <Cell v={r.grades?.[c.key] ?? null} />
                      </td>
                    ))}
                    <td className="py-1.5 text-center align-top">
                      <Cell v={derived} />
                      {mismatch && (
                        <span
                          className="ml-1 font-semibold"
                          style={{ color: "var(--neg)" }}
                          title={`recorded as ${String(r.pass)}, cells derive ${String(derived)}`}
                        >
                          !
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--border)] last:border-0">
                    <td colSpan={EVAL_COLUMNS.length + 3} className="pb-2">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-[11px] text-[var(--ink-3)]">
                          Note, payload and grader reason
                        </summary>
                        <div className="mt-2 space-y-2 rounded border border-[var(--border)] bg-[var(--background)] p-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                              Generated note
                            </p>
                            <p className="mt-0.5 text-[var(--ink-2)]">{r.note}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                              Payload it was allowed to use
                            </p>
                            <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-[var(--ink-2)]">
                              {JSON.stringify(r.data_given, null, 1)}
                            </pre>
                          </div>
                          {r.grader_note && (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                                Grader reason
                              </p>
                              <p className="mt-0.5 text-[var(--ink-2)]">{r.grader_note}</p>
                            </div>
                          )}
                          {r.regenerated && (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                                Versus pass 1
                              </p>
                              <p className="mt-0.5 text-[var(--ink-2)]">{r.regenerated}</p>
                            </div>
                          )}
                        </div>
                      </details>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] text-[var(--ink-3)]">{schema?.passes}</p>
      </details>
    </div>
  );
}
