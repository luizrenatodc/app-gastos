import { test } from "node:test";
import assert from "node:assert/strict";
import { diasNoMes, paraCSV, paraCentavos, projecao, resumoDoMes, validar } from "../docs/regras.js";

test("converte valores digitados em centavos sem erro de ponto flutuante", () => {
  assert.equal(paraCentavos("1.234,56"), 123456);
  assert.equal(paraCentavos("12,5"), 1250);
  assert.equal(paraCentavos("0.1"), 10);
  assert.equal(paraCentavos("R$ 19,90"), 1990);
  assert.ok(Number.isNaN(paraCentavos("")));
});

test("valida o gasto", () => {
  assert.deepEqual(validar({ descricao: "Pão", centavos: 900, categoria: "mercado", data: "2026-11-11" }), []);
  assert.equal(validar({ descricao: " ", centavos: -1, categoria: "x", data: "11/11" }).length, 4);
});

const gastos = [
  { descricao: "a", centavos: 60000, categoria: "mercado", data: "2026-11-02" },
  { descricao: "b", centavos: 15000, categoria: "lazer", data: "2026-11-03" },
  { descricao: "c", centavos: 25000, categoria: "lazer", data: "2026-11-04" },
  { descricao: "d", centavos: 99999, categoria: "casa", data: "2026-10-30" },
];

test("resume o mês por categoria, ordenado do maior para o menor", () => {
  const r = resumoDoMes(gastos, "2026-11");
  assert.equal(r.total, 100000);
  assert.equal(r.quantidade, 3);
  assert.deepEqual(r.categorias.map((c) => c.id), ["mercado", "lazer"]);
  assert.equal(r.categorias[0].fatia, 0.6);
});

test("sinaliza orçamento em atenção (80%) e estourado", () => {
  const r = resumoDoMes(gastos, "2026-11", { mercado: 70000, lazer: 35000 });
  const p = Object.fromEntries(r.categorias.map((c) => [c.id, c.alerta]));
  assert.equal(p.mercado, "atencao");
  assert.equal(p.lazer, "estourou");
});

test("projeta o fim do mês pelo ritmo atual", () => {
  assert.equal(projecao(30000, 10, 30), 90000);
  assert.equal(diasNoMes("2028-02"), 29);
  assert.equal(diasNoMes("2026-11"), 30);
});

test("exporta CSV com separador ; e aspas escapadas", () => {
  const csv = paraCSV([{ descricao: 'Pizza "grande"', centavos: 5990, categoria: "lazer", data: "2026-11-05" }]);
  assert.equal(csv.split("\n")[1], '2026-11-05;"Pizza ""grande""";Lazer;59,90');
});
