# Draft Ticker: Research Log

Fourteen hypotheses tested during the build, with the reasoning behind each, the test run, and what changed as a result. Five were rejected by the data, one was confirmed at a third the size I claimed for it, one is still open, one found a wrong number already shipped, and one found a safeguard that had been silently excluding nothing. Those are the useful ones.

Every test was run read only against stored snapshots, with no code changed until the result was in.

---

## 1. FantasyPros does not store or chart the ECR versus ADP time series

**Why I expected it.** Every fantasy site publishes today's rankings and today's ADP. Almost none keep the history, and the ones that do rarely surface it. The whole premise of a movement product rests on somebody not having done this.

**Test.** Read FantasyPros player pages directly rather than relying on my impression of the site.

**Result: rejected.** Their player pages already render a daily intrayear chart of both series with a rolling mean. The data exists, it is stored, and it is charted.

**What changed.** The thesis, everywhere it appeared. The gap is not missing data. They collect it, store it, and chart it, and then build nothing on top of it: no movers screen, no classification of who moved first, no annotation of what happened on the days the lines moved, no seasonal context. Draft Ticker became the interpretation layer on a series they already render. Recorded as ADR-003, and the strengthened claim is easier to defend than the original one.

---

## 2. The signal engine mislabels the sharpest disagreements

**Why I suspected it.** Reading the branch order rather than the documentation, I could not find the path that handles both series clearing their thresholds in opposite directions.

**Test.** Traced `signalLabel()` branch by branch against every combination of inputs.

**Result: confirmed, and it was a real bug.** Opposite direction moves missed every branch and fell through to the default, so the single strongest disagreement in the data was being labelled "Broad agreement."

**What changed.** Added an explicit branch, "Market and experts diverging." Exactly one player in the top 200 qualified on the day it shipped: Stefon Diggs.

---

## 3. Day over day movement is too damped to detect real signals

**Why I expected it.** ADP from a public draft aggregator is a trailing seven day mean. A mean of that length cannot move much in a day by construction, so a one day delta measured against a three pick bar should almost never clear it.

**Test.** Recomputed the full signal distribution across the whole comparable universe using the entire tracked window rather than consecutive days.

**Result: confirmed, and the effect was larger than expected.** Two labels that had never once fired in production appeared immediately: "Market moving faster" on five players and "Market catching up to experts" on two. Thirteen players changed label. Daniel Jones measured plus 2.3 picks day over day and plus 8.3 across the window.

**What changed.** Movement is now measured from the earliest stored snapshot to the latest, with every label on the site deriving its wording from the real dates rather than a hardcoded string.

---

## 4. Expert consensus lags the market because a human has to publish it

**Why I expected it.** ADP is a mean over thousands of drafts and repriced continuously by anyone who opens a draft room. ECR is a consensus of individual analysts, and a player's rank only changes when an analyst sits down and revisits him. Structurally, the crowd should lead.

**Test.** Counted how many players changed expert rank between each pair of consecutive snapshots, with the median and maximum size of those moves.

**Result: rejected.** Seventy two percent of tracked players changed rank on each of the last two transitions, median two to three ranks. Experts re-rank aggressively and often. The one quiet transition, eighteen percent, coincides with a snapshot that was backfilled rather than captured live, so it is likely an artifact rather than a slow day.

**What changed.** The assumption came out of the product's reasoning. What replaced it is more interesting: forty two percent of the comparable universe has an expert rank that has not moved at all across the window, so the consensus is not slow, it is selective. Analysts revisit the players they have reason to revisit and leave the rest alone.

---

## 5. The two movement thresholds are not comparable bars

**Why I suspected it.** Three ADP picks and two ECR ranks are different units on different scales. ADP is continuous and smoothed. ECR is an integer consensus where a player cannot move a fraction of a rank and has to displace somebody. There was no reason to assume the two numbers represent comparable amounts of evidence.

**Test, first pass.** Computed where each threshold sits in the percentile distribution of non zero daily moves for its own series.

**Result.** Two ranks sat at the 39th percentile of expert moves. Three picks sat at the 92nd percentile of market moves. On those numbers the expert side was being treated as having really moved roughly eight times as often.

**Test, second pass.** The first measurement was taken at the wrong grain. The thresholds act on cumulative window moves, not daily ones, so the distributions that matter are window distributions. Recomputed accordingly.

**Result: partially confirmed, and much milder.** Measured on window moves, three picks sits near the 90th percentile and two ranks near the 75th. The expert bar is looser, but nothing like the original figure.

**What changed: nothing, deliberately.** One four day window is a single observation of a distribution, not an estimate of it, and the expert bars rest on only the ninety four players who moved at all. Recalibrating thresholds on that basis to make the label distribution look better would be the same error as blending an index with weights that have not been earned. The measurement is documented, percentile matched thresholds are on the roadmap for when there is enough history to set them honestly, and the correction of my own first measurement is part of the record.

---

## 6. "Diverging" is labelling convergences

**Why I suspected it.** The branch fires when both series move in opposite directions. But two lines moving in opposite directions can close the distance between them or open it, depending on which one started ahead. Direction and distance are different questions and the branch only tested one.

**Test.** Computed the absolute gap at the start and end of the window for every player carrying the label, reading start values directly from the stored snapshots rather than reconstructing them from rounded deltas. Then repeated across every player with opposite signed moves, with no threshold applied.

**Result: confirmed.** Three of the four labelled players were converging, not diverging. Diggs closed twenty two picks of disagreement, from minus 50.1 to minus 27.9, while carrying the label on the homepage. Only one player was genuinely pulling apart. Across the unthresholded population the split is thirty narrowing to nineteen widening, so both cases carry real weight at any bar.

**What changed.** The branch splits on whether the absolute gap closed or opened, using the prior gap reconstructed from both moves. Widening keeps the diverging label. Narrowing became its own state, "Market and experts converging," which took the label set to six. Diggs moved to it on the day it shipped. Same root cause as finding 2, a test on direction with no test on distance. Naming the size of the closure in the sentence itself is not built: the reading carries the gap and the move, not the amount the gap closed.

---

## 7. The Diggs move is a team wide repricing, not a player event

**Why I suspected it.** A left tackle injury depresses an entire offense. If Washington's line took a hit in the same window as the signing, the quarterback, both backs and the other receivers should all drift down together, and attributing the move to the signing would be a mistake.

**Test.** Compared every Washington skill player in the comparable universe against two control teams selected programmatically on roster count and median ADP, plus a league wide baseline.

**Result: rejected.** Washington did not move as a group. Three down, three up, a team mean of minus 0.63 picks, eleventh of thirty two. Diggs is the only Washington player whose move clears the three pick bar and it is four times the team median. If a signing displaced incumbents, the effect should show on Terry McLaurin, and he moved minus 0.9 picks, inside the band where more than half the league sits.

**What changed.** The original reading of the card stands, and now it is tested rather than assumed. The conclusion is stated at the strength the data supports: a player specific move, with a documented event inside the window, and no team level drift behind it. Ruling out a confound is not the same as proving a cause, and the card does not claim one.

**Unplanned finding.** One of the control teams was the one showing the group pattern: five of six players down, none up, a mean nearly three times Washington's. The team level event category is real. It was on a different team, there is no catalyst on file for it, and one of the players in that group currently occupies a story card, which means his move may be team drift rather than anything about him.

---

## 8. The catalyst file's stated provenance does not match how it was built

**Why I suspected it.** The file carried a rule saying entries were hand curated, and a schema line asserting a review had been performed. Both claims were about process rather than data, and process claims are the easiest kind to drift out of date.

**Test.** Read only audit of the file's full git history: what changed, when, by whom, and whether any entry had been both created and marked verified in the same automated pass.

**Result: confirmed, and worse than expected.** Ten entries had been generated by research agents, every verified flag had been set in one scripted pass, and the schema asserted a depth of review that had not happened. The hand curated rule had never been accurate.

**What changed.** Every entry personally reviewed against its primary source. Provenance split into three separate claims that no longer travel together: sourcing may be agent or human and earns no trust by itself, attribution requires a primary source URL on every entry, and verification means a human opened that source and confirmed the event and the date. Recorded as ADR-004, with the original decision record amended in place rather than rewritten.

---

## 9. The AI analyst notes contain claims the data does not support

**Why I expected it.** Generated text asserts confidently by default. The specific risks were predictable: facts absent from the payload, misquoted figures, causation asserted where only coincidence exists, forward looking claims, and confidence not matching the evidence available.

**Test.** Thirteen notes generated against a fixed payload per note, including three adversarial cases designed to be failed: a flat non mover, a mover with no verified catalyst, and movement below threshold. Five named failure modes, graded by hand, one cell each.

**Result: pending.** The notes and their exact payloads are staged in `data/note_grades.json` and `NOTE_GRADING.md`; zero cells are marked and no note is live. The scorecard on the methodology page renders an honest empty state and computes no score from an incomplete grade. Nothing here is machine graded, by design.

**What is already visible without grading.** The rubric tests whether a note is false. It does not test whether a note is worth reading, and a note that restates the numbers displayed next to it passes all five checks while adding nothing. A sixth check for that is written into EVALS.md as under consideration and explicitly not in force. Whether it is adopted depends on the first grading pass.

---

## 10. The evidence fallback state had stopped rendering

**Why I doubted the report.** An automated audit reported that the "unexplained" state appeared nowhere on the site. That could not be right: roughly forty players carry a signal and only twelve have a verified catalyst in the window, so most signalled players have nothing backing them and should show the fallback.

**Test.** Checked a player carrying a signal with no catalyst on file.

**Result: the report was wrong, not the code.** The fallback renders correctly. The audit had queried only the players that have catalysts, which is a population selected so that it could not contain a counterexample.

**What changed.** Nothing in the product. The finding is about the process: an automated check that samples only where the answer is already known will confirm anything. Worth more than the bug it did not find.

---

## 11. The empty catalyst fields in the eval set are an artifact, not an absence

**Why I doubted it.** Eleven of the thirteen eval payloads read `verified_catalysts: []`, and the notes generated from them all say some version of "no verified catalyst is on file, so the cause is unexplained." Daniel Jones moved 8.3 picks earlier across the window with his expert rank flat. A mean over roughly 6,160 drafts does not move that far on nothing. Either the market was wrong or the file was incomplete, and the file was the cheaper thing to check.

**Test.** Searched all twelve distinct eval players for datable events between 2026-08-04 and 2026-08-12, requiring the publication date to be read off the fetched page rather than taken from a search snippet, and counting independent newsrooms rather than copies of one wire item.

**Result: twelve of twelve had a real event. The file had none of them.** Corroboration ran from one independent source to five. Daniel Jones was Aug 11: Shane Steichen said he would not play in the preseason, citing an impressive Achilles recovery, which is the market pricing a healthy entrenched starter and matches the direction of the move. Exactly half the twelve events fell outside the old Aug 10 to Aug 12 rule, clustered on Aug 5 to Aug 9.

**And one shipped number was wrong.** `real-002-diggs` carried `verified: true` and the date 2026-08-11. The signing was reported on 08-05 and announced by the club on 08-07. The entry's own source renders `Published:` and `Updated:` with empty date fields and says only that Rapoport reported it "Wednesday"; 08-11 was a Tuesday and 08-05 a Wednesday. The verification procedure never required the cited source to display a date, so the date was never confirmable from the thing that was opened to confirm it.

**What changed.** Three things, in order of how much they matter.

The catalyst lookback now follows the ADP mean instead of the snapshot gap. The Aug 10 snapshot averages drafts from Aug 4 to Aug 10 and the Aug 12 snapshot averages Aug 6 to Aug 12, so the move between them is driven by the drafts entering the newer mean and the drafts leaving the older one, while the overlap sits in both and cancels. Matching catalysts from the previous snapshot forward discarded the entire leaving edge, which is the half whose sign is inverted: a catalyst on that edge pushes the measured move against its own direction as the reaction ages out. `lib/evidence.ts` now derives the lookback and classifies each catalyst as entering, overlap or leaving. Bucky Irving is the immediate proof: a verified Aug 5 catalyst that the old rule made invisible and the new one attaches correctly.

Entries carry `sources[]` and an independent corroboration count, where independence means a distinct newsroom and five sites republishing one wire item count as one. This replaces a judgment call with a measurement, and the measurement has a mechanism behind it: for news to move an ADP built from thousands of drafts it has to reach drafters, and source count is a proxy for reach. It is recorded and not yet enforced. The two rules interact, so they cannot be set independently: Jauan Jennings' Aug 12 depth chart event carries one in-window source because three other outlets covered it on Aug 13, one day outside. Extend the window by a day and the same event reads four.

A source must now display a publication date for that date to count as verified.

**What this cost the eval harness.** The five failure modes all grade a note against its payload, so a note that faithfully reports a wrong payload passes every one of them. Note 5 asserted the wrong Diggs date, passed check 1 in both passes, and was graded the strongest catalyst handling in the non adversarial set. Recorded as EVALS.md section 7.2. The fix is not a sixth or seventh check. Grading harder never reaches an input defect.

---

## 12. A safeguard that matched on the wrong key, and looked like it worked

**Why it came up.** Building a blinded mover-versus-control sample, I excluded every player whose news status was already known to me so the searcher could not be contaminated by this session's earlier work. The exclusion list was built from player names.

**Test.** Read the generated sample instead of trusting that the filter had run. `Deebo Samuel Sr.` was sitting in it.

**Result: the filter silently missed four players.** `data/catalysts.json` stores `Deebo Samuel`, `Aaron Jones`, `Luther Burden` and `Travis Etienne`. The market rows carry `Deebo Samuel Sr.`, `Aaron Jones Sr.`, `Luther Burden III` and `Travis Etienne Jr.`. String equality returned false for all four, the filter reported no error, and four players with known news went into a sample whose entire purpose is that nobody knows anything about anyone in it.

**What changed.** Exclusion now matches on `sleeper_id`, the canonical key the product already uses for exactly this reason. `lib/market.ts` has joined on a mapping table with a name fallback since the beginning precisely because names do not join; I wrote a throwaway analysis script and did not apply the project's own rule to it.

**Why it is worth a numbered entry.** It is the fourth time a safeguard has passed while doing nothing. Finding 8: the catalyst file's stated provenance had drifted from how it was actually produced. Finding 10: an audit reported the unexplained state was missing everywhere, having queried only the players that have catalysts, a population selected so it could not contain a counterexample. Finding 11: `verified: true` meant a human had confirmed the date, while nothing required the cited source to display one. This one: an exclusion filter that ran cleanly and excluded nothing.

The shared shape is that none of them fail loudly. A filter that matches zero rows returns an empty set, not an error. The only thing that caught this one was recognising a name in output I had just told the user contained no names I recognised.

**Uncomfortable detail worth keeping.** It was caught because an agent that was supposed to be excluded from knowing something recognised a name it should not have seen. The contamination detected the contamination. That is not a control anyone can rely on, and it is the argument for the canonical key rather than for closer reading.

---

## 13. Movers have more news than non-movers

**Data.** All 60 per-player results, with confirmed dates and source URLs, are in `NEWS_LOOKBACK.md` and `data/news_lookback.json`. Every number below traces to those files.

**Pre-registered before the test was run.** ADR-005, committed 2026-08-14, fixed the sample, the blinding, the protocol and the decision rule while the answer was unknown. Support required a mover-versus-control hit rate gap of at least 25 percentage points across all pairs AND the same direction among the well matched pairs alone. Anything smaller was to be reported as inconclusive at this sample size, not as weak support.

**Why it needed doing.** Finding 11 established that the catalyst file was incomplete. It did not establish that price movement and news are related, because everything found there was found by searching players already known to have moved. That cannot distinguish "movers have news" from "everybody has news."

**Test.** 30 movers clearing the 3 pick bar on the 2026-08-10 to 2026-08-14 window, each matched to a control moving under 1 pick at the nearest current ADP. 22 pairs matched within 5 picks, 8 flagged and reported separately. A fresh agent with no repo access received the 60 names in random order and nothing else, and applied an identical protocol to every player: three fixed queries, at most three fetches, one published definition of a news event, one syndication rule, publication dates read off the page.

**Result: inconclusive, and closer to null than that phrasing suggests.**

| | movers | controls | gap |
|---|---|---|---|
| All 30 pairs | 23/30, 77% | 18/30, 60% | +16.7 pts |
| Well matched 22 | 16/22, 73% | 15/22, 68% | **+4.5 pts** |
| Flagged 8 | 7/8, 88% | 3/8, 38% | +50.0 pts |

Condition 1 failed at +16.7 against a +25 bar. Condition 2 passed on direction only. McNemar exact on the paired data gives p = 0.27 across all pairs and **p = 1.00 among the well matched**, on 9 discordant pairs. There is no detectable effect.

**The all-pairs number is inflated and the pre-registration is what caught it.** The +16.7 is carried almost entirely by the 8 flagged pairs at +50. Those are deep movers matched to shallow controls because the control pool ran out past pick 150. Had the flagged pairs not been separated in advance, this would have read as a +16.7 point effect worth reporting. Separating them was decided before the numbers existed, which is the only reason that call is trustworthy.

**Second test, also pre-registered, and the only thing pointing the right way.** Among players with news, mover news falls closer to the window end: median 3 days against 5, mean 4.57 against 5.56, and 52% of mover news within 3 days of the end against 33% of control news. The direction survives in the well matched subset alone, 44% against 27%. A permutation test gives p = 0.19 across all pairs and p = 0.17 well matched. Directionally consistent in both subsets, statistically nothing at this size. It is what a trailing mean predicts, and it is the version of this test worth running with more data.

**The premise of the matching turned out to be wrong.** Controls were matched on ADP because news coverage was assumed to track prominence. It does not, at least not for events:

| ADP band | hit rate |
|---|---|
| 0 to 39 | 50% |
| 40 to 79 | 56% |
| 80 to 119 | 76% |
| 120 to 159 | 74% |
| 160 to 199 | 40% |

The relationship is an inverted U, not a slope. Early-round players have settled roles and generate few role-change events; deep players get little coverage at all. Event news concentrates in the contested middle. Matching on ADP still equalises position on that curve, so the design holds, but the stated reason for it was not what the data does.

**What changed.** Nothing in the product. The finding is what the test is for.

The overall hit rate is 41 of 60, **68%**. In August, news about an arbitrary NFL skill player is close to ubiquitous, which means presence of news carries almost no information about whether a price moved. The catalyst layer cannot earn its place on presence alone, and any version of it that flips an evidence tier on "a catalyst exists" is reporting the base rate. What might carry signal is timing, magnitude or corroboration count, and none of those were measured with any power here.

**This corrects how finding 11 should be read.** Twelve of twelve eval players having news looked like a strong result. Against a 68% base rate it is much weaker than it appeared, though the two are not directly comparable: that search had no query budget and this one is capped at three searches per player, so the earlier number reflects more effort per name as well as any real difference. The catalyst file being incomplete stands. The inference that movers are where the news is does not.

---

## 14. Three calendar phases were deleted

**Why I believed it.** Building the reframe I read `data/calendar_phases.json`, counted nine phases, and reported that the calendar had no in-season or playoffs phase. Navi remembered twelve, including `long-middle`, `trade-deadlines` and `stretch-run`, and asked which commit removed them.

**Test.** `git log --oneline -- data/calendar_phases.json`, then the phase count at every commit that ever touched the file.

**Result: rejected, and the error was mine.** Three commits have touched that file. The count went 9, 9, 12 and has never gone down. `5e73d3f` on 2026-08-13 authored the twelve phases, it is an ancestor of HEAD, the working tree is clean, and `git show HEAD:data/calendar_phases.json` returns all twelve keys. There was no removal to find.

**Where the nine came from.** A stale copy of the file inside my own workspace, staged on 2026-08-13 at 06:04 and byte-identical to commit `a5bd332` from two days earlier, md5 `fbcd283c6ee31107939367cf544a983f` against the live file's `11809a9ad3544111785fd82d5246b290`. I read it twice, days apart, without restaging, and reported it as the state of the repository.

**The tell I walked past, which is the part worth keeping.** That stale copy has no `card_line` field at all. In the same session I was writing player-page code that reads `phase.card_line` and renders it. I was simultaneously depending on a field and reading a file that does not contain it, and did not stop. A check that contradicts itself in the same breath and carries on is the sharpest version of this pattern in this log.

**What it cost, because it was not only a wrong sentence.** On the strength of "week-1 is the only in-season phase that exists" I put the Market Price Index link on exactly one phase card, and picked the one with `signal_level: "low"`, the lowest-trust phase in the set. The three phases where an in-season price actually earns its place had no link at all.

**A second defect fell out of the same read.** The trust reading I added to the player page hardcoded three levels, `high`, `med` and `low`. The file carries four: `preseason` and `stretch-run` are both `vhigh`. Preseason is the phase immediately after training camp, so the unhandled level would have degraded to a generic sentence within days rather than in November, and it would have done it silently. `components/PhaseMeter.tsx` had the correct four-value union the whole time; I did not look at it.

**What changed.** The Price Index link moved to `long-middle`, `trade-deadlines` and `stretch-run`, card chrome only. Trust readings moved to `lib/phases.ts` with a total `Record<PhaseLevel, string>`, so a level added to the union without a sentence will not compile, and `lib/phases.test.ts` fails if the JSON ever carries a level the code does not know. An unknown level at runtime now logs an error and renders text that reads as a bug rather than as a deliberate hedge.

**The generalisable fix, which is not "read more carefully".** A staged copy of a repository file expires the moment a commit lands. Anything I report about repository state has to come from the repository, through git or through the live path, never from a snapshot sitting in my workspace. The three earlier entries in this family were checks that ran and did nothing; this one is a report built on a source that had quietly stopped being the source.

---

## What this log is for

Five of fourteen hypotheses were rejected outright and a sixth is still open. The thirteenth was pre-registered before it was run, failed its own stated bar, and is written up as a failure. The original product thesis was wrong about what FantasyPros already has, the assumption about how expert consensus behaves was wrong, the team level explanation for the lead story did not survive contact with the data, and the threshold asymmetry was real but a third the size the first measurement suggested. The tenth, whether the generated notes assert what the data does not support, is generated and staged but not yet graded.

In every case the test was run before anything was built or changed, and in two cases the outcome was to change nothing and write down why. The findings that produced product changes, the two branch bugs and the provenance correction, were all found by reading the implementation rather than the documentation.

The eleventh is the one I would keep if I could keep only one. It started as a reader's objection that the eval set looked wrong because almost nothing in it had a catalyst, and it ended in a shipped date that was six days off with a verification flag on it. The harness could not have found that, because the harness grades notes against payloads and this was a payload.

The pattern worth naming: every bug in the signal engine came from testing direction without testing distance, and every process failure came from a safeguard that ran without doing anything. A provenance line that no longer described the pipeline, an audit that sampled only where the answer was known, a verification flag that could not see the field it claimed to check, an exclusion filter that matched on an unstable key, and a report on repository state built from a cached copy that had stopped being the repository. None of the five failed loudly. Each was caught by reading the output rather than by the check itself, which is an argument for canonical keys and adversarial sampling, not for reading more carefully.
