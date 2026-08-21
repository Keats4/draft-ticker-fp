# Draft Ticker: Research Log

Fourteen hypotheses tested during the build, with the reasoning behind each, the test run, and what changed as a result. Three entries (3, 7 and 11) were measured entirely on an earlier price series and were removed with it; the numbering keeps their slots. Findings 4 and 6 were re-measured on the current series on 2026-08-18. Finding 13's mover comparison awaits enough current history to re-run; its base rate stands on its own.

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

## 4. Expert consensus lags the market because a human has to publish it

**Why I expected it.** The price side is a composite repriced whenever a host board updates. ECR is a consensus of individual analysts, and a player's rank only changes when an analyst sits down and revisits him. Structurally, the market side should lead.

**Test.** Counted how many players changed expert rank between each pair of consecutive stored ECR snapshots, with the median and maximum size of those moves. ECR is the same series throughout, so the measurement carries across; re-run 2026-08-18 on all nine stored snapshots, 2026-08-10 through 2026-08-18.

**Result: rejected.** Between 66 and 83 percent of common players changed expert rank on every live transition, median move two to three ranks, single moves as large as 42. The one quiet transition, eighteen percent on Aug 10 to 11, coincides with a snapshot that was backfilled rather than captured live, so it is likely an artifact rather than a slow day. Experts re-rank aggressively and often.

**What changed.** The assumption came out of the product's reasoning. An earlier version of this entry read a short window as selectivity, with forty two percent of the comparable universe unmoved. The longer window rejects that too: of 481 players present in all nine snapshots, twelve, 2.5 percent, never moved at all. The consensus is not slow, and at this grain it is not selective either; nearly everyone gets touched inside nine days.

---

## 5. The two movement thresholds are not comparable bars

**Why I suspected it.** Three spots of average host rank and two ECR ranks are different units on different scales. The price is a continuous average; ECR is an integer consensus where a player cannot move a fraction of a rank and has to displace somebody. There was no reason to assume the two numbers represent comparable amounts of evidence.

**Status: not yet measured on the current series.** The percentile position of each bar was measured once on an earlier price series, at two different grains, and those figures were removed with it. Re-measuring needs roughly two weeks of the current series, enough window-move distributions on the host rank composite to place each threshold inside its own series' percentiles. Until then the ≥3 bar is carried over and unfitted, which `lib/math.ts` states in the threshold's own comment.

**What changed: nothing, deliberately.** One short window is a single observation of a distribution, not an estimate of it. Recalibrating thresholds on that basis to make the label distribution look better would be the same error as blending an index with weights that have not been earned. Percentile matched thresholds are on the roadmap for when there is enough history to set them honestly.

---

## 6. "Diverging" is labelling convergences

**Why I suspected it.** The branch fires when both series move in opposite directions. But two lines moving in opposite directions can close the distance between them or open it, depending on which one started ahead. Direction and distance are different questions and the branch only tested one.

**Test.** Computed the absolute gap at the start and end of the window for every comparable player with opposite signed moves, thresholded and unthresholded, reading start values from the stored snapshots rather than reconstructing them from rounded deltas. First run on the earlier price series, where it produced the branch fix below; re-run 2026-08-18 on the current series' shared window, Aug 16 to Aug 18, with movement measured over shared hosts.

**Result: confirmed on both series.** On the current window, 27 of 56 opposite-signed movers closed the gap and 29 opened it, an even split, so both cases carry real weight at any bar. With both thresholds applied the split is four converging to two diverging.

**What changed.** The branch splits on whether the absolute gap closed or opened, using the prior gap reconstructed from both moves. Widening keeps the diverging label. Narrowing became its own state, "Market and experts converging," which took the label set to six. Same root cause as finding 2, a test on direction with no test on distance. Naming the size of the closure in the sentence itself is not built: the reading carries the gap and the move, not the amount the gap closed.

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

## 12. A safeguard that matched on the wrong key, and looked like it worked

**Why it came up.** Building a blinded mover-versus-control sample, I excluded every player whose news status was already known to me so the searcher could not be contaminated by this session's earlier work. The exclusion list was built from player names.

**Test.** Read the generated sample instead of trusting that the filter had run. `Deebo Samuel Sr.` was sitting in it.

**Result: the filter silently missed four players.** `data/catalysts.json` stores `Deebo Samuel`, `Aaron Jones`, `Luther Burden` and `Travis Etienne`. The market rows carry `Deebo Samuel Sr.`, `Aaron Jones Sr.`, `Luther Burden III` and `Travis Etienne Jr.`. String equality returned false for all four, the filter reported no error, and four players with known news went into a sample whose entire purpose is that nobody knows anything about anyone in it.

**What changed.** Exclusion now matches on `sleeper_id`, the canonical key the product already uses for exactly this reason. `lib/market.ts` has joined on a mapping table with a name fallback since the beginning precisely because names do not join; I wrote a throwaway analysis script and did not apply the project's own rule to it.

**Why it is worth a numbered entry.** It is the fourth time a safeguard has passed while doing nothing. Finding 8: the catalyst file's stated provenance had drifted from how it was actually produced. Finding 10: an audit reported the unexplained state was missing everywhere, having queried only the players that have catalysts, a population selected so it could not contain a counterexample. The catalyst date audit, since removed: `verified: true` meant a human had confirmed the date, while nothing required the cited source to display one. This one: an exclusion filter that ran cleanly and excluded nothing.

The shared shape is that none of them fail loudly. A filter that matches zero rows returns an empty set, not an error. The only thing that caught this one was recognising a name in output I had just told the user contained no names I recognised.

**Uncomfortable detail worth keeping.** It was caught because an agent that was supposed to be excluded from knowing something recognised a name it should not have seen. The contamination detected the contamination. That is not a control anyone can rely on, and it is the argument for the canonical key rather than for closer reading.

---

## 13. Movers have more news than non-movers

**Data.** All 60 per-player results, with confirmed dates and source URLs, are in `NEWS_LOOKBACK.md` and `data/news_lookback.json`. Every figure this entry once carried traces to those files; the comparison figures were removed from the entry with the earlier price series and the data files retain all of them.

**Provenance, stated plainly.** Measured 2026-08-14, before the current price series began. Movers were selected by the earlier series' move bar and controls were matched on its price, so the mover-versus-control comparison belongs to that series and is due for re-running once the current series can produce a sample of thirty movers. The base rate reported below does not depend on any price series: it is a fact about how often NFL players carry news in a twelve day window.

**Pre-registered before the test was run.** ADR-005, committed 2026-08-14, fixed the sample, the blinding, the protocol and the decision rule while the answer was unknown. Support required a mover-versus-control hit rate gap of at least 25 percentage points across all pairs AND the same direction among the well matched pairs alone. Anything smaller was to be reported as inconclusive at this sample size, not as weak support.

**Why it needed doing.** An earlier audit of the eval set established that the catalyst file was incomplete. It did not establish that price movement and news are related, because everything found there was found by searching players already known to have moved. That cannot distinguish "movers have news" from "everybody has news."

**Test.** Thirty movers, each matched to a low-movement control. A fresh agent with no repo access received the 60 names in random order and nothing else, and applied an identical protocol to every player: three fixed queries, at most three fetches, one published definition of a news event, one syndication rule, publication dates read off the page.

**Result: inconclusive, and closer to null than that phrasing suggests.** The comparison failed its own pre-registered bar, and the paired test found no detectable effect among the well matched pairs. The one directionally consistent signal, in both subsets, was recency: mover news fell closer to the window end, statistically nothing at this sample size, and the version of the test worth re-running with more data. The matching premise was also wrong: news coverage does not track prominence, it concentrates in the contested middle of the board, an inverted U rather than a slope.

**The number that stands: a 68 percent base rate.** 41 of 60 players carried a qualifying news event in the twelve day window. In August, news about an arbitrary NFL skill player is close to ubiquitous, which means presence of news carries almost no information about whether a price moved. The catalyst layer cannot earn its place on presence alone, and any version of it that flips an evidence tier on "a catalyst exists" is reporting the base rate. What might carry signal is timing, magnitude or corroboration count, and none of those were measured with any power here. This is the figure the Inside FantasyPros page cites.

**What changed.** Nothing in the product. The finding is what the test is for. It also corrects how the eval-set audit should be read: twelve of twelve audited players having news looked like a strong result, and against a 68 percent base rate it is much weaker than it appeared, though the two are not directly comparable, since that search had no query budget and this one was capped at three per player.

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

Several hypotheses were rejected outright and one is still open. The thirteenth was pre-registered before it was run, failed its own stated bar, and is written up as a failure. The original product thesis was wrong about what FantasyPros already has, the assumption about how expert consensus behaves was wrong at two different window lengths, and the threshold comparability question stays open until the current series is long enough to measure. The tenth, whether the generated notes assert what the data does not support, is generated and staged but not yet graded.

In every case the test was run before anything was built or changed, and in two cases the outcome was to change nothing and write down why. The findings that produced product changes, the two branch bugs and the provenance correction, were all found by reading the implementation rather than the documentation.

The pattern worth naming: every bug in the signal engine came from testing direction without testing distance, and every process failure came from a safeguard that ran without doing anything. A provenance line that no longer described the pipeline, an audit that sampled only where the answer was known, an exclusion filter that matched on an unstable key, and a report on repository state built from a cached copy that had stopped being the repository. None of the four failed loudly. Each was caught by reading the output rather than by the check itself, which is an argument for canonical keys and adversarial sampling, not for reading more carefully.
