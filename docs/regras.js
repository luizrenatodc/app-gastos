// Regras de negócio do app (puras, testáveis no Node e usadas no navegador).

export const CATEGORIAS = {
  mercado: { nome: "Mercado", cor: "#6fe3c1", icone: "🛒" },
  casa: { nome: "Casa", cor: "#a8d8ff", icone: "🏠" },
  transporte: { nome: "Transporte", cor: "#ffbe5c", icone: "🚗" },
  lazer: { nome: "Lazer", cor: "#ff7eb6", icone: "🎉" },
  saude: { nome: "Saúde", cor: "#c58bff", icone: "💊" },
  outros: { nome: "Outros", cor: "#9aa7bd", icone: "📦" },
};

/** Converte "1.234,56" ou "12,5" ou "12.5" em centavos (inteiro, sem erro de ponto flutuante). */
export function paraCentavos(texto) {
  const limpo = String(texto).trim().replace(/[^\d,.-]/g, "");
  if (!limpo) return NaN;
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normal);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export const brl = (centavos) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const mesDe = (dataISO) => dataISO.slice(0, 7);

export function validar(g) {
  const erros = [];
  if (!g.descricao?.trim()) erros.push("descrição obrigatória");
  if (!Number.isInteger(g.centavos) || g.centavos <= 0) erros.push("valor deve ser positivo");
  if (!CATEGORIAS[g.categoria]) erros.push("categoria inválida");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g.data ?? "")) erros.push("data inválida");
  return erros;
}

/** Resumo do mês: total, por categoria (ordenado) e situação de cada orçamento. */
export function resumoDoMes(gastos, mes, orcamentos = {}) {
  const doMes = gastos.filter((g) => mesDe(g.data) === mes);
  const porCategoria = {};
  for (const g of doMes) porCategoria[g.categoria] = (porCategoria[g.categoria] ?? 0) + g.centavos;
  const total = doMes.reduce((s, g) => s + g.centavos, 0);
  const categorias = Object.entries(porCategoria)
    .map(([id, valor]) => {
      const limite = orcamentos[id];
      const uso = limite ? valor / limite : null;
      return { id, valor, fatia: total ? valor / total : 0, limite: limite ?? null, uso, alerta: uso === null ? "sem-orcamento" : uso >= 1 ? "estourou" : uso >= 0.8 ? "atencao" : "ok" };
    })
    .sort((a, b) => b.valor - a.valor);
  return { mes, total, quantidade: doMes.length, categorias };
}

/** Projeção linear do fim do mês com base no ritmo até o dia de hoje. */
export function projecao(totalAteHoje, diaHoje, diasNoMes) {
  if (diaHoje <= 0) return totalAteHoje;
  return Math.round((totalAteHoje / diaHoje) * diasNoMes);
}

export const diasNoMes = (mes) => { const [a, m] = mes.split("-").map(Number); return new Date(a, m, 0).getDate(); };

/** Exporta CSV (separador ;, como o Excel em pt-BR espera). */
export function paraCSV(gastos) {
  const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const linhas = gastos.map((g) => [g.data, esc(g.descricao), CATEGORIAS[g.categoria].nome, (g.centavos / 100).toFixed(2).replace(".", ",")].join(";"));
  return ["data;descricao;categoria;valor", ...linhas].join("\n");
}
