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
//   To add a new year: drop data/<year>-<coin>-eur.json and add an
//   invOpen(1 Jan open) / invClose(31 Dec close) entry below.
//   `approx()` marks an UNVERIFIED placeholder; the in-app warning banner
//   stays up while any approx() entry remains. (None at present.)
//
// Shape: PRICES[coinId][year] = { start: Entry, end: Entry }
//   Entry = { value: number (EUR), source: string, retrieved: string|null }

const RETRIEVED = "2026-06-14";
// eslint-disable-next-line no-unused-vars -- kept for adding unverified years
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
    // All years: investing.com ETH/EUR — data/<year>-eth-eur.json
    2021: { start: invOpen(602.3), end: invClose(3235.05) },
    2022: { start: invOpen(3235.8), end: invClose(1114.71) },
    2023: { start: invOpen(1115.13), end: invClose(2071.24) },
    2024: { start: invOpen(2071.24), end: invClose(3219.0) },
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
