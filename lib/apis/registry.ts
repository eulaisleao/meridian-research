/**
 * Registro de todas as APIs públicas brasileiras mapeadas.
 * Status: "ativo" | "parcial" | "chave-gratuita" | "complexo" | "sem-api"
 */

export interface ApiEntry {
  nome: string;
  sigla: string;
  url: string;
  status: "ativo" | "parcial" | "chave-gratuita" | "complexo" | "sem-api";
  dados: string[];
  notes?: string;
}

export const PUBLIC_APIs: ApiEntry[] = [
  // ── IMPLEMENTADOS ──────────────────────────────────────────────────────────
  {
    nome: "Instituto Brasileiro de Geografia e Estatística",
    sigla: "IBGE",
    url: "servicodados.ibge.gov.br/api",
    status: "ativo",
    dados: ["população por UF", "pirâmide etária", "PIB per capita", "renda domiciliar PNAD"],
  },
  {
    nome: "Banco Central do Brasil – Sistema Gerenciador de Séries",
    sigla: "BCB/SGS",
    url: "api.bcb.gov.br",
    status: "ativo",
    dados: ["SELIC", "IPCA", "câmbio", "CAGED", "crédito/PIB", "dívida pública", "reservas internacionais", "inflação saúde"],
  },
  {
    nome: "Instituto de Pesquisa Econômica Aplicada",
    sigla: "IPEA Data",
    url: "ipeadata.gov.br/api/odata4",
    status: "ativo",
    dados: ["desocupação", "coeficiente Gini", "salário mínimo real", "pobreza", "mortalidade infantil"],
  },
  {
    nome: "Ministério do Desenvolvimento, Indústria, Comércio e Serviços",
    sigla: "Comex Stat / MDIC",
    url: "api.comexstat.mdic.gov.br",
    status: "ativo",
    dados: ["exportações por UF", "importações", "balança comercial", "série mensal"],
  },
  {
    nome: "Agência Nacional de Telecomunicações",
    sigla: "ANATEL",
    url: "dados.anatel.gov.br",
    status: "parcial",
    dados: ["acessos banda larga", "linhas móveis (via BCB)"],
    notes: "CKAN disponível; estrutura de campos varia por dataset",
  },

  // ── PARCIAL / CKAN ─────────────────────────────────────────────────────────
  {
    nome: "Agência Nacional de Saúde Suplementar",
    sigla: "ANS",
    url: "dadosabertos.ans.gov.br/api/3",
    status: "parcial",
    dados: ["beneficiários por UF", "operadoras ativas", "índice de desempenho"],
    notes: "CKAN funcional; resource_ids mudam entre releases",
  },
  {
    nome: "Tribunal Superior Eleitoral",
    sigla: "TSE",
    url: "dadosabertos.tse.jus.br/api/3",
    status: "parcial",
    dados: ["candidatos", "resultados eleitorais", "prestação de contas", "pesquisas eleitorais"],
  },
  {
    nome: "Comissão de Valores Mobiliários",
    sigla: "CVM",
    url: "dados.cvm.gov.br/dados",
    status: "parcial",
    dados: ["empresas listadas", "fundos de investimento", "FIIs", "IPOs"],
    notes: "CSV/ZIP por período; sem endpoint REST direto",
  },
  {
    nome: "Instituto Nacional de Estudos e Pesquisas Educacionais",
    sigla: "INEP",
    url: "inep.gov.br/microdados",
    status: "parcial",
    dados: ["ENEM", "IDEB", "Censo Escolar", "PISA Brasil"],
    notes: "Microdados em CSV; sem API REST",
  },

  // ── CHAVE GRATUITA (cadastro obrigatório) ──────────────────────────────────
  {
    nome: "Portal da Transparência – CGU",
    sigla: "Transparência",
    url: "api.portaldatransparencia.gov.br/api-de-dados",
    status: "chave-gratuita",
    dados: ["gastos públicos", "servidores federais", "licitações", "contratos", "benefícios sociais (Bolsa Família)"],
    notes: "Cadastro gratuito em portaldatransparencia.gov.br → Acesso à API",
  },
  {
    nome: "Receita Federal – CNPJ Público",
    sigla: "Receita Federal",
    url: "publica.cnpj.ws/cnpj/{cnpj}",
    status: "ativo",
    dados: ["dados cadastrais CNPJ", "situação", "atividade econômica", "sócios"],
    notes: "Sem autenticação. Rate limit: ~3 req/s",
  },

  // ── COMPLEXO (TabNet / SOAP / scraping) ────────────────────────────────────
  {
    nome: "Departamento de Informática do SUS",
    sigla: "DATASUS",
    url: "tabnet.datasus.gov.br",
    status: "complexo",
    dados: ["mortalidade por CID", "procedimentos SUS", "internações", "AIH", "SIGTAP"],
    notes: "TabNet requer POST com parâmetros de form; CSVs disponíveis para download",
  },
  {
    nome: "Conselho Federal de Medicina",
    sigla: "CFM",
    url: "portal.cfm.org.br/dados-medicos",
    status: "complexo",
    dados: ["médicos por especialidade e UF", "CRM ativo"],
    notes: "Sem API pública; dados via portal web com possível paginação",
  },
  {
    nome: "Agência Nacional de Vigilância Sanitária",
    sigla: "ANVISA",
    url: "consultas.anvisa.gov.br",
    status: "complexo",
    dados: ["registro de medicamentos", "correlatos", "alimentos", "cosméticos"],
    notes: "API de consulta existe mas com CORS restritivo; requer proxy backend",
  },

  // ── SEM API ────────────────────────────────────────────────────────────────
  {
    nome: "Relação Anual de Informações Sociais",
    sigla: "RAIS",
    url: "bi.mte.gov.br/bgcaged",
    status: "sem-api",
    dados: ["emprego formal por setor", "salários", "vínculos ativos"],
    notes: "Microdados por ano em CSV; acesso via BI do MTE",
  },
  {
    nome: "Agência Nacional do Petróleo",
    sigla: "ANP",
    url: "www.gov.br/anp/dados-abertos",
    status: "parcial",
    dados: ["preços de combustíveis", "produção de petróleo e gás", "postos revendedores"],
    notes: "CSVs semanais para combustíveis; dados de produção em Excel",
  },
];

// Contadores por status
export function getRegistrySummary() {
  const byStatus = PUBLIC_APIs.reduce((acc, api) => {
    acc[api.status] = (acc[api.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return { total: PUBLIC_APIs.length, byStatus };
}
