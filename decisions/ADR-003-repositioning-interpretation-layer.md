# ADR-003: Repositioning to an interpretation layer, not missing data

**Status:** Accepted
**Date:** 2026-08-11
**Supersedes:** the original product thesis stated in BUILD_BRIEF and in the first draft of the methodology page
**Related:** ADR-002 (catalyst curation), ADR-004 (catalyst provenance)

## Context

Draft Ticker was built on the premise that FantasyPros collects ECR and ADP but does not store or display the history of either, and that the daily time series was therefore missing from the market entirely. That claim appeared in the methodology page, the README draft, the Inside FantasyPros copy, and several pieces of UI text.

On 2026-08-11 I checked the premise directly against their live player pages rather than against my recollection of the site. It is false. FantasyPros player pages already render a daily intrayear chart of ECR against ADP, two series, with a rolling mean applied. They collect the data, they store it, and they chart it.

This is the kind of claim that is easy to state and easy to leave unverified, and it was load bearing across every surface of the product.

## Decision

Reposition the product from "they are missing this data" to "they render this series and nothing reads it."

The corrected thesis: FantasyPros charts the series. Draft Ticker adds the layer that interprets it, through movement screening against published thresholds, classification of which side moved first, annotation with dated and sourced catalysts, an evidence tier that distinguishes a documented move from an undocumented one, and seasonal context from the market calendar.

Three consequences follow directly.

**A claims audit across every surface.** Every statement asserting that FantasyPros lacks intrayear history, time series storage, or an ECR against ADP chart was removed or rewritten. The methodology page gained a paragraph stating plainly what their player pages already show and precisely what this product adds on top.

**Our chart may never appear bare.** Theirs does, and that is now the visible difference. The chart card always carries the signal chip, the plain language reading, and catalyst markers where they exist. The section is titled "Market vs. Experts: interpreted."

**The standalone dynasty preview was cut.** With the thesis reframed around interpretation rather than absence, a second data view added nothing. The concept slot went to the Market Price Index instead, which extends the interpretation argument across the full year rather than duplicating the draft season view in another format.

## Consequences

The corrected thesis is harder to dismiss than the original one. "You are missing this data" invites a one line rebuttal and a link. "You collect this, you store it, you chart it, and nothing on the page tells the reader what it means" is a product observation that survives being checked, and it points at a gap that is real.

It also narrows the proposal usefully. Anything that amounts to rebuilding storage or charting is out of scope by construction. What remains is interpretation, which is where the work actually is.

The cost is that the product no longer has a novelty claim about data access. It has to earn attention on the quality of the reading instead. That is the correct trade, and it is the reason the evidence tier, the published thresholds, and the eval harness matter more than any individual chart.

## Note on how this was found

The original claim was written from an impression of the site rather than from the site. It was corrected by reading the actual surface. The same failure mode recurred repeatedly during the build, each time as a claim in documentation drifting away from what the code or the data actually did, and each time found by reading the implementation rather than the description. That pattern is recorded across ADR-004 and RESEARCH_LOG.md.
