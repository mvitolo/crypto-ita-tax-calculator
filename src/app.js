// DOM layer: wires the form to the pure calc.js logic, syncs state to the URL,
// and renders the Quadro RW row. All math lives in calc.js (unit-tested).

import { computeRW, availableYears } from "./calc.js";
import { PRICES, COINS, hasUnverifiedPrices } from "./prices.js";

const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const eur2 = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const $ = (id) => document.getElementById(id);
const els = {
  coin: $("coin"),
  year: $("year"),
  quantity: $("quantity"),
  giorni: $("giorni"),
  error: $("error"),
  result: $("result"),
  iniziale: $("r-iniziale"),
  finale: $("r-finale"),
  giorniOut: $("r-giorni"),
  ic: $("r-ic"),
  info: $("r-info"),
  pricesNote: $("r-prices"),
  priceWarning: $("price-warning"),
};

// ── Setup: populate selects ─────────────────────────────────────────────────
function populateCoins() {
  els.coin.innerHTML = "";
  for (const c of COINS) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.label;
    els.coin.appendChild(opt);
  }
}

function populateYears(coin) {
  const prev = els.year.value;
  els.year.innerHTML = "";
  for (const y of availableYears(PRICES, coin)) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    els.year.appendChild(opt);
  }
  // keep prior selection if still valid
  if ([...els.year.options].some((o) => o.value === prev)) els.year.value = prev;
}

// ── URL state (shareable / bookmarkable) ────────────────────────────────────
function readUrl() {
  const p = new URLSearchParams(location.search);
  return {
    coin: p.get("coin"),
    year: p.get("year"),
    qty: p.get("qty"),
    giorni: p.get("giorni"),
  };
}

function writeUrl() {
  const p = new URLSearchParams();
  p.set("coin", els.coin.value);
  p.set("year", els.year.value);
  if (els.quantity.value !== "") p.set("qty", els.quantity.value);
  if (els.giorni.value !== "") p.set("giorni", els.giorni.value);
  history.replaceState(null, "", `${location.pathname}?${p.toString()}`);
}

// ── Render ──────────────────────────────────────────────────────────────────
function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
  els.result.hidden = true;
}

function clearError() {
  els.error.hidden = true;
}

function priceSourceNote(r) {
  const fmt = (e) =>
    e.retrieved ? `${e.source} (${e.retrieved})` : e.source;
  return `Prices — 1 Jan: ${fmt(r.priceStart)} · 31 Dec: ${fmt(r.priceEnd)}.`;
}

function render() {
  clearError();

  const coin = els.coin.value;
  const year = Number(els.year.value);
  const qtyRaw = els.quantity.value.trim();
  const giorniRaw = els.giorni.value.trim();

  writeUrl();

  if (qtyRaw === "") {
    els.result.hidden = true;
    return;
  }

  const quantity = Number(qtyRaw);
  const giorni = giorniRaw === "" ? null : Number(giorniRaw);

  let r;
  try {
    r = computeRW({ prices: PRICES, coin, year, quantity, giorni });
  } catch (err) {
    showError(err.message);
    return;
  }

  els.iniziale.textContent = eur.format(r.valoreIniziale);
  els.finale.textContent = eur.format(r.valoreFinale);
  els.giorniOut.textContent = `${r.giorni} / ${r.daysInYear}`;
  els.ic.textContent = eur2.format(r.ic);

  const cg = r.capitalGains;
  const move = r.delta >= 0 ? "gain" : "loss";
  let info = `Paper ${move} 1 Jan → 31 Dec: ${eur.format(r.delta)}. `;
  if (cg.isLoss) {
    info += `A loss means no capital-gains tax. `;
  } else if (cg.tax > 0) {
    info += `If this were a realized sale (Quadro RT), capital-gains tax would be ` +
      `~${eur.format(cg.tax)} at ${(cg.rate * 100).toFixed(0)}%` +
      (cg.exemption ? ` (after €${cg.exemption} exemption)` : ``) + `. `;
  } else {
    info += `Below the exemption, no capital-gains tax would apply. `;
  }
  info += `Capital-gains tax applies only on actual sales, not on holding.`;
  els.info.textContent = info;

  els.pricesNote.textContent = priceSourceNote(r);
  els.result.hidden = false;
}

// ── Init ────────────────────────────────────────────────────────────────────
function init() {
  populateCoins();

  const url = readUrl();
  if (url.coin && COINS.some((c) => c.id === url.coin)) els.coin.value = url.coin;
  populateYears(els.coin.value);
  if (url.year && [...els.year.options].some((o) => o.value === url.year)) {
    els.year.value = url.year;
  }
  if (url.qty != null) els.quantity.value = url.qty;
  if (url.giorni != null) els.giorni.value = url.giorni;

  els.priceWarning.hidden = !hasUnverifiedPrices(PRICES);

  els.coin.addEventListener("change", () => {
    populateYears(els.coin.value);
    render();
  });
  for (const el of [els.year, els.quantity, els.giorni]) {
    el.addEventListener("input", render);
  }

  render();
}

init();
