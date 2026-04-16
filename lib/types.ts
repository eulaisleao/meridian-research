// ─── Dados reais das APIs públicas ────────────────────────────────────────────

export interface PopulationData {
  uf?: string;
  populacao: number;
  ano: string;
  fonte: string;
}

export interface AgePyramidData {
  faixas: Array<{ faixa: string; percentual: number }>;
  pct_60_mais: number;
  fonte: string;
}

export interface PIBData {
  pib_per_capita: number;
  ano: string;
  fonte: string;
}

export interface IncomeData {
  renda_media: number;
  ano: string;
  fonte: string;
}

export interface EconomicIndicators {
  indicadores: Record<string, { valor: number; data: string; serie: number }>;
  fonte: string;
}

export interface IPCAHistory {
  mensal: Array<{ data: string; valor: number }>;
  acumulado_12m: number;
  fonte: string;
}

export interface HealthInflation {
  mensal: Array<{ data: string; valor: number }>;
  acumulado_12m: number;
  fonte: string;
}

export interface CreditToPIB {
  pct: number;
  data: string;
  fonte: string;
}

// ─── Payload retornado pela API route ─────────────────────────────────────────
export interface DashboardData {
  query: string;
  uf?: string;
  generatedAt: string;

  // demográfico
  population?: PopulationData;
  agePyramid?: AgePyramidData;
  income?: IncomeData;
  pib?: PIBData;

  // macroeconômico
  economic?: EconomicIndicators;
  ipca?: IPCAHistory;
  healthInflation?: HealthInflation;
  creditToPIB?: CreditToPIB;

  // metadados
  sources: string[];
  errors: string[];
}

// ─── SSE events ───────────────────────────────────────────────────────────────
export type ProgressEvent =
  | { type: "progress"; msg: string }
  | { type: "dashboard"; data: DashboardData }
  | { type: "error"; message: string };
