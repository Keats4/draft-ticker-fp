# ADR-005: The news lookback test is pre-registered before it is run

Date: 2026-08-14 · Status: Accepted · Relates to: ADR-004, EVALS.md section 7.2

## Context

EVALS.md section 7.2 records that eleven of thirteen eval payloads carried no
catalyst, and that a search afterwards found a real datable event for every
player checked. That establishes the catalyst file was incomplete. It does not
establish the thing the product actually claims, which is that price movement
and news are related at all. Everything found so far was found by searching
players already known to have moved, so it cannot distinguish "movers have
news" from "everybody has news."

The honest version of that question needs a control group and a searcher who
does not know which players moved. It also needs a decision rule fixed in
advance, because a threshold chosen after seeing the result is not a threshold,
it is a description of the result.

This document is written and committed before the search is run. That is the
whole point of it.

## The test

**Sample.** From the comparable universe on the 2026-08-10 to 2026-08-14
window: group M is every player whose ADP window move clears the 3 pick bar,
30 players. Group N is one control per mover, drawn from the same universe,
moving under 1 pick, matched on current ADP.

Matching is on ADP because news coverage tracks player prominence, and an
unmatched control would measure fame rather than movement. Matching maximises
the number of pairs inside a 5 pick caliper first, then assigns the remainder
at minimum total distance. 22 pairs are well matched. 8 are flagged and are
reported separately.

**Blinding.** The searching agent receives the 60 names, positions and teams in
random order and nothing else. No repo access, no group labels, no move
figures, no indication that a control group exists. The key is held back until
the search is complete.

**Protocol.** Date range 2026-08-03 to 2026-08-14. That range is derived rather
than chosen: ADP is a seven day trailing mean, so an event as early as Aug 3 is
still inside the support of a move observed on Aug 14. The same number of
queries, the same definition of a news event, and the same rule on syndicated
reprints apply to every player, decided before the search starts and not varied
by name.

## Decision, recorded before the result is known

The test supports the lookback hypothesis only if **both** hold:

1. The mover hit rate exceeds the control hit rate by **at least 25 percentage
   points** across all 30 pairs, and
2. The direction holds among the 22 well matched pairs alone.

A smaller difference is reported as **inconclusive at this sample size**, not
as weak support. A null result is **uninformative in either direction** and is
reported as such.

Twenty five points is roughly the smallest gap that means anything at 30
against 30. It is written here before the answer is known, because the
alternative is choosing the threshold while looking at the result.

**Second test, also pre-registered.** Among players with news, compare how many
days before the window end the news falls. A trailing mean predicts that mover
news clusters closer to the window than control news does. This is a more
specific prediction than presence alone, and a directional result here is
stronger evidence than the hit rate gap, because coverage volume does not
predict it.

## Known limits, recorded before the result is known

- **Movement and prominence are confounded in the population.** No player
  inside ADP 25 cleared the bar; 22 eligible controls sit there. Past pick 150
  there are 8 movers against 4 controls. Matching narrows this and does not
  close it, which is what the well matched subset is for.
- **The window is Aug 10 to Aug 14, not the Aug 10 to Aug 12 the eval payloads
  use.** The cron has added snapshots since those payloads were frozen. This
  test does not speak to the eval payloads directly.
- **A NONE FOUND is a real result.** If the searcher returns a high count of
  players with no news, that is the control group behaving as a control group
  should, not a failed search.
- **One search pass, one universe, one window.** Whatever comes back is a
  single observation and is reported that way.

## Outcome, added 2026-08-14 after the search ran

Inconclusive. The gap was +16.7 points against the +25 bar, and +4.5 points among the well matched pairs with McNemar p = 1.00. The pre-registered timing test pointed the right way and did not reach significance. Full results in `NEWS_LOOKBACK.md` and `data/news_lookback.json`; writeup in RESEARCH_LOG.md finding 13. Nothing above this line was edited after the result was known.

## Consequences

- If the test passes, the catalyst window and the corroboration count in
  data/catalysts.json have an empirical basis rather than only a mechanical
  one.
- If the test is inconclusive, that is the reportable outcome. It does not
  become support by relaxing the threshold afterwards.
- The result is recorded in RESEARCH_LOG.md whichever way it goes, including if
  it embarrasses the premise of the product.

## Costs accepted

- 30 against 30 is small. A 25 point rule means a real but modest effect will
  read as inconclusive here. That is preferred to a rule loose enough to
  confirm a hypothesis the data does not carry.
- Fixing the threshold in advance forfeits the option of reporting a 15 point
  gap as encouraging. That option is exactly what pre-registration exists to
  remove.
