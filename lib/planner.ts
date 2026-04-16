/**
 * Research Planner Agent
 *
 * Usa Claude com tool_use para analisar a query e decidir autonomamente
 * quais APIs públicas devem ser consultadas. Executa as chamadas reais
 * e retorna contexto enriquecido para o gerador de relatório.
 *
 * Fluxo:
 *   query → Claude (tool_use) → chamadas paralelas às APIs → contexto real
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  fetchPopulation,
  fetchAgePyramid,
  fetchPIBPerCapita,
  fetchHouseholdIncome,
} from "./apis/ibge";
import {
  fetchEconomicIndicators,
  fetchIPCAHistory,
  fetchHealthInflation,
  fetchCreditToPIB,
} from "./apis/bcb";
import type { RealDataContext } from "./types";

// ─── Tool definitions ─────────────────────────────────────────────────────────
const TOOLS: Anthropic.Tool[] = [
  {
    name: "ibge_populacao",
    description:
      "Busca população real do IBGE para um estado (UF) ou para o Brasil. Use quando o tema envolver um estado/cidade específico ou análise demográfica.",
    input_schema: {
      type: "object" as const,
      properties: {
        uf: {
          type: "string",
          description:
            "Sigla do estado (ex: 'DF', 'SP', 'RJ') ou omita para o Brasil inteiro.",
        },
      },
      required: [],
    },
  },
  {
    name: "ibge_piramide_etaria",
    description:
      "Busca distribuição etária real (% por faixa de idade) do IBGE. Use para mercados sensíveis à idade: saúde, previdência, educação infantil, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        uf: {
          type: "string",
          description: "Sigla do estado ou omita para o Brasil.",
        },
      },
      required: [],
    },
  },
  {
    name: "ibge_pib_per_capita",
    description:
      "Busca PIB per capita real do IBGE por UF. Use para avaliar poder aquisitivo regional ou tamanho econômico.",
    input_schema: {
      type: "object" as const,
      properties: {
        uf: {
          type: "string",
          description: "Sigla do estado ou omita para o Brasil.",
        },
      },
      required: [],
    },
  },
  {
    name: "ibge_renda_domiciliar",
    description:
      "Busca renda domiciliar média mensal real (PNAD Contínua) do IBGE. Use para análises de ticket médio, capacidade de pagamento ou segmentação de público.",
    input_schema: {
      type: "object" as const,
      properties: {
        uf: {
          type: "string",
          description: "Sigla do estado ou omita para o Brasil.",
        },
      },
      required: [],
    },
  },
  {
    name: "bcb_indicadores",
    description:
      "Busca indicadores econômicos reais do Banco Central (SELIC, IPCA, câmbio, PIB). Use sempre para fornecer contexto macroeconômico no relatório.",
    input_schema: {
      type: "object" as const,
      properties: {
        indicadores: {
          type: "array",
          items: {
            type: "string",
            enum: ["selic", "selic_meta", "ipca", "igpm", "cambio_usd", "cambio_eur", "pib_crescimento", "credito_pib", "inflacao_saude"],
          },
          description:
            "Lista de indicadores. Para saúde inclua 'inflacao_saude'. Para fintech inclua 'credito_pib'. Sempre inclua 'selic' e 'ipca'.",
        },
      },
      required: ["indicadores"],
    },
  },
  {
    name: "bcb_ipca_historico",
    description:
      "Busca o histórico mensal do IPCA nos últimos 12 meses e o acumulado 12m. Use para análises de precificação, reajuste de contratos ou pressão inflacionária.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "bcb_inflacao_saude",
    description:
      "Busca inflação específica de serviços de saúde (IPCA-Saúde) dos últimos 12 meses. Use obrigatoriamente para qualquer tema de saúde, clínicas, hospitais, planos.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "bcb_credito_pib",
    description:
      "Busca relação crédito/PIB do Brasil. Use para análises de fintech, banking, crédito, open finance, mercado de capitais.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────
async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "ibge_populacao":
      return fetchPopulation(input.uf as string | undefined);
    case "ibge_piramide_etaria":
      return fetchAgePyramid(input.uf as string | undefined);
    case "ibge_pib_per_capita":
      return fetchPIBPerCapita(input.uf as string | undefined);
    case "ibge_renda_domiciliar":
      return fetchHouseholdIncome(input.uf as string | undefined);
    case "bcb_indicadores":
      return fetchEconomicIndicators(
        (input.indicadores as string[]) as Parameters<typeof fetchEconomicIndicators>[0]
      );
    case "bcb_ipca_historico":
      return fetchIPCAHistory();
    case "bcb_inflacao_saude":
      return fetchHealthInflation();
    case "bcb_credito_pib":
      return fetchCreditToPIB();
    default:
      return { error: `Ferramenta desconhecida: ${name}` };
  }
}

// ─── Planner system prompt ────────────────────────────────────────────────────
const PLANNER_SYSTEM = `Você é um agente de pesquisa quantitativa especializado em mercado brasileiro.

Sua missão: dado um tema de research, decidir quais APIs públicas devem ser consultadas para enriquecer o relatório com dados reais e verificáveis.

Regras:
1. Sempre chame bcb_indicadores com pelo menos ["selic", "ipca"] — contexto macro é obrigatório.
2. Se o tema envolver saúde/clínica/hospital: chame bcb_inflacao_saude.
3. Se o tema mencionar um estado específico: chame ibge_populacao e ibge_pib_per_capita com o UF correto.
4. Se o tema envolver envelhecimento, pediatria, previdência: chame ibge_piramide_etaria.
5. Se o tema envolver fintech, crédito, banking: chame bcb_credito_pib.
6. Se o tema envolver poder aquisitivo, ticket médio, pricing: chame ibge_renda_domiciliar.
7. Chame as ferramentas em paralelo quando possível.
8. Após receber os dados, responda com um JSON de resumo.

Após executar todas as chamadas necessárias, responda APENAS com este JSON:
{
  "context_summary": "resumo em 3-4 frases do que os dados reais revelam sobre o tema",
  "key_facts": ["fato 1 com dado e fonte", "fato 2", ...],
  "data_gaps": ["o que não foi possível obter via API e precisa vir do conhecimento do modelo"]
}`;

// ─── Main: runPlannerAgent ────────────────────────────────────────────────────
export async function runPlannerAgent(
  query: string,
  onProgress?: (msg: string) => void
): Promise<RealDataContext> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Tema da pesquisa: "${query}"\nData: ${new Date().toLocaleDateString("pt-BR")}\n\nDecida quais APIs públicas consultar e execute as chamadas.`,
    },
  ];

  const sources: string[] = [];
  const facts: Record<string, unknown> = {};

  // ─── Agentic loop ──────────────────────────────────────────────────────────
  for (let iteration = 0; iteration < 5; iteration++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: PLANNER_SYSTEM,
      tools: TOOLS,
      messages,
    });

    // Add assistant response to history
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      // Extract the final JSON summary from the last text block
      const textBlock = response.content.find(b => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        try {
          const s = textBlock.text.indexOf("{");
          const e = textBlock.text.lastIndexOf("}");
          if (s !== -1 && e > s) {
            const summary = JSON.parse(textBlock.text.slice(s, e + 1));
            facts["_summary"] = summary;
          }
        } catch { /* ignore parse errors */ }
      }
      break;
    }

    if (response.stop_reason !== "tool_use") break;

    // Execute all tool calls in parallel
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    onProgress?.(`Consultando ${toolUseBlocks.map(b => b.name.replace("_", " ")).join(", ")}...`);

    const toolResults = await Promise.allSettled(
      toolUseBlocks.map(async (block) => {
        const result = await executeTool(block.name, block.input as Record<string, unknown>);
        sources.push(block.name);
        facts[block.name] = result;
        return {
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: JSON.stringify(result),
        };
      })
    );

    // Add tool results to message history
    const resolvedResults: Anthropic.ToolResultBlockParam[] = [];
    for (const r of toolResults) {
      if (r.status === "fulfilled") resolvedResults.push(r.value);
    }
    messages.push({ role: "user", content: resolvedResults });
  }

  return { sources, facts };
}
