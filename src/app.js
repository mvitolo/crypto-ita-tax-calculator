// DOM layer: wires the form to the pure calc.js logic, syncs state to the URL,
// and renders the Quadro RW table (BTC + ETH rows + aggregated total).
// All math lives in calc.js (unit-tested).

import { computePortfolio, availableYears, REGIME_START_YEAR } from "./calc.js";
import { PRICES, COINS, hasUnverifiedPrices } from "./prices.js";

const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const eur2 = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const LABEL = { bitcoin: "BTC", ethereum: "ETH" };

const $ = (id) => document.getElementById(id);
const els = {
  year: $("year"),
  qtyBtc: $("qty-btc"),
  qtyEth: $("qty-eth"),
  giorni: $("giorni"),
  error: $("error"),
  result: $("result"),
  yearOut: $("r-year"),
  rows: $("r-rows"),
  tIniziale: $("t-iniziale"),
  tFinale: $("t-finale"),
  tGiorni: $("t-giorni"),
  tIc: $("t-ic"),
  info: $("r-info"),
  pricesNote: $("r-prices"),
  priceWarning: $("price-warning"),
  regimeNote: $("regime-note"),
};

// ── Setup ────────────────────────────────────────────────────────────────────
function populateYears() {
  // BTC and ETH share the same set of years; use BTC as the source of truth.
  for (const y of availableYears(PRICES, "bitcoin")) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    els.year.appendChild(opt);
  }
}

// ── URL state (shareable / bookmarkable) ────────────────────────────────────
function readUrl() {
  const p = new URLSearchParams(location.search);
  return { year: p.get("year"), btc: p.get("btc"), eth: p.get("eth"), giorni: p.get("giorni") };
}

function writeUrl() {
  const p = new URLSearchParams();
  p.set("year", els.year.value);
  if (els.qtyBtc.value !== "") p.set("btc", els.qtyBtc.value);
  if (els.qtyEth.value !== "") p.set("eth", els.qtyEth.value);
  if (els.giorni.value !== "") p.set("giorni", els.giorni.value);
  history.replaceState(null, "", `${location.pathname}?${p.toString()}`);
}

// ── Render helpers ───────────────────────────────────────────────────────────
function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
  els.result.hidden = true;
}

function clearError() {
  els.error.hidden = true;
}

function rowHtml(r) {
  const tr = document.createElement("tr");
  const cells = [
    LABEL[r.coin] || r.coin,
    eur.format(r.valoreIniziale),
    eur.format(r.valoreFinale),
    `${r.giorni} / ${r.daysInYear}`,
    eur2.format(r.ic),
  ];
  cells.forEach((text, i) => {
    const cell = document.createElement(i === 0 ? "th" : "td");
    cell.textContent = text;
    tr.appendChild(cell);
  });
  return tr;
}

// ── Render ──────────────────────────────────────────────────────────────────
function render() {
  clearError();
  writeUrl();

  const year = Number(els.year.value);
  const qBtc = els.qtyBtc.value.trim();
  const qEth = els.qtyEth.value.trim();
  const giorniRaw = els.giorni.value.trim();

  if (qBtc === "" && qEth === "") {
    els.result.hidden = true;
    return;
  }

  const giorni = giorniRaw === "" ? null : Number(giorniRaw);
  const holdings = [
    { coin: "bitcoin", quantity: qBtc === "" ? 0 : Number(qBtc) },
    { coin: "ethereum", quantity: qEth === "" ? 0 : Number(qEth) },
  ];

  let p;
  try {
    p = computePortfolio({ prices: PRICES, year, holdings, giorni });
  } catch (err) {
    showError(err.message);
    return;
  }

  if (p.rows.length === 0) {
    showError("Inserisci una quantità maggiore di 0 per BTC e/o ETH.");
    return;
  }

  // per-coin rows
  els.rows.replaceChildren(...p.rows.map(rowHtml));

  // total (the Quadro RW figures)
  const days = p.rows[0].daysInYear;
  const giorniShown = p.rows[0].giorni;
  els.yearOut.textContent = String(year);
  els.tIniziale.textContent = eur.format(p.valoreIniziale);
  els.tFinale.textContent = eur.format(p.valoreFinale);
  els.tGiorni.textContent = `${giorniShown} / ${days}`;
  els.tIc.textContent = eur2.format(p.ic);

  // capital-gains info (aggregate, Quadro RT — info only)
  const cg = p.capitalGains;
  const move = p.delta >= 0 ? "plusvalenza" : "minusvalenza";
  let info = `${move[0].toUpperCase()}${move.slice(1)} teorica 1 gen → 31 dic (totale): ${eur.format(p.delta)}. `;
  if (cg.isLoss) {
    info += `In caso di minusvalenza non è dovuta imposta sul capital gain. `;
  } else if (cg.tax > 0) {
    info += `Se realizzata (Quadro RT), l'imposta sul capital gain sarebbe ~${eur.format(cg.tax)} al ` +
      `${(cg.rate * 100).toFixed(0)}%` + (cg.exemption ? ` (dopo la franchigia di €${cg.exemption})` : ``) + `. `;
  } else {
    info += `Sotto la franchigia, non sarebbe dovuta imposta sul capital gain. `;
  }
  info += `L'IC (il totale qui sopra) è comunque dovuta: è un'imposta sul possesso, non sul profitto.`;
  els.info.textContent = info;

  els.pricesNote.textContent = "Prezzi: investing.com EUR giornalieri — apertura 1 gen, chiusura 31 dic.";
  els.regimeNote.hidden = year >= REGIME_START_YEAR;
  els.result.hidden = false;
}

// ── Init ────────────────────────────────────────────────────────────────────
function init() {
  populateYears();

  const url = readUrl();
  if (url.year && [...els.year.options].some((o) => o.value === url.year)) els.year.value = url.year;
  if (url.btc != null) els.qtyBtc.value = url.btc;
  if (url.eth != null) els.qtyEth.value = url.eth;
  if (url.giorni != null) els.giorni.value = url.giorni;

  els.priceWarning.hidden = !hasUnverifiedPrices(PRICES);

  for (const el of [els.year, els.qtyBtc, els.qtyEth, els.giorni]) {
    el.addEventListener("input", render);
  }

  render();
}

init();
