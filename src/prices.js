// Precomputed BTC/ETH year-boundary prices in EUR.
//
// WHY A STATIC TABLE (not a live API):
// CoinGecko's free/Demo plan only serves the past 365 days of history (since
// Feb 2024), so it cannot price closed past tax years. Bundling the values
// makes the tool offline, key-free, instant, and AUDITABLE — which is what you
// want for anything tax-related.
//
// ┌─────────────────────────────────────────────────────────────────────┐
// │  IMPORTANT: these values are APPROXIMATE placeholders. VERIFY each    │
// │  one against an official/primary source before relying on it for a    │
// │  tax filing, then set `source` and `retrieved`. Updating is a one-    │
// │  line edit. See TODOS.md for the yearly-update routine.               │
// └─────────────────────────────────────────────────────────────────────┘
//
// Shape: PRICES[coinId][year] = { start: Entry, end: Entry }
//   start = value on 1 January (valore iniziale)
//   end   = value on 31 December (valore finale)
//   Entry = { value: number (EUR), source: string, retrieved: string|null }

const approx = (value) => ({ value, source: "approximate — VERIFY", retrieved: null });

export const PRICES = {
  bitcoin: {
    2021: { start: approx(23800), end: approx(40800) },
    2022: { start: approx(42000), end: approx(15500) },
    2023: { start: approx(15600), end: approx(38300) },
    2024: { start: approx(40000), end: approx(90200) },
    2025: {
      // EUR-native (not FX-converted). Still confirm against your broker's records for filing.
      start: { value: 91431, source: "BTC-EUR web (Bitcoin X, 1 Jan 2025)", retrieved: "2026-06-14" },
      end: { value: 74495, source: "BTC-EUR web (exchange-rates.org, 31 Dec 2025)", retrieved: "2026-06-14" },
    },
  },
  ethereum: {
    2021: { start: approx(600),  end: approx(3250) },
    2022: { start: approx(3320), end: approx(1125) },
    2023: { start: approx(1125), end: approx(2075) },
    2024: { start: approx(2075), end: approx(3215) },
    2025: { start: approx(3237), end: approx(2553) },
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
