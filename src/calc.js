// Pure tax-calculation logic for the Italian crypto Quadro RW helper.
//
// This module is DOM-free and side-effect-free so it can be unit-tested
// directly with `node --test`. The DOM layer lives in app.js.
//
// CALCULATION PIPELINE
// ────────────────────
//   inputs: coin, year, quantity, giorni (days held, default = full year)
//      │
//      ├─ lookupPrice(start) ─► valore iniziale = quantity × price(1 Jan)
//      ├─ lookupPrice(end)   ─► valore finale   = quantity × price(31 Dec)
//      │
//      ├─ IC (Quadro RW holding tax)  = valore finale × 0.2% × (giorni / daysInYear)
//      └─ capital-gains INFO (Quadro RT, separate, sale-only):
//             delta = valore finale − valore iniziale
//             tax   = max(0, delta − exemption) × rate   (info only, not RW)
//
// Italian rules baked in:
//   - IC rate 0.2% (2 per mille), L. 197/2022 art. 1 c. 146 — Quadro RW.
//   - Capital gains 26% (2023–2025), 33% from 2026 (L. 208/2025) — Quadro RT.
//   - €2,000 exemption on realized gains for 2023–2024 only; removed from 2025.

export const TAX_RULES = {
  icRate: 0.002, // 0.2% Imposta sulle Criptoattivita (Quadro RW)
};

// The Italian crypto IC (Quadro RW) and 26% capital-gains regime both began in
// 2023 (L. 197/2022). Figures for earlier years are illustrative only.
export const REGIME_START_YEAR = 2023;

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year) {
  return isLeapYear(year) ? 366 : 365;
}

// Capital-gains rate (Quadro RT). 26% through 2025, 33% from 2026.
export function getCapitalGainsRate(year) {
  return year >= 2026 ? 0.33 : 0.26;
}

// Realized-gains exemption: €2,000 for 2023 and 2024 only.
export function getCapitalGainsExemption(year) {
  return year === 2023 || year === 2024 ? 2000 : 0;
}

// Years that have bundled price data for a given coin (sorted descending).
export function availableYears(prices, coin) {
  const entry = prices[coin];
  if (!entry) return [];
  return Object.keys(entry)
    .map(Number)
    .sort((a, b) => b - a);
}

// Returns the price Entry, or throws a clear error if the data is missing.
export function lookupPrice(prices, coin, year, boundary) {
  const coinData = prices[coin];
  if (!coinData) throw new Error(`No price data for coin "${coin}".`);
  const yearData = coinData[year];
  if (!yearData) throw new Error(`No price data yet for ${coin} ${year}.`);
  const entry = yearData[boundary];
  if (!entry) throw new Error(`No "${boundary}" price for ${coin} ${year}.`);
  return entry;
}

// IC = valore finale × 0.2% × (giorni / daysInYear). Pro-rated by days held.
export function computeIC({ valoreFinale, giorni, year }) {
  return valoreFinale * TAX_RULES.icRate * (giorni / daysInYear(year));
}

// Capital-gains INFO line (Quadro RT). Informational only — tax applies on
// actual sales, not on holding. A loss yields zero tax.
export function computeCapitalGainsInfo({ delta, year }) {
  const rate = getCapitalGainsRate(year);
  const exemption = getCapitalGainsExemption(year);
  if (delta <= 0) {
    return { taxable: 0, rate, exemption, tax: 0, isLoss: delta < 0 };
  }
  const taxable = Math.max(0, delta - exemption);
  return { taxable, rate, exemption, tax: taxable * rate, isLoss: false };
}

// Full Quadro RW computation. Validates inputs and throws on bad data so the
// UI can show a clear message.
export function computeRW({ prices, coin, year, quantity, giorni }) {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new RangeError("Quantity must be a number ≥ 0.");
  }
  const days = daysInYear(year);
  const g = giorni == null ? days : giorni;
  if (!Number.isFinite(g) || g < 0 || g > days) {
    throw new RangeError(`Days held must be between 0 and ${days}.`);
  }

  const start = lookupPrice(prices, coin, year, "start");
  const end = lookupPrice(prices, coin, year, "end");

  const valoreIniziale = quantity * start.value;
  const valoreFinale = quantity * end.value;
  const ic = computeIC({ valoreFinale, giorni: g, year });
  const delta = valoreFinale - valoreIniziale;
  const capitalGains = computeCapitalGainsInfo({ delta, year });

  return {
    coin,
    year,
    quantity,
    giorni: g,
    daysInYear: days,
    priceStart: start,
    priceEnd: end,
    valoreIniziale,
    valoreFinale,
    ic,
    delta,
    capitalGains,
  };
}

// Aggregate several holdings into the single Quadro RW row (codice 21).
// holdings: [{ coin, quantity }]. Entries with quantity <= 0 are skipped.
// The €2,000 capital-gains exemption is applied ONCE to the total gain, matching
// how Quadro RT aggregates realized gains over the year (not per asset).
//
//   per-coin computeRW ──┐
//   per-coin computeRW ──┼─► sum(valoreIniziale, valoreFinale, IC)
//                        └─► total delta ─► computeCapitalGainsInfo (exemption once)
export function computePortfolio({ prices, year, holdings, giorni }) {
  const rows = [];
  for (const h of holdings) {
    const q = Number(h.quantity);
    if (!Number.isFinite(q) || q <= 0) continue;
    rows.push(computeRW({ prices, coin: h.coin, year, quantity: q, giorni }));
  }
  const sum = (sel) => rows.reduce((acc, r) => acc + sel(r), 0);
  const valoreIniziale = sum((r) => r.valoreIniziale);
  const valoreFinale = sum((r) => r.valoreFinale);
  const ic = sum((r) => r.ic);
  const delta = valoreFinale - valoreIniziale;
  const capitalGains = computeCapitalGainsInfo({ delta, year });
  return { year, rows, valoreIniziale, valoreFinale, ic, delta, capitalGains };
}
