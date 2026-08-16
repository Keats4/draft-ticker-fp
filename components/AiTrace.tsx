/**
 * AI-transparency shell, UI only, no AI calls yet. Renders a placeholder note
 * slot with an expandable trace of the exact inputs a future explanation would
 * be allowed to use. Nothing here is generated.
 *
 * Uses <details> rather than React state so the trace, and the grounding
 * claim under it, are present in the server output and work with JavaScript
 * off. The claim itself now links to the file it cites: EVALS.md has no route
 * on the deployed site, so a visitor previously could not check it.
 */
const EVALS_URL =
  "https://github.com/Keats4/draft-ticker/blob/main/EVALS.md";

export default function AiTrace({ inputs }: { inputs: string[] }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-center gap-2">
        <span className="rounded bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
          Note slot
        </span>
        <span className="text-xs text-[var(--ink-3)]">
          A one-to-two sentence plain-language note will appear here once the
          explanation layer ships behind evals. No AI text is generated yet.
        </span>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs underline text-[var(--ink-2)]">
          Based on: [inputs]
        </summary>
        <ul className="mt-2 list-disc pl-5 text-xs text-[var(--ink-2)]">
          {inputs.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </details>

      <p className="mt-2 text-[11px] text-[var(--ink-3)]">
        No facts beyond these inputs will ever be used. Grounding and
        directionality are graded against{" "}
        <a
          href={EVALS_URL}
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          EVALS.md
        </a>{" "}
        before any note goes live, and both grading passes are published on the{" "}
        <a href="/methodology" className="underline">
          methodology page
        </a>
        .
      </p>
    </div>
  );
}
