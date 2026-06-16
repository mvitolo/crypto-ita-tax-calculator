// DOM layer: wires the form to the pure calc.js logic, syncs state to the URL,
// and renders a live Quadro RW simulation. Each cripto is shown as its own
// fileable row (codice 21); the aggregated total is shown as an alternative,
// since Italian rules don't clearly mandate one row vs separate rows.
// All math lives in calc.js (unit-tested). Holdings assumed held the full year.

import { computePortfolio, availableYears, REGIME_START_YEAR, IC_CODICE_TRIBUTO } from "./calc.js";
import { PRICES, COINS, hasUnverifiedPrices } from "./prices.js";

const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const eur2 = new Intl.NumberFormat("it-IT", {
  style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const eur0 = new Intl.NumberFormat("it-IT", {
  style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0,
});

const NAME = { bitcoin: "Bitcoin (BTC)", ethereum: "Ethereum (ETH)" };

const $ = (id) => document.getElementById(id);
const els = {
  year: $("year"),
  qtyBtc: $("qty-btc"),
  qtyEth: $("qty-eth"),
  error: $("error"),
  result: $("result"),
  yearOut: $("r-year"),
  rwRows: $("rw-rows"),
  rwTotal: $("rw-total"),
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

// ── DOM builders ─────────────────────────────────────────────────────────────
function field(label, value, hero = false) {
  const row = document.createElement("div");
  if (hero) row.className = "hero";
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  row.append(dt, dd);
  return row;
}

function card(title, fields, className = "rw-card") {
  const box = document.createElement("div");
  box.className = className;
  const h = document.createElement("div");
  h.className = "rw-card-title";
  h.textContent = title;
  const dl = document.createElement("dl");
  dl.className = "rw-fields";
  dl.append(...fields);
  box.append(h, dl);
  return box;
}

function coinCard(r) {
  return card(NAME[r.coin] || r.coin, [
    field("Codice bene", "21"),
    field("Quota di possesso", "100%"),
    field("Valore iniziale (1 gen)", eur.format(r.valoreIniziale)),
    field("Valore finale (31 dic)", eur.format(r.valoreFinale)),
    field("Giorni di possesso", String(r.giorni)),
    field("IC dovuta (0,2%)", eur2.format(r.ic), true),
  ]);
}

function totalCard(p) {
  return card("Totale da versare (somma dei righi)", [
    field("Valore iniziale (1 gen)", eur.format(p.valoreIniziale)),
    field("Valore finale (31 dic)", eur.format(p.valoreFinale)),
    field("IC totale da versare", eur0.format(Math.round(p.ic)), true),
  ], "rw-card rw-total-card");
}

// ── Render ──────────────────────────────────────────────────────────────────
function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
  els.result.hidden = true;
}

function render() {
  els.error.hidden = true;
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
    p = computePortfolio({ prices: PRICES, year, holdings }); // full year
  } catch (err) {
    showError(err.message);
    return;
  }

  if (p.rows.length === 0) {
    showError("Inserisci una quantità maggiore di 0 per BTC e/o ETH.");
    return;
  }

  els.yearOut.textContent = String(year);

  // One card per cripto (each a fileable RW row)
  els.rwRows.replaceChildren(...p.rows.map(coinCard));

  // Aggregated total only matters with 2+ holdings
  els.rwTotal.replaceChildren(p.rows.length > 1 ? totalCard(p) : "");

  const totalIc = `${eur2.format(p.ic)} → ${eur0.format(Math.round(p.ic))} arrotondata`;
  els.qNote.textContent =
    `IC totale ${totalIc} (si arrotonda all'euro). Le istruzioni AdE compilano un ` +
    `rigo distinto per ogni cripto (colonne 3=21, 5=quota, 7=val. iniziale, 8=val. finale, ` +
    `10=giorni, 33/34=IC). Versamento con modello F24, codice tributo ${IC_CODICE_TRIBUTO}. ` +
    `Conferma sempre col tuo commercialista.`;

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
