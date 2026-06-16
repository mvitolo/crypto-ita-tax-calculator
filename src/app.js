// DOM layer: wires the form to the pure calc.js logic, syncs state to the URL,
// renders a live Quadro RW simulation (single aggregated row) plus a per-coin
// breakdown. All math lives in calc.js (unit-tested). Holdings are assumed held
// for the full year (no days-held input).

import { computePortfolio, availableYears, REGIME_START_YEAR } from "./calc.js";
import { PRICES, COINS, hasUnverifiedPrices } from "./prices.js";

const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const eur2 = new Intl.NumberFormat("it-IT", {
  style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const eur0 = new Intl.NumberFormat("it-IT", {
  style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0,
});

const LABEL = { bitcoin: "BTC", ethereum: "ETH" };

const $ = (id) => document.getElementById(id);
const els = {
  year: $("year"),
  qtyBtc: $("qty-btc"),
  qtyEth: $("qty-eth"),
  error: $("error"),
  result: $("result"),
  yearOut: $("r-year"),
  rows: $("r-rows"),
  qIniziale: $("q-iniziale"),
  qFinale: $("q-finale"),
  qGiorni: $("q-giorni"),
  qIc: $("q-ic"),
  qNote: $("q-note"),
  info: $("r-info"),
  pricesNote: $("r-prices"),
  priceWarning: $("price-warning"),
  regimeNote: $("regime-note"),
};

// ── Setup ────────────────────────────────────────────────────────────────────
function populateYears() {
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
  return { year: p.get("year"), btc: p.get("btc"), eth: p.get("eth") };
}

function writeUrl() {
  const p = new URLSearchParams();
  p.set("year", els.year.value);
  if (els.qtyBtc.value !== "") p.set("btc", els.qtyBtc.value);
  if (els.qtyEth.value !== "") p.set("eth", els.qtyEth.value);
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
  const cells = [LABEL[r.coin] || r.coin, eur.format(r.valoreIniziale), eur.format(r.valoreFinale), eur2.format(r.ic)];
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

  if (qBtc === "" && qEth === "") {
    els.result.hidden = true;
    return;
  }

  const holdings = [
    { coin: "bitcoin", quantity: qBtc === "" ? 0 : Number(qBtc) },
    { coin: "ethereum", quantity: qEth === "" ? 0 : Number(qEth) },
  ];

  let p;
  try {
    p = computePortfolio({ prices: PRICES, year, holdings }); // full year (no giorni)
  } catch (err) {
    showError(err.message);
    return;
  }

  if (p.rows.length === 0) {
    showError("Inserisci una quantità maggiore di 0 per BTC e/o ETH.");
    return;
  }

  const days = p.rows[0].daysInYear;

  // Quadro RW simulation (the single row to file)
  els.yearOut.textContent = String(year);
  els.qIniziale.textContent = eur.format(p.valoreIniziale);
  els.qFinale.textContent = eur.format(p.valoreFinale);
  els.qGiorni.textContent = String(days); // full year
  els.qIc.textContent = eur0.format(Math.round(p.ic)); // imposta arrotondata all'euro
  els.qNote.textContent = `IC = ${eur2.format(p.ic)} → arrotondata a ${eur0.format(Math.round(p.ic))}. 0,2% del valore finale.`;

  // Per-coin breakdown
  els.rows.replaceChildren(...p.rows.map(rowHtml));

  // Capital-gains info (aggregate, Quadro RT — info only)
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
  info += `L'IC qui sopra è comunque dovuta: è un'imposta sul possesso, non sul profitto.`;
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

  els.priceWarning.hidden = !hasUnverifiedPrices(PRICES);

  for (const el of [els.year, els.qtyBtc, els.qtyEth]) {
    el.addEventListener("input", render);
  }

  render();
}

init();
