# draft-ticker-mcp

**TWO COPIES OF THE PRODUCT'S LOGIC NOW LIVE IN THIS REPOSITORY, AND THIS
ONE CAN DRIFT.** `server.mjs` carries a hand ported copy of the signal
branch order, the thresholds, the universe filter, the evidence window and
the archetype rules (source file noted above each function). The product
code in `lib/` remains the source of truth; nothing here imports from it,
and changes there do not propagate here. `check-drift.mjs` fails when the
ported threshold values stop matching `lib/math.ts`, `lib/universe.ts` and
`lib/evidence.ts`; it checks values only, so a branch logic change still
requires a re-port by hand. Run it after any change to those files:

```
node mcp/check-drift.mjs
```

A read-only Model Context Protocol server exposing Draft Ticker's market
layer to an agent over stdio. Demo artifact, not a shipped feature and not
part of the site: running it means editing a desktop config file and
restarting the app.

Read only, by construction: public blob and GitHub raw URLs, GET requests,
cache-busted on every read, no tokens, no environment variables, no writes,
no model calls. The server returns structured facts; the evidence field
reports temporal association ("verified event in window"), never causation.

## Tools

- `get_market_movers`: players whose price move cleared the published 3 pick
  bar over the current shared window, with move, expert move, signal,
  evidence state and archetype.
- `get_player_market_context`: one player by name, the same fields plus the
  ADP-ECR gap, the current calendar phase with its trust reading, and any
  verified events inside the window with dates and source URLs.
- `get_recent_events`: verified events inside the current window, newest
  first, with player, date, short label and source.

## Run

```
cd mcp
npm install
npm test               # spawns the server over stdio and calls every tool
npm run check-drift    # value drift check against ../lib
```

## Claude Desktop

```json
{
  "mcpServers": {
    "draft-ticker": {
      "command": "node",
      "args": ["/absolute/path/to/draft-ticker-fp/mcp/server.mjs"]
    }
  }
}
```
