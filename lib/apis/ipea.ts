/**
 * Wrapper para o IPEA Data (OData v4)
 * Documentação: http://www.ipeadata.gov.br/api/odata4/
 * Sem autenticação. Cobre séries macroeconômicas, sociais e regionais.
 */

const BASE = "http://www.ipeadata.gov.br/api/odata4";

// Séries úteis e seus códigos IPEA
export const IPEA_SERIES = {
  // Trabalho
  desocupacao:       "PNAD12_TXDESOCU12",   // Taxa de desocupação PNAD (%)
  salario_minimo:    "MTE12_SALMIN12",       // Salário mínimo real (R$)
  // Desigualdade
  gini:              "IBRE_GINI",            // Coeficiente de Gini
  pobreza:           "PNAD_PBREAP",          // % população em pobreza (<1/2 SM)
  extrema_pobreza:   "PNAD_PBEX",            // % em extrema pobreza (<1/4 SM)
  // Educação
  analfabetismo:     "PNAD12_TANALFAB12",    // Taxa de analfabetismo (%)
  // Saúde
  mortalidade_inf:   "IBGE_NMORT5",          // Mortalidade infantil (por mil)
  // Energia / Infra
  energia_per_capita:"ELETRO12_CEPK12",      // Consumo energia per capita (kWh)
} as const;

type SerieKey = keyof typeof IPEA_SERIES;

// Converte data OData (/Date(ms)/) para string
function parseODataDate(raw: string): string {
  const match = raw.match(/\/Date\((\d+)\)\//);
  if (!match) return raw;
  return new Date(parseInt(match[1])).toLocaleDateString("pt-BR");
}

async function fetchSerie(codigo: string, top = 1): Promise<Array<{ data: string; valor: number }>> {
  const url = `${BASE}/ValoresSerie(SERCODIGO='${codigo}')?$orderby=VALDATA%20desc&$top=${top}&$format=json`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.value ?? []).map((r: { VALDATA: string; VALVALOR: number }) => ({
      data: parseODataDate(r.VALDATA),
      valor: r.VALVALOR,
    }));
  } catch {
    return [];
  }
}

// ─── Indicadores sociais ──────────────────────────────────────────────────────
export async function fetchIPEASocial(keys: SerieKey[] = ["desocupacao", "gini", "salario_minimo"]): Promise<{
  indicadores: Record<string, { valor: number; data: string; serie: string }>;
  fonte: string;
}> {
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      const codigo = IPEA_SERIES[key];
      const data = await fetchSerie(codigo, 1);
      const last = data[0];
      return { key, valor: last?.valor ?? 0, data: last?.data ?? "", serie: codigo };
    })
  );

  const indicadores: Record<string, { valor: number; data: string; serie: string }> = {};
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.valor) {
      indicadores[r.value.key] = {
        valor: r.value.valor,
        data: r.value.data,
        serie: r.value.serie,
      };
    }
  }

  return { indicadores, fonte: "IPEA Data / OData v4" };
}

// ─── Histórico de desocupação (últimos 8 trimestres) ─────────────────────────
export async function fetchDesocupacaoHistory(): Promise<{
  historico: Array<{ data: string; valor: number }>;
  atual: number;
  fonte: string;
}> {
  const data = await fetchSerie(IPEA_SERIES.desocupacao, 8);
  return {
    historico: data,
    atual: data[0]?.valor ?? 0,
    fonte: "IPEA Data – PNAD12_TXDESOCU12",
  };
}
