/**
 * Wrapper para a API do Banco Central do Brasil (SGS – Sistema Gerenciador de Séries)
 * Documentação: https://dadosabertos.bcb.gov.br/dataset/sgs-sistema-gerenciador-de-series-temporais
 */

const BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

// Séries mais usadas
const SERIES = {
  selic:           432,   // Taxa SELIC (% a.a.)
  selic_meta:      4189,  // Meta SELIC (% a.a.)
  ipca:            433,   // IPCA (% a.m.)
  igpm:            189,   // IGP-M (% a.m.)
  cambio_usd:      1,     // Taxa de câmbio USD/BRL (venda)
  cambio_eur:      21619, // Taxa de câmbio EUR/BRL (venda)
  pib_crescimento: 4380,  // Variação real do PIB (% a.a.)
  credito_pib:     20539, // Crédito total/PIB (%)
  inflacao_saude:  7479,  // IPCA – Serviços de saúde (% a.m.)
} as const;

type SerieKey = keyof typeof SERIES;

async function fetchSerie(serieId: number, n = 1): Promise<Array<{ data: string; valor: string }>> {
  const url = `${BASE}.${serieId}/dados/ultimos/${n}?formato=json`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// ─── Indicadores econômicos principais ────────────────────────────────────────
export async function fetchEconomicIndicators(keys: SerieKey[] = ["selic", "ipca", "cambio_usd"]): Promise<{
  indicadores: Record<string, { valor: number; data: string; serie: number }>;
  fonte: string;
}> {
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      const id = SERIES[key];
      const data = await fetchSerie(id, 1);
      const last = data[0];
      return { key, valor: parseFloat(last?.valor ?? "0"), data: last?.data ?? "", serie: id };
    })
  );

  const indicadores: Record<string, { valor: number; data: string; serie: number }> = {};
  for (const r of results) {
    if (r.status === "fulfilled") {
      indicadores[r.value.key] = {
        valor: r.value.valor,
        data: r.value.data,
        serie: r.value.serie,
      };
    }
  }

  return { indicadores, fonte: "BCB/SGS" };
}

// ─── Histórico IPCA (últimos 12 meses) ────────────────────────────────────────
export async function fetchIPCAHistory(): Promise<{
  mensal: Array<{ data: string; valor: number }>;
  acumulado_12m: number;
  fonte: string;
}> {
  const dados = await fetchSerie(SERIES.ipca, 12);
  const mensal = dados.map(d => ({ data: d.data, valor: parseFloat(d.valor) }));
  const acumulado_12m = mensal.reduce((acc, d) => acc * (1 + d.valor / 100), 1);

  return {
    mensal,
    acumulado_12m: parseFloat(((acumulado_12m - 1) * 100).toFixed(2)),
    fonte: "BCB/SGS – Série 433 (IPCA)",
  };
}

// ─── Inflação de serviços de saúde ────────────────────────────────────────────
export async function fetchHealthInflation(): Promise<{
  mensal: Array<{ data: string; valor: number }>;
  acumulado_12m: number;
  fonte: string;
}> {
  const dados = await fetchSerie(SERIES.inflacao_saude, 12);
  const mensal = dados.map(d => ({ data: d.data, valor: parseFloat(d.valor) }));
  const acumulado_12m = mensal.reduce((acc, d) => acc * (1 + d.valor / 100), 1);

  return {
    mensal,
    acumulado_12m: parseFloat(((acumulado_12m - 1) * 100).toFixed(2)),
    fonte: "BCB/SGS – Série 7479 (IPCA Serviços de Saúde)",
  };
}

// ─── Crédito total / PIB ───────────────────────────────────────────────────────
export async function fetchCreditToPIB(): Promise<{
  pct: number;
  data: string;
  fonte: string;
}> {
  const dados = await fetchSerie(SERIES.credito_pib, 1);
  return {
    pct: parseFloat(dados[0]?.valor ?? "0"),
    data: dados[0]?.data ?? "",
    fonte: "BCB/SGS – Série 20539 (Crédito/PIB)",
  };
}
