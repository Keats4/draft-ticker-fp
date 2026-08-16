# ADR-004: Catalyst sourcing is agent-assisted; verification is human

Date: 2026-08-12 · Status: Accepted · Amends: ADR-002

## Context

ADR-002 says catalysts are "curated by hand" and data/catalysts.json repeated
that as "Hand-curated/sourced only". That is no longer an accurate description
of how the file is produced, and a repo that misdescribes its own process is
exactly the failure the methodology page exists to prevent.

What actually happens: research agents sweep for candidate events, every
candidate's page is fetched and its on-page date confirmed to be the current
season, and a human then opens the source and confirms the event before the
entry is trusted. The 2026-08-12 pass produced 27 entries this way.

This is not a downgrade from hand-curation. Agents widen the candidate net and
catch events a weekly manual pass would miss; the human check is preserved
exactly where it matters, on the claim itself. What changed is who does the
*finding*, not who does the *confirming*.

## Decision

Catalyst provenance is defined in three separate parts, and the wording
everywhere in the repo must keep them separate:

1. **Sourcing**: candidates may be found by research agents or by hand. Either
   is acceptable. Agent-sourced candidates get no special trust.
2. **Attribution**: every entry carries a `source_url` to a primary or
   reputable secondary source. No entry ships without one. Unreachable or
   bot-walled URLs are recorded as such rather than silently accepted.
3. **Verification**: `verified: true` means *a human opened that source and
   confirmed both the event and its date*. Nothing else sets that flag. It is
   not implied by an agent's confidence, by the URL resolving, or by the entry
   having survived review of a batch.

`verified: false` remains the default for any new entry regardless of origin.
Only a `verified: true` entry dated inside the move window can flip a signal's
evidence tier to "catalyst-confirmed".

## Consequences

- ADR-002's "no scraper, no news API, no NLP pipeline" still holds: agents
  fetch and read named pages, they do not ingest a news feed or extract events
  with a model pipeline. The auditability property ADR-002 was protecting (  every line traceable to a URL a human checked) is unchanged.
- ADR-002's coverage estimate ("8-12 players", "an hour a week") is superseded.
  Agent sourcing makes wider coverage cheap; the human verification step is now
  the binding constraint on how many entries can ship.
- The `rules` field in data/catalysts.json and the `verified` field description
  are updated to this wording.

## Costs accepted

- A human still has to open every source. Skipping that step and flipping flags
  in bulk would make `verified` meaningless, which would in turn make
  "catalyst-confirmed" meaningless on the player pages.
- Agent sourcing can surface plausible-looking events from the wrong season;
  the date-confirmation step is mandatory, not advisory.
