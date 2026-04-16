// ─── Report shape (espelha o JSON do prompt) ──────────────────────────────────
export interface Report {
  title: string;
  subtitle: string;
  verdict: "VIÁVEL" | "VIÁVEL COM RESSALVAS" | "INVIÁVEL" | "EM ANÁLISE";
  verdict_rationale: string;
  executive_summary: string;
  key_metrics: Array<{ label: string; value: string; source: string; verified: boolean }>;
  market: {
    context: string;
    tam: string;
    sam: string;
    som: string;
    cagr: string;
    drivers: string[];
    barriers: string[];
  };
  demand: {
    populacao_alvo: string;
    prevalencia: string;
    volume_anual: string;
    cobertura_planos: string;
    demanda_reprimida: string;
  };
  supply: {
    players_estimados: string;
    referencias: string[];
    gap: string;
  };
  financials: {
    capex_range: string;
    capex_items: Array<{ item: string; valor: string }>;
    receita_unitaria: string;
    break_even: string;
    payback: string;
    premissas: string[];
  };
  signals: Array<{
    tipo: string;
    sinal: string;
    evidencia: string;
    fonte: string;
    urgencia: "alta" | "média" | "baixa";
  }>;
  tech_trends: Array<{ nome: string; impacto: string; horizonte: string }>;
  scenarios: {
    conservador: { prob: string; narrativa: string; mercado_2030: string };
    base: { prob: string; narrativa: string; mercado_2030: string };
    acelerado: { prob: string; narrativa: string; mercado_2030: string };
  };
  opportunities: Array<{
    titulo: string;
    descricao: string;
    por_que_agora: string;
    score: number;
    esforco: "baixo" | "médio" | "alto";
    potencial: "baixo" | "médio" | "alto";
  }>;
  recommendations: Array<{
    prioridade: number;
    acao: string;
    racional: string;
    prazo: string;
    metrica: string;
  }>;
  due_diligence: Array<{ item: string; prioridade: "alta" | "média"; fonte: string }>;
  watch_list: Array<{ item: string; trigger: string; onde: string }>;
  // campo adicional: quais fontes reais foram consultadas
  real_data_sources?: string[];
}

// ─── Planner ──────────────────────────────────────────────────────────────────
export interface RealDataContext {
  sources: string[];             // "IBGE:populacao_DF", "BCB:selic", …
  facts: Record<string, unknown>; // dados brutos retornados pelas APIs
}

// ─── SSE events ───────────────────────────────────────────────────────────────
export type ProgressEvent =
  | { type: "progress"; step: "planning" | "fetching" | "generating"; msg: string }
  | { type: "report"; data: Report }
  | { type: "error"; message: string };
