# Draft Ticker: Product Requirements

Written retrospectively over 18–19 August 2026, describing the product as
built rather than as planned. Decisions recorded here were made during the build;
the dates and reversals are stated in the section on what changed.

Live: https://draft-ticker-fp.vercel.app · Repository:
https://github.com/Keats4/draft-ticker-fp

## 1. Problem

FantasyPros already publishes what a player is worth. Expert Consensus
Rankings say where the experts have him. Consensus ADP says where the market
is taking him. Player pages chart both, daily, with a five day smoothing on
the expert line. Real-Time ADP adds 24 hour and 7 day movement.

So the data exists and the movement is visible. What does not exist is an
answer to the question a drafter actually asks when a number changes:

**Does this move mean anything, and should I do something about it?**

A ten spot move on a Tuesday in June and a ten spot move the day after
starters played a real game are displayed identically. A move caused by a
confirmed injury and a move with no documented cause behind it are displayed
identically. A move on a player five sources agree about and a move on a
player one source has ranked are displayed identically.

Draft Ticker is the interpretation layer on top of data FantasyPros already
owns.

## 2. User and moment

**Primary user.** Someone drafting a redraft fantasy football team between
June and early September, who checks in every few days as their draft
approaches.

**The moment.** They open the site having heard a player is rising or
falling, or with no particular player in mind, and want to know two things:
which price changes since they last looked are worth attention, and for a
specific player, whether the current price is one they should take.

**What they leave with.** A short list of players whose price genuinely
moved, an answer on each about which side moved first, a documented reason
where one exists, an honest statement where one does not, and a reading of
how much weight this time of year deserves.

**Secondary user.** A dynasty or season long manager evaluating trades, for
whom the same movement and disagreement framing applies to rest of season
rankings. The current build does not serve this user, and section 6 explains
why.

## 3. What it does

### The two series

Both come from the FantasyPros API on a single issued key. Nothing is
scraped.

**Expert line.** FantasyPros Expert Consensus Rankings, Draft PPR.

**Price line.** FantasyPros consensus average host rank: the mean of a
player's rank across up to five league host boards. This is an average rank,
not a literal draft slot. Surfaces call it ADP because that is the term the
reader knows; the methodology page states the precise definition.

Neither source publishes historical daily values, so the history is
accumulated by daily capture rather than fetched. The series begins on the
date of the first capture and grows one day at a time.

### Movement screening

A move registers when it clears a published threshold: three picks on the
price side, two ranks on the expert side. Both thresholds are reasoned
rather than fitted, and the interface says so.

Movement is measured over the dates both series share, so the two sides of
every comparison span the same window. It is computed over the host boards
present on both days, so a board adding or dropping a player does not
register as a repricing.

### Signal

Six states, plus an explicit no signal condition:

- Market moving faster
- Experts moving first
- Market catching up to experts
- Market and experts converging
- Market and experts diverging
- Broad agreement

Signals compute only inside the comparison universe: top 200 by both price
and expert rank, ranked by at least four of the five host boards.

### Catalysts and evidence

A hand curated file of dated real world events, each with a player, a date,
a primary source URL, a category and a one sentence factual summary.

A signal reads catalyst confirmed when a verified event falls inside the
move window or the seven day lookback before it, and unexplained otherwise,
which is displayed as watch rather than act.

`verified: true` means a human opened the source and confirmed the event and
its date. Sourcing may be automated; verification may not.

### Calendar

Twelve phases across the fantasy year, derived from real season dates, each
carrying an authored trust reading from low to very high. The reading
appears as a meter beside movement where a move is featured: the story
cards, the hero, and the player page movement line, never the market table,
which would repeat it on every row. It renders only when the trust level is
high, very high or low; at medium it renders nothing, so the meter appears
only when it changes how the move should be read. The calendar's judgment
reaches the moment a number is being read rather than living only on its own
page.

### Archetypes

Seven labels describing what kind of news moves a player: Handcuff,
Committee, Lead back, Alpha receiver, Promoted, Injured, Rookie. Each
carries a one line statement of what would move him.

Computed from team, position and price, plus the current injury designation
and rookie flag, with a small authored override file for rooms the price
misreads. Each override carries its reason, which renders in the label.
Archetypes are display only and are not an input to any signal, ranking or
selection.

## 4. Non goals

These are decisions, not omissions.

**Not a news feed.** FantasyPros runs one. Competing on news volume would
lose, and duplicating it adds nothing. This surfaces the price response to
news, not the news.

**Not a rankings product.** It does not produce its own player valuations
and has no opinion about who is good.

**No causal claims.** The evidence tier says a verified event coincides with
a move inside a stated window. It never says the event caused the move. When
two events coincide, both are listed rather than one being chosen.

**No prediction.** Nothing here forecasts a price or a performance. It
describes what has already happened and how much weight it deserves.

**Does not price the in season market.** Once drafts finish, draft position
stops existing and the real price becomes roster percentage and waiver
spending. That is a different data set and is described as a concept, not
built.

**No opaque scoring.** No composite index, no blended confidence number.
Every threshold is published and every label is traceable to a rule.

## 5. Success criteria

### The falsifiable claim

The calendar asserts that identical movement carries different information
depending on when it occurs. That is testable:

Moves during high trust phases should persist. Moves during low trust
phases should revert.

This requires a full season of stored history and has not been measured. If
it fails, the calendar's trust weighting is decoration and should be
removed.

### Whether the signal discriminates

Players labelled market moving faster should behave differently over the
following weeks than players labelled broad agreement. If the six states do
not separate on any subsequent measure, the classification is describing
noise.

### Whether catalysts carry information

A blind matched test found that 68 percent of comparable players carry a
qualifying news event in any twelve day window, and that movers were
statistically indistinguishable from non movers on news presence alone. That
measurement was made before the price source changed and the movers half
needs re running.

The implication stands regardless: news presence alone is close to worthless
as a filter, so any automated catalyst pipeline needs a precision target
rather than a volume target.

### What would make it worth building at scale

A drafter changes a decision because of something read here, and would
notice its absence. Absent usage data, the proxy is whether the
interpretation is one a competent analyst would agree with on a sampled
review.

## 6. Known limitations

Stated as they are on the site.

- The stored history is days old, so charts are short and moves are small.
- Thresholds are reasoned rather than fitted, and will be re measured once
  enough history exists to build a distribution.
- Calendar trust and archetypes are published and displayed but are not
  inputs to signal computation.
- AI generated explanation notes exist and have been graded against a
  written contract, but are not shipped. Section 7 explains why.
- The in season half of the Market Price Index is a concept, because roster
  percentage and waiver prices do not exist until Week 1.
- Only two of the five contributing host boards are identifiable by name;
  the API does not name the other three.
- Host coverage varies by scoring format, and one host publishes roughly 25
  hours behind the others.
- Findings measured on the retired price series have not been re measured on
  the current one, and the research log marks which are which.

## 7. What changed and why

The value of this section is that these were reversals, not refinements.

**The thesis was wrong and was corrected.** The original premise was that
FantasyPros lacked the stored time series. Checking their player pages
showed they chart it daily with smoothing already applied. The product was
repositioned from missing data to missing interpretation, which is a smaller
claim and a true one.

**Catalyst provenance did not match its own documentation.** An audit found
that entries described as hand curated had been generated by research
agents, and that a script had set every verification flag in one pass. The
standard was rewritten into three parts that no longer travel together:
sourcing earns no trust, attribution requires a primary source URL, and
verification requires a human. Flags were withdrawn and re earned.

**The price source changed.** The build originally used a third party mock
draft ADP. It now uses FantasyPros' own consensus, so both series come from
one provider on one key. The cost was the stored history, which restarted,
and a measurement basis, since several findings were made on the retired
series and are marked as such rather than relabelled.

**The catalyst lookback stopped being derived.** It was justified by the
previous source publishing a seven day trailing mean. The current source
publishes no averaging window, so the same seven days is now a stated
assumption with three named reasons: drafters arrive over days, each host
averages over its own unpublished window, and the sources publish roughly 25
hours apart.

**Archetypes were rebuilt.** The first version grouped players by tenure,
which told a drafter nothing they could act on and required a disclaimer
under every label. The second version describes what kind of news moves a
player, which connects the archetype to the catalyst layer.

**Two measurement bugs were found and fixed after shipping.** Movement was
being compared across windows of different lengths, which inflated one
signal state across most of the board. And price deltas were being computed
across changing sets of source boards, so a board dropping a player
registered as a repricing. Both were caught by checking a rendered number
against its inputs rather than by a test.

**The explanation notes were built, graded and held.** Thirteen notes were
generated and graded twice against a written contract of named failure
modes. A payload defect then invalidated the second pass: the catalyst
fields feeding the notes were incomplete or wrong, and every check grades a
note against its payload, so a note faithfully reporting wrong inputs passes
every one of them. Grading harder never reaches an input defect. The notes
stay unshipped until they are regenerated against corrected, human verified
payloads and the usefulness check is in force.

## 8. What ships next

**Measure the calendar claim.** Persistence of high trust moves against
reversion of low trust moves, once a season of history exists.

**Fit the thresholds.** Replace reasoned bars with distribution matched ones
once there are enough windows to percentile match honestly.

**Re run the news lookback** on the current price series, rebuilding the
mover and control sample at a comparable size.

**Ship the explanation notes** once the usefulness check in the grading
contract is in force, so a note that only paraphrases its inputs cannot
pass.

**Build the in season index.** Roster percentage as the price and waiver
spending as the tape, which extends the product past the draft.

**Second source comparison.** Where two crowds disagree about the same
player by a wide margin, that disagreement is itself information, and no
product surfaces it.

## 9. Proposals for FantasyPros

Detailed on the Inside FantasyPros page. Summarised here because they are
the point of the exercise.

The strongest is that inside FantasyPros this stops being a research
problem. Fantasy Feed already carries every news item tagged to a player
with a timestamp. A catalyst therefore becomes a join between two things
they already own: a movement threshold fires, the pipeline looks up their
own feed for that player within the window, and the editorial team has
already decided what counts as news.

The measurement in section 5 is why that join needs a precision bar rather
than a volume target.
