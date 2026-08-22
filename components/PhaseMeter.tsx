/** Calendar trust meter. Shared by /calendar and the homepage hero so the two
 *  can never drift apart. null level renders "pending", never a fake bar. */
export type PhaseLevel = "low" | "med" | "high" | null;

const LEVEL_LABEL: Record<string, string> = {
  low: "Low",
  med: "Medium",
  high: "High",
};

export default function PhaseMeter({ level }: { level: PhaseLevel }) {
  if (!level)
    return <span className="text-xs italic text-[var(--ink-3)]">pending</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`meter ${level}`}>
        <i />
        <i />
        <i />
      </span>
      <span className="text-xs text-[var(--ink-2)]">{LEVEL_LABEL[level]}</span>
    </span>
  );
}
