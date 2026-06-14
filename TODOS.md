# TODOS — cryptocalculator

## Yearly price update
- **What:** Each January, add the prior year's 1/1 and 31/12 BTC/ETH EUR prices to `prices.json`.
- **Why:** Bundled (precomputed) prices are the data source; a new closed tax year needs new entries.
- **Context:** Pull year-boundary values from a feed with deep history (CoinGecko CSV download / Pro trial / equivalent). Record `source` + `retrieved` date per entry for auditability. ~2 min/year by hand. Could later be automated with a small Node fetch script that regenerates prices.json.
- **Depends on:** core calculator shipped.

## Deferred (considered, not in scope for v1)
- **More coins** beyond BTC/ETH — add entries to prices.json + picker. Defer until requested.
- **Full RT realized-gain calculator** (buy/sell, actual 26%/33% on disposals, €2,000 threshold 2023–24) — the "correct filing" mode. v1 is the RW/IC estimate only.
- **Official cambio handling** (C.M. 10/2014 December exchange rates) — v1 uses spot EUR values with a stated caveat.
- **Automated price-fetch script** — nice-to-have; manual update is fine at current scale.
