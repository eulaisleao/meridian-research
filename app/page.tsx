"use client";

import { useState, useCallback } from "react";
import type { Report, ProgressEvent } from "@/lib/types";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#FAFAFA", w: "#FFFFFF", b1: "rgba(0,0,0,.08)",
  sig: "#00875A", sigL: "#E6F5F0",
  att: "#92570A", attL: "#FDF3E3",
  rsk: "#C0392B", rskL: "#FDEEEC",
  ins: "#0071E3", insL: "#E8F2FC",
  prd: "#6E3AC7", prdL: "#F0EBF9",
  t0: "#1A1A1F", t1: "#3C3C43", t2: "#6C6C73", t3: "#AEAEB2",
  sh: "0 1px 4px rgba(0,0,0,.06)",
  ff: "'DM Sans',sans-serif",
  mono: "'DM Mono',monospace",
  serif: "'DM Serif Display',serif",
};

// ─── Micro components ─────────────────────────────────────────────────────────
const HR = () => <div style={{ height: 1, background: T.b1, margin: "32px 0" }} />;

const Lbl = ({ c = T.sig, n, children }: { c?: string; n?: string; children: React.ReactNode }) => (
  <div style={{ fontFamily: T.mono, fontSize: 9.5, color: c, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 10 }}>
    {n && <span style={{ marginRight: 8, opacity: 0.4 }}>{n}</span>}{children}
  </div>
);

const P = ({ children, sx = {} }: { children: React.ReactNode; sx?: React.CSSProperties }) => (
  <p style={{ fontSize: 14, color: T.t1, lineHeight: 1.8, margin: "0 0 12px", ...sx }}>{children}</p>
);

const Chip = ({ label, color, bg }: { label: string; color: string; bg: string }) => (
  <span style={{ padding: "2px 10px", borderRadius: 100, background: bg, color, fontFamily: T.mono, fontSize: 10, fontWeight: 500, whiteSpace: "nowrap" }}>{label}</span>
);

const KPI = ({ label, value, source, color = T.sig, verified }: {
  label: string; value: string; source: string; color?: string; verified: boolean;
}) => (
  <div style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 14, padding: "14px 16px", boxShadow: T.sh, flex: 1, minWidth: 120 }}>
    <div style={{ fontFamily: T.mono, fontSize: 9, color: T.t3, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
    <div style={{ fontFamily: T.mono, fontSize: 19, fontWeight: 600, color, marginBottom: 3 }}>{value}</div>
    <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
      {source && <span style={{ fontFamily: T.mono, fontSize: 9, color: T.t3 }}>{source}</span>}
      {!verified && <span style={{ fontFamily: T.mono, fontSize: 8, color: T.att, background: T.attL, padding: "1px 5px", borderRadius: 3 }}>est.</span>}
    </div>
  </div>
);

const ScenCard = ({ label, prob, text, size, color, bg }: {
  label: string; prob: string; text: string; size: string; color: string; bg: string;
}) => (
  <div style={{ background: bg, border: `1px solid ${color}28`, borderRadius: 14, padding: "16px 18px", flex: 1, minWidth: 160 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <span style={{ fontFamily: T.serif, fontSize: 14, color: T.t0 }}>{label}</span>
      <Chip label={prob} color={color} bg={`${color}20`} />
    </div>
    <P sx={{ fontSize: 12.5, marginBottom: 8 }}>{text}</P>
    {size && (
      <div style={{ padding: "7px 10px", background: "rgba(0,0,0,.05)", borderRadius: 8 }}>
        <div style={{ fontFamily: T.mono, fontSize: 9, color: T.t3, marginBottom: 2 }}>MERCADO 2030</div>
        <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 600, color }}>{size}</div>
      </div>
    )}
  </div>
);

// ─── Progress stepper ─────────────────────────────────────────────────────────
const STEPS = [
  { key: "planning",   label: "Planejando pesquisa" },
  { key: "fetching",   label: "Consultando APIs públicas" },
  { key: "generating", label: "Gerando relatório" },
];

function ProgressPanel({ steps }: { steps: Array<{ step: string; msg: string }> }) {
  const currentStep = steps.at(-1)?.step ?? "planning";
  return (
    <div style={{ padding: "64px 0 32px", maxWidth: 480, margin: "0 auto" }}>
      {/* Spinner */}
      <div style={{ width: 40, height: 40, border: `2px solid ${T.sig}`, borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 28px" }} />

      {/* Step indicators */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
        {STEPS.map((s, i) => {
          const currentIdx = STEPS.findIndex(x => x.key === currentStep);
          const done = i < currentIdx;
          const active = s.key === currentStep;
          return (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: done ? T.sig : active ? T.sigL : "#F5F5F7",
                border: `1.5px solid ${done || active ? T.sig : T.b1}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {done
                  ? <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>
                  : active
                  ? <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.sig }} />
                  : null}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? T.t0 : T.t2 }}>{s.label}</div>
                {active && steps.filter(x => x.step === s.key).map((x, j) => (
                  <div key={j} style={{ fontSize: 11, color: T.t3, fontFamily: T.mono, marginTop: 2, animation: "pulse 1.5s ease infinite" }}>{x.msg}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: T.t3, textAlign: "center", margin: 0 }}>30–60 segundos</p>
    </div>
  );
}

// ─── Examples ─────────────────────────────────────────────────────────────────
const EXAMPLES = [
  "Viabilidade de clínica de catarata para oftalmologista em Brasília",
  "Open finance e banking-as-a-service no Brasil 2025–2030",
  "Mercado de healthtech para população idosa no Brasil",
  "Proteínas alternativas e foodtech na América Latina",
  "ESG e mercado de crédito de carbono no Brasil",
];

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [query,    setQuery]    = useState("");
  const [status,   setStatus]   = useState<"idle" | "running" | "done" | "error">("idle");
  const [report,   setReport]   = useState<Report | null>(null);
  const [err,      setErr]      = useState("");
  const [progress, setProgress] = useState<Array<{ step: string; msg: string }>>([]);

  const run = useCallback(async () => {
    if (!query.trim() || status === "running") return;

    setStatus("running");
    setReport(null);
    setErr("");
    setProgress([]);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const chunk of lines) {
          const line = chunk.replace(/^data: /, "").trim();
          if (!line) continue;

          let event: ProgressEvent;
          try {
            event = JSON.parse(line) as ProgressEvent;
          } catch { continue; }

          if (event.type === "progress") {
            setProgress(prev => [...prev, { step: event.step, msg: event.msg }]);
          } else if (event.type === "report") {
            setReport(event.data);
            setStatus("done");
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, [query, status]);

  const vc = (v: string) => v === "VIÁVEL" ? T.sig : v === "INVIÁVEL" ? T.rsk : T.att;
  const vb = (v: string) => v === "VIÁVEL" ? T.sigL : v === "INVIÁVEL" ? T.rskL : T.attL;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: T.ff, color: T.t0 }}>

      {/* ── Nav ── */}
      <div className="no-print" style={{ background: "rgba(250,250,250,.95)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${T.b1}`, padding: "13px 28px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 840, margin: "0 auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke={T.sig} strokeWidth="1.5" opacity=".4" />
              <circle cx="10" cy="10" r="2.5" fill={T.sig} />
            </svg>
            <span style={{ fontFamily: T.serif, fontSize: 14, color: T.t0 }}>Meridian Research</span>
          </div>
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }}
            placeholder="Tema do relatório (ex: viabilidade clínica catarata Brasília)..."
            style={{ flex: 1, minWidth: 200, background: "#F5F5F7", border: `1px solid ${T.b1}`, borderRadius: 10, padding: "8px 13px", fontFamily: T.ff, fontSize: 13, color: T.t0, resize: "none", height: 38, lineHeight: 1.4 }}
          />
          <button
            onClick={run}
            disabled={status === "running" || !query.trim()}
            style={{ background: status === "running" ? T.sigL : T.sig, color: status === "running" ? T.sig : "#fff", border: `1px solid ${status === "running" ? T.sig : "transparent"}`, borderRadius: 10, padding: "8px 18px", fontFamily: T.ff, fontSize: 13, fontWeight: 600, cursor: status === "running" ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", gap: 7 }}
          >
            {status === "running" && <div style={{ width: 11, height: 11, border: `2px solid ${T.sig}`, borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />}
            {status === "running" ? "Gerando..." : "Gerar →"}
          </button>
          {report && (
            <button onClick={() => window.print()} style={{ background: "transparent", border: `1px solid ${T.b1}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: T.t2, cursor: "pointer", flexShrink: 0 }}>
              ⬇ PDF
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 840, margin: "0 auto", padding: "0 28px 80px" }}>

        {/* ── Empty state ── */}
        {status === "idle" && !report && (
          <div className="no-print" style={{ textAlign: "center", padding: "72px 0 32px" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: T.sigL, border: `1px solid rgba(0,135,90,.2)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke={T.sig} strokeWidth="1.5" opacity=".5" />
                <circle cx="10" cy="10" r="2.5" fill={T.sig} />
                <path d="M10 2v2.5M10 15.5V18M2 10h2.5M15.5 10H18" stroke={T.sig} strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
              </svg>
            </div>
            <h2 style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 400, color: T.t0, margin: "0 0 10px" }}>Meridian Research</h2>
            <p style={{ fontSize: 14, color: T.t2, lineHeight: 1.7, maxWidth: 460, margin: "0 auto 6px" }}>
              Relatórios estilo McKinsey com dados reais — IBGE, BCB, ANS, CFM, PubMed.
            </p>
            <p style={{ fontSize: 12, color: T.t3, margin: "0 auto 6px", maxWidth: 460 }}>
              Um agente analisa o tema e consulta as APIs públicas relevantes antes de gerar o relatório.
            </p>
            <p style={{ fontSize: 12, color: T.t3, margin: "0 auto 24px", maxWidth: 400 }}>
              Cenários 2025–2030 · modelo financeiro · due diligence · watch list
            </p>
            <div style={{ display: "flex", gap: 7, justifyContent: "center", flexWrap: "wrap" }}>
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => setQuery(ex)} style={{ padding: "5px 12px", borderRadius: 100, background: T.w, border: `1px solid ${T.b1}`, color: T.t2, fontSize: 12, cursor: "pointer", fontFamily: T.ff }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Progress ── */}
        {status === "running" && <ProgressPanel steps={progress} />}

        {/* ── Error ── */}
        {status === "error" && (
          <div style={{ margin: "32px 0", padding: "18px 20px", background: T.rskL, border: `1px solid rgba(192,57,43,.2)`, borderRadius: 14 }}>
            <div style={{ fontWeight: 600, color: T.rsk, fontSize: 14, marginBottom: 10 }}>Erro ao gerar relatório</div>
            <pre style={{ fontSize: 11.5, color: T.t1, fontFamily: T.mono, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6, margin: "0 0 14px", background: "rgba(0,0,0,.04)", padding: "10px 12px", borderRadius: 8 }}>{err}</pre>
            <button onClick={run} style={{ padding: "7px 16px", borderRadius: 8, background: T.rsk, color: "#fff", border: "none", fontSize: 12, cursor: "pointer", fontFamily: T.ff, fontWeight: 600 }}>
              Tentar novamente
            </button>
          </div>
        )}

        {/* ══════ REPORT ══════ */}
        {report && (
          <div style={{ animation: "fadeUp .4s ease" }}>

            {/* Cover */}
            <div style={{ background: T.t0, borderRadius: "0 0 20px 20px", padding: "48px 44px 40px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", border: "1px solid rgba(255,255,255,.06)" }} />
              <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.sig, letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>
                Meridian Research · {new Date().toLocaleDateString("pt-BR")}
                {report.real_data_sources && report.real_data_sources.length > 0 && (
                  <span style={{ marginLeft: 12, color: T.sigL, opacity: 0.7 }}>· {report.real_data_sources.length} fonte(s) real(is)</span>
                )}
              </div>
              <h1 style={{ fontFamily: T.serif, fontSize: 34, fontWeight: 400, lineHeight: 1.15, color: "#fff", margin: "0 0 10px", maxWidth: 540 }}>
                {report.title || query}
              </h1>
              {report.subtitle && (
                <p style={{ fontSize: 14, color: "rgba(255,255,255,.5)", margin: "0 0 24px", fontWeight: 300 }}>{report.subtitle}</p>
              )}
              {report.verdict && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 14px", borderRadius: 100, background: vb(report.verdict), border: `1px solid ${vc(report.verdict)}28` }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: vc(report.verdict) }} />
                  <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: vc(report.verdict) }}>{report.verdict}</span>
                  {report.verdict_rationale && (
                    <span style={{ fontSize: 12, color: T.t1, borderLeft: `1px solid ${T.b1}`, paddingLeft: 9 }}>{report.verdict_rationale}</span>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: "44px 0" }}>

              {/* Real data badge */}
              {report.real_data_sources && report.real_data_sources.length > 0 && (
                <div style={{ marginBottom: 24, padding: "10px 14px", background: T.sigL, borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.sig, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: T.sig, fontFamily: T.mono }}>
                    DADOS REAIS CONSULTADOS: {report.real_data_sources.join(" · ")}
                  </span>
                </div>
              )}

              {/* Key Metrics */}
              {report.key_metrics?.filter(m => m.value).length > 0 && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 40 }}>
                  {report.key_metrics.filter(m => m.value).slice(0, 5).map((m, i) => (
                    <KPI key={i} label={m.label} value={m.value} source={m.source} verified={m.verified} color={i === 0 ? T.sig : i === 1 ? T.att : T.ins} />
                  ))}
                </div>
              )}

              {/* Executive Summary */}
              {report.executive_summary && (
                <section style={{ marginBottom: 40 }}>
                  <Lbl n="01">Sumário Executivo</Lbl>
                  {report.executive_summary.split("\n\n").filter(Boolean).map((p, i) => <P key={i}>{p}</P>)}
                </section>
              )}

              {/* Market */}
              {report.market?.context && (<>
                <HR />
                <section style={{ marginBottom: 40 }}>
                  <Lbl n="02">Panorama de Mercado</Lbl>
                  {report.market.context.split("\n\n").filter(Boolean).map((p, i) => <P key={i}>{p}</P>)}
                  {(report.market.tam || report.market.cagr) && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "18px 0" }}>
                      {([["TAM", report.market.tam], ["SAM", report.market.sam], ["SOM", report.market.som], ["CAGR", report.market.cagr]] as [string, string][]).filter(([, v]) => v).map(([l, v], i) => (
                        <div key={i} style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 12, padding: "13px 15px", flex: 1, minWidth: 100, boxShadow: T.sh }}>
                          <div style={{ fontFamily: T.mono, fontSize: 9, color: T.t3, letterSpacing: 1.5, marginBottom: 5 }}>{l}</div>
                          <div style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 600, color: T.sig }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(report.market.drivers?.length || report.market.barriers?.length) && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                      {report.market.drivers?.length > 0 && (
                        <div>
                          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.sig, letterSpacing: 1.5, marginBottom: 10 }}>DRIVERS</div>
                          {report.market.drivers.map((d, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7 }}>
                              <span style={{ color: T.sig, fontWeight: 700, flexShrink: 0 }}>↑</span>
                              <span style={{ fontSize: 13, color: T.t1, lineHeight: 1.5 }}>{d}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {report.market.barriers?.length > 0 && (
                        <div>
                          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.rsk, letterSpacing: 1.5, marginBottom: 10 }}>BARREIRAS</div>
                          {report.market.barriers.map((b, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7 }}>
                              <span style={{ color: T.rsk, fontWeight: 700, flexShrink: 0 }}>→</span>
                              <span style={{ fontSize: 13, color: T.t1, lineHeight: 1.5 }}>{b}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </>)}

              {/* Demand + Supply */}
              {report.demand?.populacao_alvo && (<>
                <HR />
                <section style={{ marginBottom: 28 }}>
                  <Lbl n="03" c={T.ins}>Demanda</Lbl>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                    {([["Pop. alvo", report.demand.populacao_alvo, T.ins], ["Prevalência", report.demand.prevalencia, T.ins], ["Volume anual", report.demand.volume_anual, T.sig], ["Cobertura planos", report.demand.cobertura_planos, T.att]] as [string, string, string][]).filter(([, v]) => v).map(([l, v, c], i) => (
                      <div key={i} style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 12, padding: "12px 14px", flex: 1, minWidth: 120, boxShadow: T.sh }}>
                        <div style={{ fontFamily: T.mono, fontSize: 9, color: T.t3, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: c, lineHeight: 1.4 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {report.demand.demanda_reprimida && (
                    <div style={{ padding: "10px 14px", background: T.attL, borderRadius: 10, fontSize: 13, color: T.att }}>
                      <strong>Demanda reprimida: </strong>{report.demand.demanda_reprimida}
                    </div>
                  )}
                </section>

                <section style={{ marginBottom: 28 }}>
                  <Lbl n="04" c={T.rsk}>Oferta</Lbl>
                  {report.supply?.players_estimados && <P><strong>Players estimados:</strong> {report.supply.players_estimados}</P>}
                  {report.supply?.referencias?.length > 0 && (
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
                      {report.supply.referencias.map((r, i) => <Chip key={i} label={r} color={T.t1} bg="#F5F5F7" />)}
                    </div>
                  )}
                  {report.supply?.gap && (
                    <div style={{ padding: "10px 14px", background: T.sigL, borderRadius: 10, fontSize: 13, color: T.t0 }}>
                      <strong style={{ color: T.sig }}>Gap: </strong>{report.supply.gap}
                    </div>
                  )}
                </section>
              </>)}

              {/* Financials */}
              {report.financials?.capex_range && (<>
                <HR />
                <section style={{ marginBottom: 40 }}>
                  <Lbl n="05" c={T.att}>Modelo Financeiro</Lbl>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                    {([["CAPEX", report.financials.capex_range, T.rsk], ["Receita/unid.", report.financials.receita_unitaria, T.sig], ["Break-even", report.financials.break_even, T.att], ["Payback", report.financials.payback, T.ins]] as [string, string, string][]).filter(([, v]) => v).map(([l, v, c], i) => (
                      <div key={i} style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 12, padding: "12px 14px", flex: 1, minWidth: 110, boxShadow: T.sh }}>
                        <div style={{ fontFamily: T.mono, fontSize: 9, color: T.t3, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
                        <div style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 600, color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {report.financials.capex_items?.filter(b => b.item).length > 0 && (
                    <div style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 12, overflow: "hidden", boxShadow: T.sh, marginBottom: 12 }}>
                      <div style={{ background: "#F5F5F7", padding: "8px 15px", borderBottom: `1px solid ${T.b1}`, fontFamily: T.mono, fontSize: 9.5, color: T.t3, letterSpacing: 1 }}>
                        COMPOSIÇÃO DO CAPEX
                      </div>
                      {report.financials.capex_items.filter(b => b.item).map((b, i, arr) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 15px", borderBottom: i < arr.length - 1 ? `1px solid ${T.b1}` : "none", alignItems: "center" }}>
                          <span style={{ fontSize: 13, color: T.t1 }}>{b.item}</span>
                          <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.t0, flexShrink: 0, marginLeft: 12 }}>{b.valor}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {report.financials.premissas?.length > 0 && (
                    <div style={{ padding: "11px 14px", background: "#F5F5F7", borderRadius: 10 }}>
                      <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.t3, marginBottom: 7 }}>PREMISSAS-CHAVE</div>
                      {report.financials.premissas.map((a, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                          <span style={{ color: T.att, flexShrink: 0 }}>·</span>
                          <span style={{ fontSize: 12.5, color: T.t1 }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>)}

              {/* Signals */}
              {report.signals?.length > 0 && (<>
                <HR />
                <section style={{ marginBottom: 40 }}>
                  <Lbl n="06">Análise de Sinais</Lbl>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
                    {report.signals.map((s, i) => {
                      const MAP: Record<string, [string, string]> = { demográfico: [T.ins, T.insL], regulatório: [T.rsk, T.rskL], tecnológico: [T.prd, T.prdL], competitivo: [T.sig, T.sigL], econômico: [T.att, T.attL] };
                      const [c, bg] = MAP[s.tipo] ?? [T.t2, "#F5F5F7"];
                      return (
                        <div key={i} style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 13, padding: "14px 18px", display: "flex", gap: 12, boxShadow: T.sh }}>
                          <div style={{ flexShrink: 0, width: 4, borderRadius: 2, background: s.urgencia === "alta" ? T.rsk : s.urgencia === "média" ? T.att : T.t3 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                              <Chip label={s.tipo} color={c} bg={bg} />
                              <span style={{ fontFamily: T.mono, fontSize: 10, color: s.urgencia === "alta" ? T.rsk : s.urgencia === "média" ? T.att : T.t3 }}>urgência {s.urgencia}</span>
                              {s.fonte && <span style={{ fontFamily: T.mono, fontSize: 9, color: T.t3 }}>· {s.fonte}</span>}
                            </div>
                            <div style={{ fontWeight: 600, color: T.t0, fontSize: 14, marginBottom: 4 }}>{s.sinal}</div>
                            <div style={{ fontSize: 12.5, color: T.t2, fontStyle: "italic" }}>{s.evidencia}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>)}

              {/* Tech Trends */}
              {report.tech_trends?.length > 0 && (<>
                <HR />
                <section style={{ marginBottom: 40 }}>
                  <Lbl n="07" c={T.prd}>Tendências Tecnológicas</Lbl>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginTop: 12 }}>
                    {report.tech_trends.map((t, i) => (
                      <div key={i} style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 13, padding: "15px 17px", boxShadow: T.sh }}>
                        <div style={{ fontWeight: 600, color: T.t0, fontSize: 13.5, marginBottom: 6 }}>{t.nome}</div>
                        <P sx={{ fontSize: 12.5, marginBottom: 6 }}>{t.impacto}</P>
                        {t.horizonte && <div style={{ fontFamily: T.mono, fontSize: 10, color: T.t3 }}>{t.horizonte}</div>}
                      </div>
                    ))}
                  </div>
                </section>
              </>)}

              {/* Scenarios */}
              {report.scenarios && (<>
                <HR />
                <section style={{ marginBottom: 40 }} className="page-break">
                  <Lbl n="08">Cenários Preditivos 2025–2030</Lbl>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
                    <ScenCard label="Conservador" prob={report.scenarios.conservador?.prob} text={report.scenarios.conservador?.narrativa} size={report.scenarios.conservador?.mercado_2030} color={T.rsk} bg={T.rskL} />
                    <ScenCard label="Base" prob={report.scenarios.base?.prob} text={report.scenarios.base?.narrativa} size={report.scenarios.base?.mercado_2030} color={T.att} bg={T.attL} />
                    <ScenCard label="Acelerado" prob={report.scenarios.acelerado?.prob} text={report.scenarios.acelerado?.narrativa} size={report.scenarios.acelerado?.mercado_2030} color={T.sig} bg={T.sigL} />
                  </div>
                  <div style={{ marginTop: 14, background: T.w, border: `1px solid ${T.b1}`, borderRadius: 12, padding: "12px 16px", boxShadow: T.sh }}>
                    <div style={{ display: "flex", height: 7, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ width: "25%", background: T.rsk, opacity: 0.75 }} />
                      <div style={{ width: "55%", background: T.att, opacity: 0.75 }} />
                      <div style={{ width: "20%", background: T.sig, opacity: 0.75 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.mono, fontSize: 10 }}>
                      <span style={{ color: T.rsk }}>Conservador 25%</span>
                      <span style={{ color: T.att }}>Base 55%</span>
                      <span style={{ color: T.sig }}>Acelerado 20%</span>
                    </div>
                  </div>
                </section>
              </>)}

              {/* Opportunities */}
              {report.opportunities?.length > 0 && (<>
                <HR />
                <section style={{ marginBottom: 40 }}>
                  <Lbl n="09">Oportunidades</Lbl>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                    {[...report.opportunities].sort((a, b) => (b.score || 0) - (a.score || 0)).map((o, i) => (
                      <div key={i} style={{ background: T.w, border: `1px solid ${i === 0 ? "rgba(0,135,90,.25)" : T.b1}`, borderRadius: 14, padding: "16px 20px", display: "flex", gap: 14, boxShadow: T.sh }}>
                        <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, background: i === 0 ? T.sigL : "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.mono, fontWeight: 600, fontSize: 14, color: i === 0 ? T.sig : T.t2 }}>{o.score}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: T.t0, fontSize: 14, marginBottom: 4 }}>{o.titulo}</div>
                          <P sx={{ marginBottom: 5, fontSize: 13 }}>{o.descricao}</P>
                          {o.por_que_agora && <div style={{ fontSize: 12, color: T.att, fontFamily: T.mono, marginBottom: 7 }}>⏱ {o.por_que_agora}</div>}
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {o.esforco && <Chip label={`Esforço ${o.esforco}`} color={o.esforco === "baixo" ? T.sig : o.esforco === "médio" ? T.att : T.rsk} bg={o.esforco === "baixo" ? T.sigL : o.esforco === "médio" ? T.attL : T.rskL} />}
                            {o.potencial && <Chip label={`Potencial ${o.potencial}`} color={o.potencial === "alto" ? T.sig : o.potencial === "médio" ? T.att : T.rsk} bg={o.potencial === "alto" ? T.sigL : o.potencial === "médio" ? T.attL : T.rskL} />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>)}

              {/* Recommendations */}
              {report.recommendations?.length > 0 && (<>
                <HR />
                <section style={{ marginBottom: 40 }}>
                  <Lbl n="10">Recomendações</Lbl>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
                    {report.recommendations.map((r, i) => (
                      <div key={i} style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 14, padding: "15px 18px", display: "flex", gap: 12, boxShadow: T.sh }}>
                        <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 9, background: i === 0 ? T.sig : "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.mono, fontWeight: 700, color: i === 0 ? "#fff" : T.t2, fontSize: 13 }}>{String(i + 1).padStart(2, "0")}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, flexWrap: "wrap", gap: 5 }}>
                            <div style={{ fontWeight: 600, color: T.t0, fontSize: 14 }}>{r.acao}</div>
                            {r.prazo && <Chip label={r.prazo} color={T.att} bg={T.attL} />}
                          </div>
                          <P sx={{ marginBottom: 4, fontSize: 13 }}>{r.racional}</P>
                          {r.metrica && <div style={{ fontSize: 12, color: T.t2 }}><strong>Métrica: </strong>{r.metrica}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>)}

              {/* Due Diligence */}
              {report.due_diligence?.length > 0 && (<>
                <HR />
                <section style={{ marginBottom: 40 }}>
                  <Lbl n="11">Due Diligence</Lbl>
                  <div style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 13, overflow: "hidden", boxShadow: T.sh, marginTop: 12 }}>
                    {report.due_diligence.map((d, i, arr) => (
                      <div key={i} style={{ padding: "10px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${T.b1}` : "none", display: "grid", gridTemplateColumns: "2fr auto 1.5fr", gap: 12, alignItems: "center" }}>
                        <div style={{ fontSize: 13, color: T.t0 }}>{d.item}</div>
                        <Chip label={d.prioridade} color={d.prioridade === "alta" ? T.rsk : T.att} bg={d.prioridade === "alta" ? T.rskL : T.attL} />
                        <div style={{ fontSize: 12, color: T.ins }}>{d.fonte}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </>)}

              {/* Watch List */}
              {report.watch_list?.length > 0 && (<>
                <HR />
                <section style={{ marginBottom: 40 }}>
                  <Lbl n="12">Watch List</Lbl>
                  <div style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 13, overflow: "hidden", boxShadow: T.sh, marginTop: 12 }}>
                    {report.watch_list.map((w, i, arr) => (
                      <div key={i} style={{ padding: "10px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${T.b1}` : "none", display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr", gap: 12, alignItems: "start" }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: T.t0 }}>{w.item}</div>
                        <div style={{ fontSize: 12.5, color: T.t1 }}>{w.trigger}</div>
                        <div style={{ fontSize: 12, color: T.ins }}>{w.onde}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </>)}

              {/* Footer */}
              <div style={{ paddingTop: 20, borderTop: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: T.serif, fontSize: 13, color: T.t3 }}>Meridian Research</span>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: T.t3 }}>
                  Fontes: IBGE · BCB · ANS · CFM · PubMed · Comex Stat · validar antes de decisão de investimento
                </span>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
