/**
 * POST /api/report
 *
 * Orquestra todas as APIs públicas brasileiras em paralelo:
 *   IBGE · BCB · IPEA · Comex Stat · ANS · ANATEL
 *
 * Sem autenticação. Sem IA. Sem custo.
 */

import { fetchPopulation, fetchAgePyramid, fetchPIBPerCapita, fetchHouseholdIncome } from "@/lib/apis/ibge";
import {
  fetchEconomicIndicators, fetchIPCAHistory, fetchHealthInflation,
  fetchCreditToPIB, fetchPublicDebt, fetchInternationalReserves,
  fetchCAGED, fetchIBCBr,
} from "@/lib/apis/bcb";
import { fetchIPEASocial } from "@/lib/apis/ipea";
import { fetchTradeBalance, fetchTradeByUF, fetchTradeMonthly } from "@/lib/apis/comexstat";
import { fetchBeneficiariosByUF } from "@/lib/apis/ans";
import { fetchBandaLarga, fetchTelefoniaMovel } from "@/lib/apis/anatel";
import { parseQuery } from "@/lib/query-parser";
import type { DashboardData, ProgressEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 45;

const enc = new TextEncoder();
const sse = (e: ProgressEvent) => enc.encode(`data: ${JSON.stringify(e)}\n\n`);

export async function POST(req: Request) {
  const { query } = (await req.json()) as { query: string };
  if (!query?.trim()) return Response.json({ error: "query obrigatória" }, { status: 400 });

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (e: ProgressEvent) => ctrl.enqueue(sse(e));

      try {
        const { uf, topics } = parseQuery(query);
        const isSaude   = topics.includes("saude");
        const isFintech = topics.includes("fintech");
        const isAgro    = topics.includes("agro");
        const isComex   = topics.includes("comex") || isAgro;

        send({ type: "progress", msg: `Detectado: ${uf ? `estado ${uf}` : "Brasil"} · temas: ${topics.join(", ")}` });
        send({ type: "progress", msg: "Disparando chamadas em paralelo para todas as APIs públicas..." });

        // ── Todas as chamadas em paralelo ──────────────────────────────────────
        type FetchEntry = [string, () => Promise<unknown>];

        const fetches: FetchEntry[] = [
          // IBGE
          ["IBGE · população",          () => fetchPopulation(uf)],
          ["IBGE · pirâmide etária",     () => fetchAgePyramid(uf)],
          ["IBGE · PIB per capita",      () => fetchPIBPerCapita(uf)],
          ["IBGE · renda domiciliar",    () => fetchHouseholdIncome(uf)],
          // BCB — sempre
          ["BCB · indicadores macro",    () => fetchEconomicIndicators(["selic", "selic_meta", "ipca", "cambio_usd", "pib_crescimento"])],
          ["BCB · histórico IPCA",       () => fetchIPCAHistory()],
          ["BCB · dívida pública",       () => fetchPublicDebt()],
          ["BCB · reservas internacionais", () => fetchInternationalReserves()],
          ["BCB · CAGED",                () => fetchCAGED(6)],
          ["BCB · IBC-Br",               () => fetchIBCBr(13)],
          // IPEA — sempre
          ["IPEA · desocupação e Gini",  () => fetchIPEASocial(["desocupacao", "gini", "salario_minimo", "pobreza"])],
          // Comex Stat — sempre (comércio exterior é indicador geral)
          ["Comex Stat · balança Brasil",() => fetchTradeBalance()],
          ["Comex Stat · mensal",        () => fetchTradeMonthly()],
          // ANATEL — sempre
          ["ANATEL · telefonia móvel",   () => fetchTelefoniaMovel()],
          ["ANATEL · banda larga",       () => fetchBandaLarga()],
        ];

        // Condicionais por tema
        if (isSaude) {
          fetches.push(["BCB · inflação saúde", () => fetchHealthInflation()]);
          fetches.push(["ANS · beneficiários",  () => fetchBeneficiariosByUF(uf)]);
        }
        if (isFintech) {
          fetches.push(["BCB · crédito/PIB", () => fetchCreditToPIB()]);
        }
        if (uf) {
          fetches.push([`Comex Stat · ${uf}`, () => fetchTradeByUF(uf)]);
        }

        send({ type: "progress", msg: `${fetches.length} chamadas disparadas...` });

        const results = await Promise.allSettled(
          fetches.map(async ([label, fn]) => {
            const data = await fn();
            send({ type: "progress", msg: `✓ ${label}` });
            return { label, data };
          })
        );

        const resolved: Record<string, unknown> = {};
        const sources: string[] = [];
        const errors: string[] = [];

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const label = fetches[i][0];
          if (r.status === "fulfilled") {
            resolved[label] = r.value.data;
            sources.push(label);
          } else {
            errors.push(`${label}: ${String(r.reason)}`);
          }
        }

        // Agrupa ANATEL
        const bandaLarga   = resolved["ANATEL · banda larga"] as { total_acessos?: number; data_referencia?: string; fonte: string } | undefined;
        const movil        = resolved["ANATEL · telefonia móvel"] as { total_acessos?: number; data_referencia?: string; fonte: string } | undefined;

        const dashboard: DashboardData = {
          query, uf,
          generatedAt: new Date().toISOString(),
          // IBGE
          population:      resolved["IBGE · população"]         as DashboardData["population"],
          agePyramid:      resolved["IBGE · pirâmide etária"]   as DashboardData["agePyramid"],
          pib:             resolved["IBGE · PIB per capita"]     as DashboardData["pib"],
          income:          resolved["IBGE · renda domiciliar"]   as DashboardData["income"],
          // BCB
          economic:        resolved["BCB · indicadores macro"]   as DashboardData["economic"],
          ipca:            resolved["BCB · histórico IPCA"]      as DashboardData["ipca"],
          healthInflation: resolved["BCB · inflação saúde"]      as DashboardData["healthInflation"],
          creditToPIB:     resolved["BCB · crédito/PIB"]         as DashboardData["creditToPIB"],
          publicDebt:      resolved["BCB · dívida pública"]      as DashboardData["publicDebt"],
          reserves:        resolved["BCB · reservas internacionais"] as DashboardData["reserves"],
          caged:           resolved["BCB · CAGED"]               as DashboardData["caged"],
          ibcbr:           resolved["BCB · IBC-Br"]              as DashboardData["ibcbr"],
          // IPEA
          ipea:            resolved["IPEA · desocupação e Gini"] as DashboardData["ipea"],
          // Comex Stat
          tradeBalance:    resolved["Comex Stat · balança Brasil"] as DashboardData["tradeBalance"],
          tradeByUF:       uf ? resolved[`Comex Stat · ${uf}`]   as DashboardData["tradeByUF"] : undefined,
          tradeMonthly:    resolved["Comex Stat · mensal"]        as DashboardData["tradeMonthly"],
          // ANS
          ans:             resolved["ANS · beneficiários"]        as DashboardData["ans"],
          // ANATEL
          anatel:          (bandaLarga || movil) ? { banda_larga: bandaLarga, telefonia_movel: movil } : undefined,
          sources,
          errors,
        };

        send({ type: "dashboard", data: dashboard });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}
