// Precomputed BTC/ETH year-boundary prices in EUR.
//
// WHY A STATIC TABLE (not a live API):
// CoinGecko's free/Demo plan only serves the past 365 days of history (since
// Feb 2024), so it cannot price closed past tax years. Bundling the values
// makes the tool offline, key-free, instant, and AUDITABLE — which is what you
// want for anything tax-related.
//
// CONVENTION:
//   start = value on 1 January  (valore iniziale) = that day's OPEN price
//   end   = value on 31 December (valore finale)  = that day's CLOSE price
//
// SOURCING:
//   invOpen/invClose entries come from investing.com EUR-native daily data;
//   the raw API JSON lives under data/<year>-<coin>-eur.json for auditing.
//   approx() entries are still UNVERIFIED placeholders — replace them by
//   dropping the matching data/ file and wiring the values in. The in-app
//   warning banner stays up while any approx() entry remains.
//
// Shape: PRICES[coinId][year] = { start: Entry, end: Entry }
//   Entry = { value: number (EUR), source: string, retrieved: string|null }

const RETRIEVED = "2026-06-14";
const approx = (value) => ({ value, source: "approximate — VERIFY", retrieved: null });
const invOpen = (value) => ({ value, source: "investing.com EUR (1 Jan open)", retrieved: RETRIEVED });
const invClose = (value) => ({ value, source: "investing.com EUR (31 Dec close)", retrieved: RETRIEVED });

export const PRICES = {
  bitcoin: {
    // All years: investing.com BTC/EUR — data/<year>-btc-eur.json
    2021: { start: invOpen(23647.2), end: invClose(40660.3) },
    2022: { start: invOpen(40650.2), end: invClose(15420.9) },
    2023: { start: invOpen(15423.0), end: invClose(38397.0) },
    2024: { start: invOpen(38404.5), end: invClose(90168.1) },
    2025: { start: invOpen(90166.7), end: invClose(74500.1) },
  },
  ethereum: {
    // 2025: investing.com ETH/EUR — data/2025-eth-eur.json
    // 2021–2024: UNVERIFIED placeholders — add data/<year>-eth-eur.json to replace.
    2021: { start: approx(600), end: approx(3250) },
    2022: { start: approx(3320), end: approx(1125) },
    2023: { start: approx(1125), end: approx(2075) },
    2024: { start: approx(2075), end: approx(3215) },
    2025: { start: invOpen(3219.0), end: invClose(2525.99) },
  },
};

export const COINS = [
  { id: "bitcoin", label: "Bitcoin (BTC)" },
  { id: "ethereum", label: "Ethereum (ETH)" },
];

// True if any bundled value is still an unverified placeholder.
export function hasUnverifiedPrices(prices = PRICES) {
  for (const coin of Object.values(prices)) {
    for (const year of Object.values(coin)) {
      for (const boundary of Object.values(year)) {
        if (boundary.source === "approximate — VERIFY") return true;
      }
    }
  }
  return false;
}
