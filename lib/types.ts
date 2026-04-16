// ─── IBGE ─────────────────────────────────────────────────────────────────────
export interface PopulationData    { uf?: string; populacao: number; ano: string; fonte: string }
export interface AgePyramidData    { faixas: Array<{ faixa: string; percentual: number }>; pct_60_mais: number; fonte: string }
export interface PIBData           { pib_per_capita: number; ano: string; fonte: string }
export interface IncomeData        { renda_media: number; ano: string; fonte: string }

// ─── BCB ──────────────────────────────────────────────────────────────────────
export interface EconomicIndicators { indicadores: Record<string, { valor: number; data: string; serie: number }>; fonte: string }
export interface IPCAHistory        { mensal: Array<{ data: string; valor: number }>; acumulado_12m: number; fonte: string }
export interface HealthInflation    { mensal: Array<{ data: string; valor: number }>; acumulado_12m: number; fonte: string }
export interface CreditToPIB        { pct: number; data: string; fonte: string }
export interface PublicDebt         { bruta_pib: number; liquida_pib: number; data: string; fonte: string }
export interface InternationalReserves { valor_usd_mi: number; data: string; fonte: string }
export interface CAGEDData          { historico: Array<{ data: string; saldo: number; admissoes: number; desligamentos: number }>; saldo_ultimo: number; acumulado_ano: number; fonte: string }
export interface IBCBr              { historico: Array<{ data: string; valor: number }>; var_anual: number; fonte: string }

// ─── IPEA ─────────────────────────────────────────────────────────────────────
export interface IPEASocial         { indicadores: Record<string, { valor: number; data: string; serie: string }>; fonte: string }

// ─── Comex Stat ───────────────────────────────────────────────────────────────
export interface TradeBalance {
  exportacoes_usd: number; importacoes_usd: number; saldo_usd: number; ano: number; fonte: string
}
export interface TradeMonthly {
  mensal: Array<{ mes: number; exportacoes: number; importacoes: number }>; ano: number; fonte: string
}

// ─── ANS ──────────────────────────────────────────────────────────────────────
export interface ANSData {
  total_brasil?: number;
  por_uf?: Array<{ uf: string; beneficiarios: number }>;
  uf_selecionada?: { uf: string; beneficiarios: number };
  data_referencia?: string;
  fonte: string;
}

// ─── ANATEL ───────────────────────────────────────────────────────────────────
export interface ANATELData {
  banda_larga?: { total_acessos?: number; data_referencia?: string; fonte: string };
  telefonia_movel?: { total_acessos?: number; data_referencia?: string; fonte: string };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardData {
  query: string;
  uf?: string;
  generatedAt: string;
  // IBGE
  population?: PopulationData;
  agePyramid?: AgePyramidData;
  income?: IncomeData;
  pib?: PIBData;
  // BCB
  economic?: EconomicIndicators;
  ipca?: IPCAHistory;
  healthInflation?: HealthInflation;
  creditToPIB?: CreditToPIB;
  publicDebt?: PublicDebt;
  reserves?: InternationalReserves;
  caged?: CAGEDData;
  ibcbr?: IBCBr;
  // IPEA
  ipea?: IPEASocial;
  // Comex Stat
  tradeBalance?: TradeBalance;
  tradeByUF?: TradeBalance;
  tradeMonthly?: TradeMonthly;
  // ANS
  ans?: ANSData;
  // ANATEL
  anatel?: ANATELData;
  // Meta
  sources: string[];
  errors: string[];
}

// ─── SSE events ───────────────────────────────────────────────────────────────
export type ProgressEvent =
  | { type: "progress"; msg: string }
  | { type: "dashboard"; data: DashboardData }
  | { type: "error"; message: string };
