/**
 * POST /api/report
 *
 * Sem IA. Apenas APIs públicas gratuitas:
 *   - IBGE: população, pirâmide etária, PIB/capita, renda
 *   - BCB:  SELIC, IPCA, câmbio, inflação saúde, crédito/PIB
 *
 * Retorna Server-Sent Events com progresso e dados finais.
 */

import {
  fetchPopulation,
  fetchAgePyramid,
  fetchPIBPerCapita,
  fetchHouseholdIncome,
} from "@/lib/apis/ibge";
import {
  fetchEconomicIndicators,
  fetchIPCAHistory,
  fetchHealthInflation,
  fetchCreditToPIB,
} from "@/lib/apis/bcb";
import { parseQuery } from "@/lib/query-parser";
import type { DashboardData, ProgressEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const encoder = new TextEncoder();

function sse(event: ProgressEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function POST(req: Request) {
  const { query } = (await req.json()) as { query: string };

  if (!query?.trim()) {
    return Response.json({ error: "query obrigatória" }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ProgressEvent) => controller.enqueue(sse(event));

      try {
        const { uf, topics } = parseQuery(query);

        send({ type: "progress", msg: `Identificado: ${uf ? `estado ${uf}` : "Brasil"} · tópicos: ${topics.join(", ")}` });

        // ── Decide quais APIs chamar com base no tópico ──────────────────────
        const isSaude    = topics.includes("saude");
        const isFintech  = topics.includes("fintech");

        // Sempre buscamos: população, indicadores econômicos, IPCA
        const fetches: Array<[string, () => Promise<unknown>]> = [
          ["IBGE · população", () => fetchPopulation(uf)],
          ["IBGE · pirâmide etária", () => fetchAgePyramid(uf)],
          ["IBGE · PIB per capita", () => fetchPIBPerCapita(uf)],
          ["IBGE · renda domiciliar", () => fetchHouseholdIncome(uf)],
          ["BCB · indicadores macro", () => fetchEconomicIndicators(["selic", "selic_meta", "ipca", "cambio_usd", "pib_crescimento"])],
          ["BCB · histórico IPCA", () => fetchIPCAHistory()],
        ];

        if (isSaude) {
          fetches.push(["BCB · inflação saúde", () => fetchHealthInflation()]);
        }

        if (isFintech) {
          fetches.push(["BCB · crédito/PIB", () => fetchCreditToPIB()]);
        }

        // ── Executa em paralelo com progresso ─────────────────────────────────
        send({ type: "progress", msg: `Consultando ${fetches.length} fontes em paralelo...` });

        const results = await Promise.allSettled(
          fetches.map(async ([label, fn]) => {
            const data = await fn();
            send({ type: "progress", msg: `✓ ${label}` });
            return { label, data };
          })
        );

        // ── Monta o dashboard ─────────────────────────────────────────────────
        const sources: string[] = [];
        const errors: string[] = [];
        const resolved: Record<string, unknown> = {};

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const label = fetches[i][0];
          if (r.status === "fulfilled") {
            resolved[label] = r.value.data;
            sources.push(label);
          } else {
            errors.push(`${label}: ${r.reason}`);
          }
        }

        const dashboard: DashboardData = {
          query,
          uf,
          generatedAt: new Date().toISOString(),
          population:      resolved["IBGE · população"] as DashboardData["population"],
          agePyramid:      resolved["IBGE · pirâmide etária"] as DashboardData["agePyramid"],
          pib:             resolved["IBGE · PIB per capita"] as DashboardData["pib"],
          income:          resolved["IBGE · renda domiciliar"] as DashboardData["income"],
          economic:        resolved["BCB · indicadores macro"] as DashboardData["economic"],
          ipca:            resolved["BCB · histórico IPCA"] as DashboardData["ipca"],
          healthInflation: resolved["BCB · inflação saúde"] as DashboardData["healthInflation"],
          creditToPIB:     resolved["BCB · crédito/PIB"] as DashboardData["creditToPIB"],
          sources,
          errors,
        };

        send({ type: "dashboard", data: dashboard });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
