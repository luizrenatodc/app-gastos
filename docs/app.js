import { CATEGORIAS, brl, diasNoMes, paraCSV, paraCentavos, projecao, resumoDoMes, validar } from "./regras.js";

const $ = (s) => document.querySelector(s);
const CHAVE = "gastos-v1";
const hoje = () => new Date().toISOString().slice(0, 10);

const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) ?? null; } catch { return null; } };
const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch { /* modo privado: segue em memória */ } };

function exemplo() {
  const m = hoje().slice(0, 8);
  const d = (n) => m + String(Math.min(n, Number(hoje().slice(8)))).padStart(2, "0");
  return {
    gastos: [
      { id: 1, descricao: "Feira da semana", centavos: 18740, categoria: "mercado", data: d(2) },
      { id: 2, descricao: "Conta de luz", centavos: 21390, categoria: "casa", data: d(5) },
      { id: 3, descricao: "Combustível", centavos: 15000, categoria: "transporte", data: d(6) },
      { id: 4, descricao: "Cinema", centavos: 6400, categoria: "lazer", data: d(8) },
      { id: 5, descricao: "Farmácia", centavos: 4590, categoria: "saude", data: d(9) },
      { id: 6, descricao: "Mercado do mês", centavos: 42310, categoria: "mercado", data: d(10) },
    ],
    orcamentos: { mercado: 70000, lazer: 20000, transporte: 30000 },
  };
}

let estado = ler() ?? exemplo();
let mes = hoje().slice(0, 7);

function render() {
  const [a, m] = mes.split("-").map(Number);
  const t = new Date(a, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  $("#titulo-mes").textContent = t[0].toUpperCase() + t.slice(1);
  const r = resumoDoMes(estado.gastos, mes, estado.orcamentos);
  $("#total").textContent = brl(r.total);
  const ehAtual = mes === hoje().slice(0, 7);
  $("#projecao").textContent = ehAtual && r.total ? `No ritmo atual, o mês fecha em ${brl(projecao(r.total, Number(hoje().slice(8)), diasNoMes(mes)))}` : `${r.quantidade} lançamento(s)`;

  // pizza
  let acc = 0;
  const C = 2 * Math.PI * 44;
  $("#pizza").innerHTML = r.categorias.length
    ? r.categorias.map((c) => { const s = `<circle cx="60" cy="60" r="44" fill="none" stroke="${CATEGORIAS[c.id].cor}" stroke-width="22" stroke-dasharray="${c.fatia * C} ${C}" stroke-dashoffset="${-acc * C}" transform="rotate(-90 60 60)"/>`; acc += c.fatia; return s; }).join("")
    : `<circle cx="60" cy="60" r="44" fill="none" stroke="#2a3346" stroke-width="22"/>`;

  $("#categorias").innerHTML = Object.keys(CATEGORIAS).map((id) => {
    const c = r.categorias.find((x) => x.id === id) ?? { valor: 0, uso: null, alerta: estado.orcamentos[id] ? "ok" : "sem-orcamento", limite: estado.orcamentos[id] ?? null };
    const k = CATEGORIAS[id];
    const barra = c.limite ? `<div class="barra"><i class="${c.alerta}" style="width:${Math.min(100, (c.valor / c.limite) * 100)}%"></i></div>` : "";
    const lim = c.limite ? ` <small>de ${brl(c.limite)}</small>` : ` <small class="link">definir limite</small>`;
    return `<li data-cat="${id}"><span class="bola" style="background:${k.cor}"></span><div class="cat"><b>${k.icone} ${k.nome}</b><span>${brl(c.valor)}${lim}</span>${barra}</div></li>`;
  }).join("");

  const doMes = estado.gastos.filter((g) => g.data.startsWith(mes)).sort((x, y) => y.data.localeCompare(x.data) || y.id - x.id);
  $("#vazio").hidden = doMes.length > 0;
  $("#lista").innerHTML = doMes.map((g) => `<li><span class="ic">${CATEGORIAS[g.categoria].icone}</span><div><b>${esc(g.descricao)}</b><small>${g.data.split("-").reverse().join("/")} · ${CATEGORIAS[g.categoria].nome}</small></div><span class="valor">${brl(g.centavos)}</span><button class="apagar" data-id="${g.id}" aria-label="Apagar ${esc(g.descricao)}">✕</button></li>`).join("");
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function mudaMes(delta) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  render();
}

$("#ant").onclick = () => mudaMes(-1);
$("#prox").onclick = () => mudaMes(1);
$("#form").categoria.innerHTML = Object.entries(CATEGORIAS).map(([id, c]) => `<option value="${id}">${c.icone} ${c.nome}</option>`).join("");

$("#novo").onclick = () => {
  $("#form").reset();
  $("#form").data.value = mes === hoje().slice(0, 7) ? hoje() : `${mes}-01`;
  $("#erros").textContent = "";
  $("#dialogo").showModal();
};

$("#salvar").onclick = (ev) => {
  const f = $("#form");
  const g = { id: Date.now(), descricao: f.descricao.value.trim(), centavos: paraCentavos(f.valor.value), categoria: f.categoria.value, data: f.data.value };
  const erros = validar(g);
  if (erros.length) { ev.preventDefault(); $("#erros").textContent = erros.join(" · "); return; }
  estado.gastos.push(g);
  salvar();
  mes = g.data.slice(0, 7);
  render();
};

$("#lista").onclick = (ev) => {
  const id = Number(ev.target.closest(".apagar")?.dataset.id);
  if (!id) return;
  estado.gastos = estado.gastos.filter((g) => g.id !== id);
  salvar();
  render();
};

let catOrc = null;
$("#categorias").onclick = (ev) => {
  catOrc = ev.target.closest("li")?.dataset.cat;
  if (!catOrc) return;
  $("#orc-nome").textContent = CATEGORIAS[catOrc].nome;
  const atual = estado.orcamentos[catOrc];
  $("#form-orc").limite.value = atual ? (atual / 100).toFixed(2).replace(".", ",") : "";
  $("#dialogo-orc").showModal();
};
$("#dialogo-orc").onclose = () => {
  if ($("#dialogo-orc").returnValue !== "salvar" || !catOrc) return;
  const v = paraCentavos($("#form-orc").limite.value);
  if (Number.isFinite(v) && v > 0) estado.orcamentos[catOrc] = v; else delete estado.orcamentos[catOrc];
  salvar();
  render();
};

$("#csv").onclick = () => {
  const blob = new Blob(["﻿" + paraCSV(estado.gastos.filter((g) => g.data.startsWith(mes)))], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `gastos-${mes}.csv` });
  a.click();
  URL.revokeObjectURL(a.href);
};

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
render();
