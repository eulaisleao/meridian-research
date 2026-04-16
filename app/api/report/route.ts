/**
 * POST /api/report
 *
 * Fluxo:
 *  1. Planner Agent (Claude + tools) → decide e executa chamadas às APIs públicas
 *  2. Report Generator (Claude) → gera relatório enriquecido com dados reais
 *
 * Retorna Server-Sent Events para que o frontend mostre progresso em tempo real.
 */

import Anthropic from "@anthropic-ai/sdk";
import { runPlannerAgent } from "@/lib/planner";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import type { ProgressEvent, Report } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 min — geração pode ser lenta

const encoder = new TextEncoder();

function sseEvent(event: ProgressEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function POST(req: Request) {
  const { query } = (await req.json()) as { query: string };

  if (!query?.trim()) {
    return Response.json({ error: "query obrigatória" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY não configurada. Crie .env.local com a chave." },
      { status: 500 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ProgressEvent) => controller.enqueue(sseEvent(event));

      try {
        // ── Step 1: Planner Agent ──────────────────────────────────────────────
        send({ type: "progress", step: "planning", msg: "Analisando o tema e planejando pesquisa..." });

        const context = await runPlannerAgent(query, (msg) => {
          send({ type: "progress", step: "fetching", msg });
        });

        if (context.sources.length > 0) {
          send({
            type: "progress",
            step: "fetching",
            msg: `Dados reais coletados: ${context.sources.length} fonte(s) — ${context.sources.join(", ")}`,
          });
        } else {
          send({ type: "progress", step: "fetching", msg: "Nenhuma API pública aplicável ao tema — usando dados do modelo." });
        }

        // ── Step 2: Report Generator ───────────────────────────────────────────
        send({ type: "progress", step: "generating", msg: "Gerando relatório com análise estratégica..." });

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 8000,
          system: buildSystemPrompt(),
          messages: [{ role: "user", content: buildUserPrompt(query, context) }],
        });

        const textBlock = response.content.find(b => b.type === "text");
        if (!textBlock || textBlock.type !== "text") {
          throw new Error(`Resposta vazia. stop_reason: ${response.stop_reason}`);
        }

        const text = textBlock.text;
        const s = text.indexOf("{");
        const e = text.lastIndexOf("}");

        if (s === -1 || e <= s) {
          throw new Error(`JSON não encontrado na resposta. Recebido: "${text.slice(0, 300)}"`);
        }

        let report: Report;
        try {
          report = JSON.parse(text.slice(s, e + 1)) as Report;
        } catch (err) {
          throw new Error(`JSON inválido: ${err instanceof Error ? err.message : String(err)}`);
        }

        // Garante que real_data_sources reflita as fontes reais
        if (context.sources.length > 0) {
          report.real_data_sources = context.sources;
        }

        send({ type: "report", data: report });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
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
