import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isLeapYear,
  daysInYear,
  getCapitalGainsRate,
  getCapitalGainsExemption,
  availableYears,
  lookupPrice,
  computeIC,
  computeCapitalGainsInfo,
  computeRW,
  computePortfolio,
  TAX_RULES,
} from "../src/calc.js";
import { PRICES } from "../src/prices.js";

const close = (a, b, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

// ── daysInYear / leap years ────────────────────────────────────────────────
test("daysInYear: common year is 365", () => assert.equal(daysInYear(2023), 365));
test("daysInYear: leap year 2024 is 366", () => assert.equal(daysInYear(2024), 366));
test("isLeapYear: 2000 leap, 1900 not, 2024 leap, 2023 not", () => {
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(1900), false);
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2023), false);
});

// ── capital-gains rate (Quadro RT) ─────────────────────────────────────────
test("rate is 26% through 2025", () => {
  assert.equal(getCapitalGainsRate(2023), 0.26);
  assert.equal(getCapitalGainsRate(2025), 0.26);
});
test("rate is 33% from 2026", () => {
  assert.equal(getCapitalGainsRate(2026), 0.33);
  assert.equal(getCapitalGainsRate(2030), 0.33);
});

// ── exemption ──────────────────────────────────────────────────────────────
test("exemption €2000 for 2023 and 2024 only", () => {
  assert.equal(getCapitalGainsExemption(2023), 2000);
  assert.equal(getCapitalGainsExemption(2024), 2000);
  assert.equal(getCapitalGainsExemption(2025), 0);
  assert.equal(getCapitalGainsExemption(2022), 0);
});

// ── lookupPrice ─────────────────────────────────────────────────────────────
test("lookupPrice: hit returns an entry with a numeric value", () => {
  const e = lookupPrice(PRICES, "bitcoin", 2024, "start");
  assert.equal(typeof e.value, "number");
});
test("lookupPrice: missing coin throws", () => {
  assert.throws(() => lookupPrice(PRICES, "dogecoin", 2024, "start"), /No price data for coin/);
});
test("lookupPrice: missing year throws", () => {
  assert.throws(() => lookupPrice(PRICES, "bitcoin", 1999, "start"), /No price data yet/);
});

// ── computeIC (Quadro RW holding tax) ───────────────────────────────────────
test("IC: full year = valoreFinale × 0.2%", () => {
  close(computeIC({ valoreFinale: 100000, giorni: 365, year: 2023 }), 200);
});
test("IC: leap year full year still = valoreFinale × 0.2%", () => {
  close(computeIC({ valoreFinale: 100000, giorni: 366, year: 2024 }), 200);
});
test("IC: half year is pro-rated", () => {
  // 2023 has 365 days; ~half
  close(computeIC({ valoreFinale: 100000, giorni: 182, year: 2023 }), 100000 * 0.002 * (182 / 365));
});
test("IC: zero days held = 0", () => {
  close(computeIC({ valoreFinale: 100000, giorni: 0, year: 2023 }), 0);
});

// ── computeCapitalGainsInfo ─────────────────────────────────────────────────
test("capital gains: positive delta taxed at rate after exemption (2025, no exemption)", () => {
  const r = computeCapitalGainsInfo({ delta: 50000, year: 2025 });
  close(r.tax, 50000 * 0.26);
  assert.equal(r.exemption, 0);
});
test("capital gains: 2024 applies €2000 exemption", () => {
  const r = computeCapitalGainsInfo({ delta: 50000, year: 2024 });
  close(r.taxable, 48000);
  close(r.tax, 48000 * 0.26);
});
test("capital gains: loss yields zero tax and isLoss flag", () => {
  const r = computeCapitalGainsInfo({ delta: -1000, year: 2024 });
  assert.equal(r.tax, 0);
  assert.equal(r.isLoss, true);
});
test("capital gains: 2026 uses 33%", () => {
  const r = computeCapitalGainsInfo({ delta: 10000, year: 2026 });
  close(r.tax, 10000 * 0.33);
});

// ── computeRW integration + validation ──────────────────────────────────────
test("computeRW: BTC 2024 full year produces consistent figures", () => {
  const start = lookupPrice(PRICES, "bitcoin", 2024, "start").value;
  const end = lookupPrice(PRICES, "bitcoin", 2024, "end").value;
  const r = computeRW({ prices: PRICES, coin: "bitcoin", year: 2024, quantity: 2 });
  close(r.valoreIniziale, 2 * start);
  close(r.valoreFinale, 2 * end);
  close(r.ic, 2 * end * 0.002); // full year (366/366)
  close(r.delta, 2 * (end - start));
  assert.equal(r.giorni, 366);
  assert.equal(r.daysInYear, 366);
});
test("computeRW: quantity 0 gives all zeros", () => {
  const r = computeRW({ prices: PRICES, coin: "ethereum", year: 2023, quantity: 0 });
  assert.equal(r.valoreIniziale, 0);
  assert.equal(r.valoreFinale, 0);
  assert.equal(r.ic, 0);
  assert.equal(r.delta, 0);
});
test("computeRW: negative quantity throws", () => {
  assert.throws(() => computeRW({ prices: PRICES, coin: "bitcoin", year: 2024, quantity: -1 }), RangeError);
});
test("computeRW: NaN quantity throws", () => {
  assert.throws(() => computeRW({ prices: PRICES, coin: "bitcoin", year: 2024, quantity: NaN }), RangeError);
});
test("computeRW: days held above year length throws", () => {
  assert.throws(
    () => computeRW({ prices: PRICES, coin: "bitcoin", year: 2023, quantity: 1, giorni: 400 }),
    RangeError
  );
});
test("computeRW: missing year throws (in-progress / no data)", () => {
  assert.throws(() => computeRW({ prices: PRICES, coin: "bitcoin", year: 2099, quantity: 1 }), /No price data yet/);
});

// ── GOLDEN FIXTURE: stable, source-independent hand-computed row ─────────────
// Holding: valore finale €90,200, full leap year (2024), quantity already
// folded into the value. Verifies the exact IC and capital-gains math.
test("GOLDEN: IC and capital gains for a €90,200 / €40,000 holding in 2024", () => {
  const valoreFinale = 90200;
  const valoreIniziale = 40000;
  // IC = 90200 × 0.002 × 366/366 = 180.40
  close(computeIC({ valoreFinale, giorni: 366, year: 2024 }), 180.4);
  // delta = 50,200; exemption 2,000 → taxable 48,200; tax = 48,200 × 0.26 = 12,532
  const cg = computeCapitalGainsInfo({ delta: valoreFinale - valoreIniziale, year: 2024 });
  close(cg.taxable, 48200);
  close(cg.tax, 12532);
  assert.equal(TAX_RULES.icRate, 0.002);
});

// ── computePortfolio (aggregate BTC + ETH into the Quadro RW row) ────────────
test("portfolio: sums valore iniziale/finale/IC across coins", () => {
  const p = computePortfolio({
    prices: PRICES,
    year: 2024,
    holdings: [{ coin: "bitcoin", quantity: 1 }, { coin: "ethereum", quantity: 10 }],
  });
  const btc = computeRW({ prices: PRICES, coin: "bitcoin", year: 2024, quantity: 1 });
  const eth = computeRW({ prices: PRICES, coin: "ethereum", year: 2024, quantity: 10 });
  assert.equal(p.rows.length, 2);
  close(p.valoreIniziale, btc.valoreIniziale + eth.valoreIniziale);
  close(p.valoreFinale, btc.valoreFinale + eth.valoreFinale);
  close(p.ic, btc.ic + eth.ic);
  close(p.delta, btc.delta + eth.delta);
});

test("portfolio: skips zero/blank quantities", () => {
  const p = computePortfolio({
    prices: PRICES,
    year: 2024,
    holdings: [{ coin: "bitcoin", quantity: 0.5 }, { coin: "ethereum", quantity: 0 }],
  });
  assert.equal(p.rows.length, 1);
  assert.equal(p.rows[0].coin, "bitcoin");
});

test("portfolio: €2000 exemption applied ONCE to the total gain, not per coin", () => {
  // Two coins each with a 1500 gain. Per-coin both are below €2000 (would be 0
  // tax each); aggregated the 3000 total minus 2000 exemption = 1000 taxable.
  const MOCK = {
    a: { 2024: { start: { value: 0 }, end: { value: 1500 } } },
    b: { 2024: { start: { value: 0 }, end: { value: 1500 } } },
  };
  const p = computePortfolio({
    prices: MOCK,
    year: 2024,
    holdings: [{ coin: "a", quantity: 1 }, { coin: "b", quantity: 1 }],
  });
  close(p.delta, 3000);
  close(p.capitalGains.taxable, 1000);
  close(p.capitalGains.tax, 260); // 1000 × 26%
});

test("portfolio: empty holdings → no rows, zero totals", () => {
  const p = computePortfolio({ prices: PRICES, year: 2024, holdings: [] });
  assert.equal(p.rows.length, 0);
  assert.equal(p.valoreFinale, 0);
  assert.equal(p.ic, 0);
});

// ── availableYears ──────────────────────────────────────────────────────────
test("availableYears: returns sorted-desc years for a coin", () => {
  const ys = availableYears(PRICES, "bitcoin");
  assert.deepEqual(ys, [...ys].sort((a, b) => b - a));
  assert.ok(ys.includes(2024));
});
test("availableYears: unknown coin returns empty array", () => {
  assert.deepEqual(availableYears(PRICES, "nope"), []);
});
