/**
 * Wrapper para a API do Banco Central do Brasil (SGS – Sistema Gerenciador de Séries)
 * Documentação: https://dadosabertos.bcb.gov.br/dataset/sgs-sistema-gerenciador-de-series-temporais
 */

const BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

// Séries mais usadas
const SERIES = {
  // Juros e inflação
  selic:                432,   // Taxa SELIC (% a.a.)
  selic_meta:           4189,  // Meta SELIC (% a.a.)
  ipca:                 433,   // IPCA (% a.m.)
  igpm:                 189,   // IGP-M (% a.m.)
  inflacao_saude:       7479,  // IPCA – Serviços de saúde (% a.m.)
  inflacao_educacao:    7445,  // IPCA – Educação (% a.m.)
  inflacao_habitacao:   7479,  // IPCA – Habitação (% a.m.)
  // Câmbio
  cambio_usd:           1,     // Taxa de câmbio USD/BRL (venda)
  cambio_eur:           21619, // Taxa de câmbio EUR/BRL (venda)
  // Atividade
  pib_crescimento:      4380,  // Variação real do PIB (% a.a.)
  ibc_br:               24363, // IBC-Br – proxy mensal do PIB
  // Crédito e dívida
  credito_pib:          20539, // Crédito total/PIB (%)
  divida_bruta_pib:     4513,  // Dívida bruta do governo/PIB (%)
  divida_liquida_pib:   4536,  // Dívida líquida do governo/PIB (%)
  // Reservas e balança
  reservas_internacionais: 3546, // Reservas internacionais (US$ mi)
  balanca_comercial:    22707, // Balança comercial semanal (US$ mi)
  // Emprego
  caged_saldo:          28763, // CAGED: saldo (admissões – desligamentos)
  caged_admissoes:      28760, // CAGED: admissões
  caged_desligamentos:  28761, // CAGED: desligamentos
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

// ─── Dívida pública / PIB ─────────────────────────────────────────────────────
export async function fetchPublicDebt(): Promise<{
  bruta_pib: number;
  liquida_pib: number;
  data: string;
  fonte: string;
}> {
  const [bruta, liquida] = await Promise.all([
    fetchSerie(SERIES.divida_bruta_pib, 1),
    fetchSerie(SERIES.divida_liquida_pib, 1),
  ]);
  return {
    bruta_pib:   parseFloat(bruta[0]?.valor   ?? "0"),
    liquida_pib: parseFloat(liquida[0]?.valor ?? "0"),
    data:         bruta[0]?.data ?? "",
    fonte:        "BCB/SGS – Séries 4513/4536 (Dívida/PIB)",
  };
}

// ─── Reservas internacionais ──────────────────────────────────────────────────
export async function fetchInternationalReserves(): Promise<{
  valor_usd_mi: number;
  data: string;
  fonte: string;
}> {
  const dados = await fetchSerie(SERIES.reservas_internacionais, 1);
  return {
    valor_usd_mi: parseFloat(dados[0]?.valor ?? "0"),
    data: dados[0]?.data ?? "",
    fonte: "BCB/SGS – Série 3546 (Reservas Internacionais)",
  };
}

// ─── CAGED (emprego formal) ───────────────────────────────────────────────────
export async function fetchCAGED(n = 6): Promise<{
  historico: Array<{ data: string; saldo: number; admissoes: number; desligamentos: number }>;
  saldo_ultimo: number;
  acumulado_ano: number;
  fonte: string;
}> {
  const [saldos, adm, des] = await Promise.all([
    fetchSerie(SERIES.caged_saldo,          n),
    fetchSerie(SERIES.caged_admissoes,      n),
    fetchSerie(SERIES.caged_desligamentos,  n),
  ]);

  const historico = saldos.map((s, i) => ({
    data:           s.data,
    saldo:          parseFloat(s.valor),
    admissoes:      parseFloat(adm[i]?.valor ?? "0"),
    desligamentos:  parseFloat(des[i]?.valor ?? "0"),
  }));

  const acumulado_ano = historico
    .filter(h => h.data.includes(`/${new Date().getFullYear()}`))
    .reduce((s, h) => s + h.saldo, 0);

  return {
    historico,
    saldo_ultimo:  historico[0]?.saldo ?? 0,
    acumulado_ano,
    fonte: "BCB/SGS – Séries 28763/28760/28761 (CAGED Novo)",
  };
}

// ─── IBC-Br (proxy mensal do PIB) ────────────────────────────────────────────
export async function fetchIBCBr(n = 12): Promise<{
  historico: Array<{ data: string; valor: number }>;
  var_anual: number;
  fonte: string;
}> {
  const dados = await fetchSerie(SERIES.ibc_br, n);
  const historico = dados.map(d => ({ data: d.data, valor: parseFloat(d.valor) }));
  const var_anual = historico.length >= 13
    ? parseFloat((((historico[0].valor / historico[12].valor) - 1) * 100).toFixed(2))
    : 0;
  return {
    historico,
    var_anual,
    fonte: "BCB/SGS – Série 24363 (IBC-Br)",
  };
}
