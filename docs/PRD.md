# Draft Ticker: Product Requirements and Decision Log

Live: https://draft-ticker-fp.vercel.app · Repository:
https://github.com/Keats4/draft-ticker-fp

## 1. Problem

FantasyPros publishes both sides of the market. Expert Consensus Rankings
carry the analyst view. Consensus ADP carries the crowd. Player pages chart
the two together, daily, with smoothing on the expert line. Real-Time ADP
adds 24 hour and 7 day movement.

FantasyPros already has the core data. The remaining opportunity is helping
a drafter interpret whether a move matters.

A ten spot move in June looks the same on the page as a ten spot move the
day after starters played a real game. A move with a confirmed injury in its
window looks the same as one with no documented event near it.

The question a drafter asks when a number changes is whether it means
anything and whether to act. Nothing on the page answers it.

Draft Ticker is the interpretation layer on data FantasyPros already owns,
and the structured input an assistant needs to answer that question in
conversation.

## 2. Objective

A returning drafter opens the site and knows, inside a couple of minutes,
which prices have moved enough to matter since their last session, whether
the experts moved with the market or against it, whether a verified event
sits near each move, and how much weight this point in the calendar
deserves.

Nothing on the page tells them who to draft.

## 3. User

A redraft drafter between June and early September, checking in every few
days as their draft approaches.

They arrive with one of two questions. Which prices have moved enough since
last time to matter, and for a given player, has anything changed that
should affect how they plan around him.

They leave with a short list of real moves, an answer on each about which
side moved first, a sourced event where one exists and an explicit absence
where it does not, and a reading of how much this time of year is worth.

Dynasty and season long trade managers are a natural second audience. Out of
scope here, for the reason in section 7.

## 4. Product

### Series

Both series come from the FantasyPros API on one issued key. Nothing is
scraped.

**Expert.** Expert Consensus Rankings, Draft PPR.

**Price.** Consensus average host rank, the mean of a player's rank across
up to five league host boards. An average rank, not a draft slot. Surfaces
call it ADP because that is the term the reader knows; methodology carries
the exact definition.

No source publishes daily history, so history is accumulated by capture. The
series starts at the first capture and grows a day at a time.

### Movement

A move registers above a published bar. Both bars are stated on the site and
in the interface legend.

Movement spans only dates both series share, so the two sides of a
comparison never cover different windows. It is computed only over host
boards present on both days, so a board adding or dropping a player is not
mistaken for a repricing. Neither rule was there originally. Both were added
after the missing version shipped a defect, in section 10.

### Signal

Seven states plus an explicit null: market moving faster, experts moving
first, market catching up to experts, converging, diverging, broad
agreement (both sides repricing together), both holding (neither side
cleared its bar).

Signals compute inside the comparison universe only: top 200 by both series,
ranked by at least four of five host boards. A player carried by one board
produces movement that is mostly noise, so the coverage bar keeps him out of
the comparison.

### Catalysts

Dated events, each with a player, a date, a primary source URL, a category,
a factual summary and a short display label.

A signal reads verified event in window when one falls inside the
move window or the seven day lookback. Otherwise it reads unexplained, shown
as watch rather than act. The empty state is deliberate: a move with no
documented event near it is flagged as exactly that.

`verified: true` means the event and its date have been confirmed against
the primary source. Sourcing is automated, verification is not. A model can
check whether a summary matches its page, but the failures that actually
occurred here were dates, so a person confirms the date before the flag is
set. Section 11 covers what this becomes at scale.

### Calendar

Twelve phases derived from real season dates, each carrying an authored
trust reading. The reading renders as a meter beside featured moves on the
hero and player pages. It is kept off the market table and the story cards,
where one phase wide value would repeat identically down a screen. It
renders only at high, very high or low. At medium it stays silent.

### Archetypes

Seven labels for what kind of news moves a player: handcuff, committee, lead
back, alpha receiver, promoted, injured, rookie. Each states what would move
him.

Derived from team, position, price, injury designation and rookie status,
with a short authored override file for rooms the price misreads. Overrides
carry their reason, which renders in the label. Archetypes are display only
and feed no signal, ranking or selection.

## 5. Functional requirements

### Market view

- Displays current ADP, ECR, the gap between them, movement over the shared
  window, signal state and evidence state for every player in the comparison
  universe.
- Excludes players outside the comparison universe from all signal and gap
  computation.
- Uses one observation window for both series on every comparison.
- Computes price movement only over host boards present on both endpoint
  days.
- Renders a missing value as an explicit absence, never as zero.
- Every row links to player detail.

### Player detail

- Charts both series across the full stored history, aligned on shared
  dates.
- Marks verified catalysts falling inside the observation window or its
  stated lookback.
- Distinguishes verified event in window from unexplained, and states which
  applies.
- Displays the source count and capture date behind the current values.
- Displays the archetype label with its one line statement of what moves
  this player.
- Displays the calendar trust reading beside the movement line.

### Plain lead

- Selects up to three players whose price movement clears the published bar,
  ordered by the same ranking used elsewhere.
- States each move, the expert response and the newest verified event in
  plain language, without product vocabulary.
- Renders nothing when no player qualifies.

### Calendar

- Derives the current phase from real season dates rather than a stored
  flag.
- Displays trust only at low, high or very high; renders nothing at medium.
- Never alters the deterministic market signal.

### Catalysts

- Every entry carries a player, a date, a primary source URL, a category, a
  summary and a short display label.
- Only entries flagged verified are eligible to change a rendered evidence
  state.
- Evidence state is display only and does not feed signal, ranking or
  selection.

## 6. Acceptance criteria

- If a host board carries a player on the first day of a window but not the
  second, that board is excluded from his movement calculation, and if fewer
  than four boards remain he shows no movement rather than a partial one.
- If no verified catalyst falls inside the window or its lookback, the
  interface renders unexplained. It never generates an explanation, and
  never infers a cause from an event affecting a different player.
- If either series fails the coverage requirement, no comparative signal is
  shown for that player.
- Both series in any comparison span identical dates. A comparison across
  unequal windows is a defect, not a degraded state.
- Every rendered catalyst resolves to a primary source URL, and every
  verified flag corresponds to a human confirmation of the event and its
  date.
- Every published threshold appearing in the interface matches the value in
  code. A threshold change that does not update the interface is a defect.

## 7. Non goals

**Not a news feed.** FantasyPros runs one. This surfaces the price response
to news.

**Not a rankings product.** No player valuations, no opinion on who is good.

**Not an assistant.** Coach AI already answers questions in league context.
This produces the market layer that assistant cannot currently read, and is
built to be consumed by it.

**No causal claims.** The evidence tier reports coincidence inside a stated
window. When two events coincide, both are listed.

**No prediction.** Nothing forecasts a price or a performance.

**No in season pricing.** After drafts close, draft position stops existing
and the real price becomes roster percentage and waiver spend. Different
data, described as a concept and not built. Also why the dynasty and trade
use case in section 3 is out of scope.

**No opaque scoring.** No composite index, no blended confidence number.
Every bar is published and every label traces to a rule.

## 8. Success criteria

Two kinds. The first ask whether the interpretation system is right. The
second ask whether the product gets used. Only the first can be tested with
what exists today.

### Interpretation validation

**The calendar is falsifiable.** It asserts that identical movement carries
different information depending on when it lands. The test is whether moves
in high trust phases persist and moves in low trust phases revert. Needs a
season of history. If it fails, the trust weighting comes out.

**The signal should discriminate.** Players labelled market moving faster
should behave differently over subsequent weeks than players labelled broad
agreement. If the states separate on nothing, they are describing noise.

**Catalysts must beat a base rate.** A blind matched test found 68 percent
of comparable players carry a qualifying news event in any twelve day
window, with movers statistically indistinguishable from non movers on
presence alone. The movers half of that test needs re running on the
current data. Either way, presence is nearly worthless as a filter, so
attribution needs a precision target.

**Interpretation quality.** On a sampled review, a competent analyst agrees
with the reading a player page gives. This is the same check that scales to
the sampled precision audit in section 11.

### Product metrics

Measurable standalone:

- Repeat use during preseason among users with an upcoming draft. Primary
  metric.
- Click through from the market view into player detail.
- Sessions reading two or more players.
- Seven day return rate.
- Whether a sampled user can correctly state why a player moved after using
  the page, which tests comprehension rather than traffic.

Measurable only inside FantasyPros:

- Entries into Draft Wizard or Draft Assistant originating here.
- Premium conversion among users who reach this surface.
- Preseason retention against users who do not.

No targets are set. Setting one requires a baseline, and the standalone
version has no traffic to draw from.

## 9. Known limitations

Stated on the site, not only here.

- History is days old. Charts are short and moves are small.
- Bars are reasoned rather than fitted. A first distribution check exists.
  Proper percentile matching needs weeks of windows.
- Calendar trust and archetypes are displayed but are not signal inputs.
- Generated explanation notes are built and graded but held. Section 10.
- The in season index is a concept. Roster percentage and waiver prices do
  not exist until Week 1.
- Two of five host boards are identifiable by name. The API does not name
  the rest.
- Host coverage varies by scoring format, and one host publishes roughly 25
  hours behind the others.

## 10. Decisions reversed

**Catalyst provenance.** An audit found entries documented as hand curated
had been agent generated, and that a script had set every verification flag
in one pass. The standard was split into three parts that no longer travel
together: sourcing earns no trust, attribution requires a primary source,
verification requires a human. Flags were withdrawn and re earned.

**Archetypes.** The first version grouped by tenure, which told a drafter
nothing actionable and needed a disclaimer under every label. The second
describes what kind of news moves a player, which ties the archetype to the
catalyst layer.

**Two measurement bugs, caught after shipping.** Movement was compared
across windows of unequal length, inflating one signal state across most of
the board. Price deltas were computed across changing sets of source boards,
so a board dropping a player registered as a repricing. A test caught
neither. Both turned up by checking a rendered number against its inputs.

**Explanation notes, built and held.** Thirteen notes were generated and
graded twice against a written contract of named failure modes. A payload
defect invalidated the second pass: the catalyst fields feeding the notes
were wrong, and every check grades a note against its payload, so a note
faithfully reporting bad inputs passes all of them. No amount of stricter
grading reaches a defect in the inputs.

## 11. The AI layer

FantasyPros already runs the right surface. Coach AI answers draft, trade,
waiver and start or sit questions inside a user's league context.

What an assistant can say is bounded by what it can read. Coach AI can rank
a player, weigh him against a roster and explain a projection. It cannot say
he got five picks cheaper this week, that the market moved before the
experts did, or that a hamstring reported Thursday sits inside the move
window. That layer does not exist in structured form.

Draft Ticker builds it. Every field traces to a rule or a URL.

**The split.** Models handle explanation and attribution. The signal,
thresholds, evidence tier and coverage bar stay deterministic and published,
because a drafter is about to act on them.

**The gap is observable.** FantasyPros has shipped an MCP server. Its 29
tools return current rankings, ADP, projections, depth charts and league
analysis, and none returns a change over time: the 24 hour and 7 day trend
columns on their own Real-Time ADP page do not reach it. The near misses
are exactly that: the trade tools return counterfactual deltas from a
hypothetical trade, and the stats tools return aggregates over a window
rather than changes across it. This is an integration omission rather than
a missing capability, since the movement data already exists on their own
page. Draft Ticker exposes exactly that layer as three tools in the
repository's mcp/ directory: market movers over the current window, one
player's full market context, and verified events with dates and sources.

**Attribution at scale.** Hand verification is the right cost for a
prototype and the wrong one for a product. Inside FantasyPros, Fantasy Feed
already carries every news item tagged to a player with a timestamp, so
three of the four verification steps are already satisfied by the editorial
process that published the item. What remains for a model is ranking which
of a player's feed items inside the window plausibly explains the move. That
is a scoring problem with labelled data already in hand, since every
verified catalyst here is a labelled example.

**It has to be precision biased.** The base rate in section 8 means a system
attributing whenever it finds news will attribute almost always, and the
confirmed label stops carrying information. Attribution fires above a stated
confidence bar and defaults to unexplained below it. Recency and event
category are the levers, and the feed carries both.

**Human review does not disappear.** It moves to a sampled precision audit
against a published target, with the measured hit rate shown on the surface,
which turns a cost that scales with volume into one that does not.

**Shipping discipline.** Every generative feature ships behind a written
standard with named failure modes, a repeatable graded pass, and a stated
precision target. The eval contract in the repository is the reusable asset,
and it has already caught a data defect before a user saw a confident
sentence built on it.

## 12. Roadmap

**Measure the calendar claim.** Persistence against reversion, once a season
of history exists.

**Fit the bars.** Replace reasoned thresholds with distribution matched ones
once there are enough windows to percentile match honestly.

**Re run the news lookback** on the current series, rebuilding movers and
controls at comparable size.

**Ship explanation notes** against corrected payloads with the usefulness
check enforced.

**Build the in season index.** Roster percentage as price, waiver spend as
tape.

**Second source comparison.** Where two crowds disagree widely on the same
player, that disagreement is information nobody surfaces.

## 13. Proposals for FantasyPros

Full treatment on the Inside FantasyPros page. Ordered by build cost,
smallest first.

**Price response on Fantasy Feed items.** Every feed item gains one line:
ADP down five picks since this broke, experts moved him up four. Two owned
datasets, highest traffic content surface. No new pipeline, no editorial
judgment, no external source.

**A why column on Real-Time ADP.** The page already ranks movers. Movers
with a feed item inside the window get a marker linking to it, so a user
scanning what moved can see what moved it without leaving the page.

**Catalyst attribution as a join.** A movement threshold fires, the pipeline
retrieves that player's feed items inside the window, and a ranking model
scores which plausibly explains the move. Requires a confidence bar and a
sampled precision audit, per section 8.

**Market context inside Coach AI.** The assistant answers in league context
but cannot read price movement. This layer gives it a structured, dated,
sourced view of what moved and the documented events near it. Largest
build, largest payoff, depends on the three above.

**Sequencing.** The first two ship independently and test whether users
engage with price context at all. Attribution gates the fourth: an assistant
that cites the wrong cause does more damage than one that cites none.
