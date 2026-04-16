/**
 * Extrai estado (UF) e categorias de tópico da query do usuário,
 * sem precisar de IA — só regex e mapeamento de palavras-chave.
 */

const UF_NAMES: Record<string, string> = {
  "acre": "AC", "alagoas": "AL", "amapá": "AP", "amazonas": "AM",
  "bahia": "BA", "ceará": "CE", "brasília": "DF", "distrito federal": "DF",
  "espírito santo": "ES", "goiás": "GO", "maranhão": "MA", "mato grosso": "MT",
  "mato grosso do sul": "MS", "minas gerais": "MG", "pará": "PA",
  "paraíba": "PB", "paraná": "PR", "pernambuco": "PE", "piauí": "PI",
  "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS",
  "rondônia": "RO", "roraima": "RR", "santa catarina": "SC", "são paulo": "SP",
  "sergipe": "SE", "tocantins": "TO",
};

const UF_SIGLAS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

export type Topic =
  | "saude"
  | "fintech"
  | "educacao"
  | "varejo"
  | "imobiliario"
  | "agro"
  | "tecnologia"
  | "geral";

const TOPIC_KEYWORDS: Record<Topic, string[]> = {
  saude: ["saúde","clínica","hospital","médico","oftalmolog","catarata","plano de saúde","healthtech","farmácia","cirurgia","dental","odontolog"],
  fintech: ["fintech","banco","crédito","open finance","banking","pagamento","pix","cartão","seguros","investimento","b3","bolsa"],
  educacao: ["educação","escola","universidade","ensino","edtech","cursos","capacitação"],
  varejo: ["varejo","loja","e-commerce","marketplace","moda","alimentação","restaurante","franquia"],
  imobiliario: ["imóvel","imobiliário","construção","incorporadora","aluguel","retrofit","loteamento"],
  agro: ["agro","agricultura","pecuária","soja","milho","café","commodities","rurais"],
  tecnologia: ["tecnologia","software","saas","startup","ti","desenvolvimento","app","inteligência artificial","ia"],
  geral: [],
};

export function parseQuery(query: string): { uf?: string; topics: Topic[] } {
  const lower = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const queryNorm = query.toLowerCase();

  // Detecta UF por sigla (ex: "DF", "SP")
  let uf: string | undefined;
  const siglaMatch = query.match(/\b([A-Z]{2})\b/);
  if (siglaMatch && UF_SIGLAS.includes(siglaMatch[1])) {
    uf = siglaMatch[1];
  }

  // Detecta UF por nome
  if (!uf) {
    for (const [nome, sigla] of Object.entries(UF_NAMES)) {
      const nomeNorm = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (queryNorm.includes(nome) || lower.includes(nomeNorm)) {
        uf = sigla;
        break;
      }
    }
  }

  // Detecta tópicos
  const topics = new Set<Topic>();
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS) as [Topic, string[]][]) {
    for (const kw of keywords) {
      const kwNorm = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (queryNorm.includes(kw) || lower.includes(kwNorm)) {
        topics.add(topic);
        break;
      }
    }
  }

  if (topics.size === 0) topics.add("geral");

  return { uf, topics: Array.from(topics) };
}
