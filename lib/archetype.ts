/**
 * Archetype rules v1: the ONE canonical place these rules live.
 * Rules-based only, from Sleeper metadata we already store
 * (position, years_exp, age, injury_status). No model, no guessing.
 *
 * NOTE: scripts/build_player_map.mjs mirrors these thresholds to log
 * unclassifiable players at build time. Keep the two in sync, this file
 * is canonical.
 */

export type PlayerMeta = {
  position: string;
  years_exp: number | null;
  age: number | null;
  injury_status?: string | null;
};

export type Archetype = { tag: string; reason: string };

/** Only serious designations count as an injury-return placeholder, NOT
 *  day-to-day tags like "Questionable"/"Probable", which are too noisy.
 *
 *  KNOWN GAP: this reads Sleeper's CURRENT injury_status, not injury HISTORY.
 *  A player two ACL tears into his career who is healthy today carries no
 *  Injury-Return tag, because nothing in the data we store remembers the
 *  tears. Fixing it needs an injury-history source we do not have. */
export const SERIOUS_INJURY = new Set([
  "IR",
  "Out",
  "PUP",
  "NFI",
  "Doubtful",
  "Suspended",
  "COV",
]);

export const ARCHETYPE_RULES_DOC = [
  `Injury-Return (placeholder): injury_status is one of ${[...SERIOUS_INJURY].join(", ")}. Day-to-day tags are ignored. Full version waits on curated catalyst data.`,
  "Rookie WR / Rookie RB: years_exp === 0 and position is WR or RB.",
  "Rookie (other): years_exp === 0, any other position.",
  "Sophomore: years_exp === 1.",
  "Ascending: years_exp 2–3. Tenure only, this is NOT a claim about usage or role.",
  "Prime: years_exp 4–5 and age < 30. Tenure only, NOT a usage claim.",
  "Veteran: years_exp ≥ 6 or age ≥ 30.",
  "Unclassified: none of the above. Logged for review, no chip shown. Kickers and defenses never reach this file, they are dropped from the pipeline in lib/universe.ts.",
];

export function archetype(m: PlayerMeta): Archetype | null {
  const { position, years_exp, age, injury_status } = m;

  if (injury_status && SERIOUS_INJURY.has(injury_status.trim())) {
    return {
      tag: "Injury-Return",
      reason: `Sleeper injury_status = "${injury_status}" (placeholder rule; refined once catalyst data lands).`,
    };
  }
  if (years_exp === 0) {
    if (position === "WR") return { tag: "Rookie WR", reason: "years_exp = 0, position WR." };
    if (position === "RB") return { tag: "Rookie RB", reason: "years_exp = 0, position RB." };
    return { tag: "Rookie", reason: `years_exp = 0, position ${position}.` };
  }
  if (years_exp === 1) return { tag: "Sophomore", reason: "years_exp = 1." };
  // Veteran is checked BEFORE the 2-5 band below via its age clause, so a
  // 30+ player never lands in Ascending/Prime. Both new tags are tenure cuts
  // and say nothing about a player's role or usage.
  if (years_exp === 2 || years_exp === 3) {
    if (!(age != null && age >= 30))
      return { tag: "Ascending", reason: `years_exp = ${years_exp} (2–3), tenure only, not a usage claim.` };
  }
  if ((years_exp === 4 || years_exp === 5) && !(age != null && age >= 30)) {
    return { tag: "Prime", reason: `years_exp = ${years_exp} (4–5), age ${age ?? "unknown"} < 30, tenure only, not a usage claim.` };
  }
  if ((years_exp != null && years_exp >= 6) || (age != null && age >= 30)) {
    return {
      tag: "Veteran",
      reason:
        years_exp != null && years_exp >= 6
          ? `years_exp = ${years_exp} (≥ 6).`
          : `age = ${age} (≥ 30).`,
    };
  }
  return null;
}

/**
 * Product copy for each archetype, separate from `reason`.
 *
 * `reason` is the code condition ("years_exp = 4 (4-5), age 27 < 30, tenure
 * only, not a usage claim") and belongs in a tooltip or a log, not printed to
 * a drafter on a player page. These are the same facts in words, plus the
 * honesty caveat kept as its own short line rather than folded into operators.
 */
export const ARCHETYPE_PLAIN: Record<string, { definition: string; caveat: string }> = {
  "Rookie WR": {
    definition: "First NFL season, wide receiver.",
    caveat: "This is a tenure grouping, not a claim about his role.",
  },
  "Rookie RB": {
    definition: "First NFL season, running back.",
    caveat: "This is a tenure grouping, not a claim about his role.",
  },
  Rookie: {
    definition: "First NFL season.",
    caveat: "This is a tenure grouping, not a claim about his role.",
  },
  Sophomore: {
    definition: "Second NFL season.",
    caveat: "This is a tenure grouping, not a claim about his role.",
  },
  Ascending: {
    definition: "Third or fourth year.",
    caveat: "This is a tenure grouping, not a claim about his role.",
  },
  Prime: {
    definition: "Fourth or fifth year, under 30.",
    caveat: "This is a tenure grouping, not a claim about his role.",
  },
  Veteran: {
    definition: "Six or more seasons.",
    caveat: "This is a tenure grouping, not a claim about his role.",
  },
  "Injury-Return": {
    definition: "Carrying an injury designation right now.",
    caveat: "Reads his current status only, not his injury history.",
  },
};

/** Product copy for a tag, with a safe fallback rather than leaking `reason`. */
export function archetypePlain(tag: string): { definition: string; caveat: string } {
  return (
    ARCHETYPE_PLAIN[tag] ?? {
      definition: "Grouped by tenure.",
      caveat: "This is a tenure grouping, not a claim about his role.",
    }
  );
}
