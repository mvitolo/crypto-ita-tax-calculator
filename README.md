# Crypto Quadro RW Helper 🇮🇹

A tiny static web page that estimates the Italian **Imposta sulle Criptoattività**
(IC, 0.2% — Quadro RW) on a BTC or ETH holding. Pick a coin, a tax year, and a
quantity; get the Quadro RW row (valore iniziale, valore finale, giorni, IC dovuta)
plus a capital-gains (Quadro RT) info line.

> **Estimate / compilation aid — not tax advice.** Verify the numbers before filing.

## How it works

- **No backend, no API, no keys.** Year-boundary prices are bundled in
  `src/prices.js` (CoinGecko's free tier only serves the past 365 days, so it
  can't price closed tax years — a static table is robust, offline, and auditable).
- Pure calculation logic lives in `src/calc.js` (unit-tested). The DOM layer is
  `src/app.js`. Inputs are synced to the URL so results are shareable:
  `?coin=bitcoin&qty=1.5&year=2024`.

### The math
```
IC (Quadro RW)  = valore finale (31 Dec) × 0.2% × (giorni di possesso / daysInYear)
capital gains   = max(0, (valore finale − valore iniziale) − exemption) × rate   (info only)
```
- IC rate: 0.2% (L. 197/2022).
- Capital-gains rate: 26% (2023–2025), 33% from 2026 (L. 208/2025).
- €2,000 exemption on realized gains: 2023 and 2024 only.

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

No build step. Push, then in **Settings → Pages → Deploy from branch → `main` / root**.
Live in ~30s.

## Updating prices

The bundled values in `src/prices.js` are **approximate placeholders** — verify
each against a primary source and set its `source` / `retrieved` fields. Add a new
year each January. See `TODOS.md`.

## License
MIT
