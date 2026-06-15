# Crypto Quadro RW Helper 🇮🇹

A tiny static web page that calculates the Italian **Imposta sulle Criptoattività**
(IC, 0.2% — Quadro RW) for BTC and ETH holdings. Enter your BTC and ETH quantities
and a tax year; get a clear Quadro RW table (per-coin rows plus the aggregated
**Totale · codice 21** row to copy into the form) and a capital-gains (Quadro RT)
info line.

The interface is in Italian; this README is in English.

**▶️ Live: https://mvitolo.github.io/crypto-ita-tax-calculator/**

> **Compilation aid — not tax advice.** Verify the numbers before filing.

## How it works

- **No backend, no API, no keys.** Year-boundary prices (2021–2025, BTC + ETH) are
  bundled in `src/prices.js` from investing.com EUR daily data — 1 Jan **open** for
  valore iniziale, 31 Dec **close** for valore finale. The raw source JSON lives
  under `data/` for auditing. (CoinGecko's free tier only serves the past 365 days,
  so it can't price closed tax years — a static table is robust, offline, and
  auditable.)
- Pure calculation logic lives in `src/calc.js` (unit-tested). The DOM layer is
  `src/app.js`. Inputs are synced to the URL so results are shareable:
  `?year=2024&btc=0.5&eth=4`.
- All crypto aggregates into a single Quadro RW row (codice bene 21), so the tool
  shows per-coin rows plus the total you actually report.

### The math
```
IC (Quadro RW)  = valore finale (31 Dec) × 0.2% × (giorni di possesso / daysInYear)
capital gains   = max(0, (Σ valore finale − Σ valore iniziale) − exemption) × rate   (info only)
```
- IC rate: 0.2% (L. 197/2022). It's a holding tax — due even in a loss year.
- Capital-gains rate: 26% (2023–2025), 33% from 2026 (L. 208/2025), on sales only.
- €2,000 exemption on realized gains: 2023 and 2024 only, applied once to the total.
- The Italian crypto IC and 26% regime began in 2023; earlier years are illustrative.

## Run locally

ES modules need HTTP (not `file://`):
```bash
npm run serve     # python3 -m http.server 8000 → http://localhost:8000
```

## Test
```bash
npm test          # node --test (zero dependencies)
```

## Deploy (GitHub Pages)

No build step. Push to `main`; Pages rebuilds automatically. Source:
**Settings → Pages → Deploy from branch → `main` / root**.

## Updating prices

To add a year: drop `data/<year>-btc-eur.json` and `data/<year>-eth-eur.json`
(investing.com daily export) and add an `invOpen(...)` / `invClose(...)` entry in
`src/prices.js`. See `TODOS.md` for the routine.

## License
MIT
