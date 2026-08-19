/**
 * Archetype rules v2: role labels, the ONE canonical place these rules live.
 *
 * A label describes WHAT KIND OF NEWS MOVES A PLAYER, which is what connects
 * the archetype layer to the catalyst layer: a handcuff moves on starter
 * injury, a committee back on touch-split reporting, a crowded-room receiver
 * on depth chart news. Computed only from team, position and ADP, which are
 * on every row, plus the Sleeper injury designation and rookie flag.
 *
 * Replaces the v1 tenure buckets (Sophomore/Ascending/Prime/Veteran), which
 * told a drafter nothing actionable.
 *
 * Display only: archetype is not an input to any signal, ranking or
 * selection, and nothing here may leak into lib/math.ts or lib/story.ts.
 */

import overridesFile from "@/data/archetype_overrides.json";

export type Archetype = { tag: string; reason: string };

/** Only serious designations count as Injured, NOT day-to-day tags like
 *  "Questionable"/"Probable", which are too noisy.
 *
 *  KNOWN GAP, kept deliberately: this reads Sleeper's CURRENT injury_status,
 *  not injury HISTORY. A player two ACL tears into his career who is healthy
 *  today carries no Injured tag, because nothing in the data we store
 *  remembers the tears. Fixing it needs an injury-history source we do not
 *  have. */
export const SERIOUS_INJURY = new Set([
  "IR",
  "Out",
  "PUP",
  "NFI",
  "Doubtful",
  "Suspended",
  "COV",
]);

/**
 * Role gap thresholds, in ADP picks. CHOSEN, NOT FITTED, the same status as
 * the move thresholds in lib/math.ts: reasoned judgment calls awaiting
 * enough history to set honestly. Rendered on the methodology page.
 */
export const ARCHETYPE_GAPS = {
  /** RB: a team RB1 this many picks clear of the next back is a Lead back
   *  and the next back is his Handcuff; inside it the room is a Committee.
   *  30 rather than 25 so a reported 50-50 split priced ~25 picks apart
   *  (New England, Aug 2026) reads as the committee it is. */
  RB_ROLE: 30,
  /** WR: a team WR1 this many picks clear of the WR2 is an Alpha receiver. */
  WR_ROLE: 20,
  /** WR priced inside the first two rounds (12-team) is an Alpha receiver
   *  regardless of room position: a second-round price IS an alpha price,
   *  whoever lines up across from him. */
  WR_ALPHA_PRICE: 24,
} as const;

export const ARCHETYPE_RULES_DOC = [
  `Injured: Sleeper injury_status is one of ${[...SERIOUS_INJURY].join(", ")}. Day-to-day tags are ignored. Checked before every role rule.`,
  `Lead back: the team's RB1 by ADP with the next back at least ${ARCHETYPE_GAPS.RB_ROLE} picks behind.`,
  `Handcuff: the team's RB2 by ADP, at least ${ARCHETYPE_GAPS.RB_ROLE} picks behind the RB1.`,
  `Committee: any back within ${ARCHETYPE_GAPS.RB_ROLE} picks of the team's RB1, including the RB1 himself when the room is that tight.`,
  `Alpha receiver: ADP inside the first two rounds (≤ ${ARCHETYPE_GAPS.WR_ALPHA_PRICE}), or the team's WR1 by ADP with the WR2 at least ${ARCHETYPE_GAPS.WR_ROLE} picks behind.`,
  "Promoted: a room-mate priced above him carries the Injured tag, so his role just grew. Checked after Injured, before the price-gap roles.",
  "Rookie: first NFL season (years_exp 0) where no role label applies.",
  "No label: quarterbacks and tight ends by design, free agents, and anyone no rule matches. No placeholder is shown.",
  "Authored overrides: a short curated list (data/archetype_overrides.json) corrects rooms the price gap alone misreads, each with its reason stated; tag null removes a label.",
];

/** One row of what the role rules need. `id` is the FantasyPros player_id;
 *  `sleeperId` keys the authored overrides. */
export type ArchetypeInput = {
  id: number;
  sleeperId?: string | null;
  position: string;
  team: string;
  /** ADP (average host rank). */
  adp: number;
  years_exp: number | null;
  injury_status?: string | null;
};

const r1 = (n: number) => Math.round(n * 10) / 10;

type Override = { sleeper_id: string; name: string; tag: string | null; reason: string };
const OVERRIDES: Map<string, Override> = new Map(
  (overridesFile.overrides as Override[]).map((o) => [o.sleeper_id, o])
);

/**
 * Compute every player's archetype in one pass. Role labels need the whole
 * room, so this takes the full row set rather than one player at a time.
 * Free agents ("FA") have no room and carry no role label.
 */
export function buildArchetypes(players: ArchetypeInput[]): Map<number, Archetype> {
  const rooms = new Map<string, ArchetypeInput[]>();
  for (const p of players) {
    if (p.team === "FA") continue;
    const k = `${p.team}|${p.position}`;
    const g = rooms.get(k);
    if (g) g.push(p);
    else rooms.set(k, [p]);
  }
  for (const g of rooms.values()) g.sort((a, b) => a.adp - b.adp);

  // Who counts as injured for the Promoted rule: the serious designation OR
  // an authored override to Injured (e.g. a report the designation feed has
  // not caught up to). Precomputed so Promoted sees override-injuries too.
  const injuredIds = new Set<number>();
  for (const p of players) {
    const ov = p.sleeperId ? OVERRIDES.get(p.sleeperId) : undefined;
    const injured = ov
      ? ov.tag === "Injured"
      : !!(p.injury_status && SERIOUS_INJURY.has(p.injury_status.trim()));
    if (injured) injuredIds.add(p.id);
  }

  const out = new Map<number, Archetype>();
  for (const p of players) {
    // Authored overrides first: a short curated list correcting rooms the
    // price gap alone misreads, each with its reason stated. Tag null
    // removes the label.
    const ov = p.sleeperId ? OVERRIDES.get(p.sleeperId) : undefined;
    if (ov) {
      if (ov.tag) out.set(p.id, { tag: ov.tag, reason: ov.reason });
      continue;
    }
    // Injury next, the v1 rule kept verbatim: a genuine limitation, not a
    // retraction (current designation only, never history).
    if (p.injury_status && SERIOUS_INJURY.has(p.injury_status.trim())) {
      out.set(p.id, {
        tag: "Injured",
        reason: `Sleeper injury_status = "${p.injury_status}". Current designation only, not injury history.`,
      });
      continue;
    }

    let role: Archetype | null = null;
    const room = p.team === "FA" ? undefined : rooms.get(`${p.team}|${p.position}`);
    // Promoted: a room-mate priced ABOVE him carries the Injured tag, so his
    // role just grew. Checked before the price-gap roles because the injury
    // is the fresher fact; the gap rules describe the room as priced, this
    // describes the room as it stands. Injured itself (checked above) and
    // authored overrides still win.
    if (room) {
      const injuredAbove = room.find((t) => t.adp < p.adp && injuredIds.has(t.id));
      if (injuredAbove) {
        role = {
          tag: "Promoted",
          reason: `A room-mate priced above him (ADP ${r1(injuredAbove.adp)}) carries an injury designation.`,
        };
      }
    }
    if (!role && room && p.position === "RB") {
      const idx = room.indexOf(p);
      const leader = room[0];
      if (idx === 0) {
        const next = room.length > 1 ? room[1].adp - p.adp : Infinity;
        role =
          next >= ARCHETYPE_GAPS.RB_ROLE
            ? { tag: "Lead back", reason: `Team RB1 by ADP, next back ${room.length > 1 ? `${r1(next)} picks` : "nobody"} behind (bar: ${ARCHETYPE_GAPS.RB_ROLE}).` }
            : { tag: "Committee", reason: `Team RB1 with the next back ${r1(next)} picks behind (< ${ARCHETYPE_GAPS.RB_ROLE}).` };
      } else {
        const behind = p.adp - leader.adp;
        if (idx === 1) {
          role =
            behind >= ARCHETYPE_GAPS.RB_ROLE
              ? { tag: "Handcuff", reason: `Team RB2, ${r1(behind)} picks behind the RB1 (bar: ${ARCHETYPE_GAPS.RB_ROLE}).` }
              : { tag: "Committee", reason: `Team RB2, ${r1(behind)} picks behind the RB1 (< ${ARCHETYPE_GAPS.RB_ROLE}).` };
        } else if (behind < ARCHETYPE_GAPS.RB_ROLE) {
          role = { tag: "Committee", reason: `Within ${ARCHETYPE_GAPS.RB_ROLE} picks of the team RB1 (${r1(behind)} behind).` };
        }
      }
    } else if (!role && p.position === "WR" && p.adp <= ARCHETYPE_GAPS.WR_ALPHA_PRICE) {
      // A second-round price is an alpha price, whoever lines up across
      // from him: applies before the room rules and to FA receivers too.
      role = { tag: "Alpha receiver", reason: `ADP ${r1(p.adp)} inside the first two rounds (≤ ${ARCHETYPE_GAPS.WR_ALPHA_PRICE}).` };
    } else if (!role && room && p.position === "WR") {
      const idx = room.indexOf(p);
      if (idx === 0 && (room.length === 1 || room[1].adp - p.adp >= ARCHETYPE_GAPS.WR_ROLE)) {
        role = { tag: "Alpha receiver", reason: `Team WR1 by ADP, next receiver ${room.length > 1 ? `${r1(room[1].adp - p.adp)} picks` : "nobody"} behind (bar: ${ARCHETYPE_GAPS.WR_ROLE}).` };
      }
    }

    if (!role && p.years_exp === 0) {
      role = { tag: "Rookie", reason: "First NFL season, no role label applies." };
    }
    if (role) out.set(p.id, role);
  }
  return out;
}

/**
 * Product copy for each archetype, separate from `reason`.
 *
 * `reason` is the code condition and belongs in a tooltip or a log, not
 * printed to a drafter. `moves` is the one-line answer to what kind of news
 * moves this player, the point of the label. `caveat` exists only where a
 * rule has a genuine limitation worth stating (Injured).
 */
export const ARCHETYPE_PLAIN: Record<
  string,
  { definition: string; moves: string; caveat?: string }
> = {
  Handcuff: {
    definition: "The next back behind a clearly priced starter.",
    moves: "Moves on starter injury news.",
  },
  Committee: {
    definition: "One of two or more backs priced close together on one team.",
    moves: "Moves on touch-split reporting.",
  },
  "Lead back": {
    definition: "The clear RB1 on his team, nobody near him.",
    moves: "Moves on his own usage and health, not a teammate's.",
  },
  "Alpha receiver": {
    definition: "The clear WR1 on his team.",
    moves: "Moves on target share and quarterback news.",
  },
  Injured: {
    definition: "Carrying an injury designation right now.",
    moves: "Moves on recovery timelines.",
    caveat: "Reads his current status only, not his injury history.",
  },
  Rookie: {
    definition: "First NFL season, no role label yet.",
    moves: "Moves on camp reports and preseason usage.",
  },
  Promoted: {
    definition: "A player priced above him in his room is injured, so his role just grew.",
    moves: "Moves on the injured starter's recovery news, in the opposite direction.",
  },
};

/** Product copy for a tag, with a safe fallback rather than leaking `reason`. */
export function archetypePlain(tag: string): { definition: string; moves: string; caveat?: string } {
  return (
    ARCHETYPE_PLAIN[tag] ?? {
      definition: "Role read from team and price.",
      moves: "Moves on role news.",
    }
  );
}
