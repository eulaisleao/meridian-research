"use client";

import { useState, useCallback } from "react";
import type { DashboardData, ProgressEvent } from "@/lib/types";

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
const HR = () => <div style={{ height: 1, background: T.b1, margin: "28px 0" }} />;

const Lbl = ({ c = T.sig, n, children }: { c?: string; n?: string; children: React.ReactNode }) => (
  <div style={{ fontFamily: T.mono, fontSize: 9.5, color: c, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 12 }}>
    {n && <span style={{ marginRight: 8, opacity: 0.4 }}>{n}</span>}{children}
  </div>
);

function Stat({ label, value, sub, color = T.sig }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 14, padding: "14px 16px", boxShadow: T.sh, flex: 1, minWidth: 130 }}>
      <div style={{ fontFamily: T.mono, fontSize: 9, color: T.t3, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 600, color, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontFamily: T.mono, fontSize: 9, color: T.t3, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Source({ label }: { label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 100, background: T.sigL, fontFamily: T.mono, fontSize: 10, color: T.sig }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.sig, flexShrink: 0 }} />
      {label}
    </span>
  );
}

function BarChart({ data }: { data: Array<{ label: string; value: number; color?: string }> }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, color: T.t2, width: 140, flexShrink: 0, textAlign: "right" }}>{d.label}</div>
          <div style={{ flex: 1, height: 16, background: "#F0F0F2", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: "100%", background: d.color ?? T.sig, borderRadius: 4, opacity: 0.85 }} />
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.t1, width: 44, flexShrink: 0 }}>{d.value.toFixed(1)}%</div>
        </div>
      ))}
    </div>
  );
}

function IPCASparkline({ data }: { data: Array<{ data: string; valor: number }> }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.valor));
  const min = Math.min(...data.map(d => d.valor));
  const range = max - min || 1;
  const W = 200, H = 40;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((d.valor - min) / range) * (H - 6) - 3;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={T.sig} strokeWidth="1.5" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - ((d.valor - min) / range) * (H - 6) - 3;
        return <circle key={i} cx={x} cy={y} r="2" fill={T.sig} />;
      })}
    </svg>
  );
}

const EXAMPLES = [
  "Clínica de catarata em Brasília",
  "Fintech e crédito digital no Brasil",
  "Healthtech para idosos em São Paulo",
  "Agronegócio no Mato Grosso",
  "Mercado imobiliário no Rio de Janeiro",
];

// ─── Progress log ─────────────────────────────────────────────────────────────
function ProgressLog({ lines }: { lines: string[] }) {
  return (
    <div style={{ padding: "48px 0 24px", maxWidth: 500, margin: "0 auto" }}>
      <div style={{ width: 36, height: 36, border: `2px solid ${T.sig}`, borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 24px" }} />
      <div style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 12, padding: "14px 18px", boxShadow: T.sh }}>
        <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.t3, letterSpacing: 2, marginBottom: 10 }}>CONSULTANDO APIs PÚBLICAS</div>
        {lines.map((l, i) => (
          <div key={i} style={{ fontFamily: T.mono, fontSize: 11, color: i === lines.length - 1 ? T.t0 : T.t3, marginBottom: 5, display: "flex", gap: 8 }}>
            <span style={{ color: T.sig }}>{i === lines.length - 1 ? "›" : "✓"}</span>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ data }: { data: DashboardData }) {
  const eco = data.economic?.indicadores ?? {};
  const fmt = (n: number, dec = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const fmtN = (n: number) => n.toLocaleString("pt-BR");

  // Pirâmide: agrupa em faixas mais legíveis
  const pyramid = (data.agePyramid?.faixas ?? [])
    .filter(f => f.percentual > 0)
    .sort((a, b) => b.percentual - a.percentual)
    .slice(0, 12);

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      {/* Cover */}
      <div style={{ background: T.t0, borderRadius: "0 0 20px 20px", padding: "44px 44px 36px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", border: "1px solid rgba(255,255,255,.05)" }} />
        <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.sig, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
          Meridian Research · {new Date(data.generatedAt).toLocaleDateString("pt-BR")}
        </div>
        <h1 style={{ fontFamily: T.serif, fontSize: 30, fontWeight: 400, color: "#fff", margin: "0 0 8px", lineHeight: 1.2 }}>{data.query}</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: "0 0 20px" }}>
          {data.uf ? `Estado: ${data.uf}` : "Abrangência: Brasil"} · {data.sources.length} fonte(s) consultada(s)
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {data.sources.map((s, i) => (
            <Source key={i} label={s.split(" · ")[1] ?? s} />
          ))}
        </div>
      </div>

      <div style={{ padding: "36px 0" }}>

        {/* ── Indicadores macro BCB ── */}
        {Object.keys(eco).length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <Lbl n="01">Indicadores Macroeconômicos — BCB</Lbl>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {eco.selic_meta && <Stat label="Meta SELIC" value={`${fmt(eco.selic_meta.valor)}% a.a.`} sub={`Atualizado ${eco.selic_meta.data}`} color={T.rsk} />}
              {eco.selic && <Stat label="SELIC efetiva" value={`${fmt(eco.selic.valor)}% a.a.`} sub={eco.selic.data} color={T.rsk} />}
              {eco.ipca && <Stat label="IPCA (mês)" value={`${fmt(eco.ipca.valor)}%`} sub={eco.ipca.data} color={T.att} />}
              {eco.cambio_usd && <Stat label="USD / BRL" value={`R$ ${fmt(eco.cambio_usd.valor)}`} sub={eco.cambio_usd.data} color={T.ins} />}
              {eco.pib_crescimento && <Stat label="Crescimento PIB" value={`${fmt(eco.pib_crescimento.valor)}% a.a.`} sub={eco.pib_crescimento.data} color={T.sig} />}
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.t3, marginTop: 8 }}>Fonte: {data.economic?.fonte}</div>
          </section>
        )}

        {/* ── IPCA histórico ── */}
        {(() => {
          const ipca = data.ipca;
          if (!ipca?.mensal?.length) return null;
          return (
            <>
              <HR />
              <section style={{ marginBottom: 36 }}>
                <Lbl n="02" c={T.att}>IPCA — Últimos 12 meses (BCB)</Lbl>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 14, padding: "18px 20px", boxShadow: T.sh }}>
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: T.t3, letterSpacing: 1.5, marginBottom: 8 }}>ACUMULADO 12M</div>
                    <div style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 600, color: T.att }}>{fmt(ipca.acumulado_12m)}%</div>
                    <div style={{ marginTop: 14 }}><IPCASparkline data={ipca.mensal} /></div>
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: T.t3, marginTop: 6 }}>Fonte: {ipca.fonte}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200, background: T.w, border: `1px solid ${T.b1}`, borderRadius: 14, padding: "14px 16px", boxShadow: T.sh }}>
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: T.t3, letterSpacing: 1.5, marginBottom: 10 }}>VARIAÇÃO MENSAL</div>
                    {ipca.mensal.slice(-6).reverse().map((m, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.b1}` }}>
                        <span style={{ fontSize: 12, color: T.t2, fontFamily: T.mono }}>{m.data}</span>
                        <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: m.valor > 0.5 ? T.rsk : m.valor > 0.3 ? T.att : T.sig }}>{fmt(m.valor)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          );
        })()}

        {/* ── Inflação saúde ── */}
        {(() => {
          const hi = data.healthInflation;
          const ipca = data.ipca;
          if (!hi?.mensal?.length) return null;
          return (
            <>
              <HR />
              <section style={{ marginBottom: 36 }}>
                <Lbl n="03" c={T.rsk}>Inflação de Serviços de Saúde — BCB</Lbl>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Stat label="Acumulado 12m (Saúde)" value={`${fmt(hi.acumulado_12m)}%`} sub="vs. IPCA geral" color={T.rsk} />
                  {ipca && <Stat label="Acumulado 12m (IPCA geral)" value={`${fmt(ipca.acumulado_12m)}%`} color={T.att} />}
                  {ipca && <Stat label="Prêmio saúde vs. IPCA" value={`+${fmt(hi.acumulado_12m - ipca.acumulado_12m)} p.p.`} sub="Saúde inflaciona mais" color={T.rsk} />}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.t3, marginTop: 8 }}>Fonte: {hi.fonte}</div>
              </section>
            </>
          );
        })()}

        {/* ── Crédito/PIB ── */}
        {data.creditToPIB?.pct && (
          <>
            <HR />
            <section style={{ marginBottom: 36 }}>
              <Lbl n="03" c={T.ins}>Crédito / PIB — BCB</Lbl>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Stat label="Crédito / PIB" value={`${fmt(data.creditToPIB.pct, 1)}%`} sub={data.creditToPIB.data} color={T.ins} />
                <div style={{ background: T.insL, border: `1px solid ${T.ins}28`, borderRadius: 14, padding: "14px 16px", flex: 2, minWidth: 200 }}>
                  <div style={{ fontFamily: T.mono, fontSize: 9, color: T.ins, letterSpacing: 1.5, marginBottom: 6 }}>CONTEXTO</div>
                  <p style={{ fontSize: 13, color: T.t1, margin: 0, lineHeight: 1.6 }}>
                    Brasil tem {fmt(data.creditToPIB.pct, 1)}% de crédito/PIB. Para comparação: EUA ~220%, Chile ~130%, México ~40%. Espaço relevante para expansão do crédito privado.
                  </p>
                </div>
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.t3, marginTop: 8 }}>Fonte: {data.creditToPIB.fonte}</div>
            </section>
          </>
        )}

        {/* ── Demográfico IBGE ── */}
        {(() => {
          const pop = data.population;
          const age = data.agePyramid;
          if (!pop?.populacao) return null;
          return (
            <>
              <HR />
              <section style={{ marginBottom: 36 }}>
                <Lbl n="04" c={T.ins}>Dados Demográficos — IBGE</Lbl>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                  <Stat label={`População ${data.uf ?? "Brasil"}`} value={fmtN(pop.populacao)} sub={`${pop.fonte} · ${pop.ano}`} color={T.ins} />
                  {age && age.pct_60_mais > 0 && <Stat label="Pop. 60+ anos" value={`${age.pct_60_mais}%`} sub={age.fonte} color={T.prd} />}
                  {age && age.pct_60_mais > 0 && <Stat label={`60+ em ${data.uf ?? "Brasil"}`} value={fmtN(Math.round(pop.populacao * age.pct_60_mais / 100))} sub="pessoas" color={T.prd} />}
                </div>
                {pyramid.length > 0 && (
                  <div style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 13, padding: "16px 18px", boxShadow: T.sh }}>
                    <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.t3, marginBottom: 12 }}>DISTRIBUIÇÃO ETÁRIA (%)</div>
                    <BarChart data={pyramid.map(f => ({ label: f.faixa, value: f.percentual }))} />
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: T.t3, marginTop: 10 }}>Fonte: {age?.fonte}</div>
                  </div>
                )}
              </section>
            </>
          );
        })()}

        {/* ── Renda e PIB ── */}
        {(() => {
          const income = data.income;
          const pib = data.pib;
          if (!income?.renda_media && !pib?.pib_per_capita) return null;
          return (
            <>
              <HR />
              <section style={{ marginBottom: 36 }}>
                <Lbl n="05" c={T.att}>Renda e Produto — IBGE</Lbl>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {income && income.renda_media > 0 && <Stat label={`Renda média mensal ${data.uf ?? "Brasil"}`} value={`R$ ${fmtN(income.renda_media)}`} sub={`${income.fonte} · ${income.ano}`} color={T.att} />}
                  {pib && pib.pib_per_capita > 0 && <Stat label={`PIB per capita ${data.uf ?? "Brasil"}`} value={`R$ ${fmtN(pib.pib_per_capita)}`} sub={`${pib.fonte} · ${pib.ano}`} color={T.sig} />}
                </div>
              </section>
            </>
          );
        })()}

        {/* ── CAGED ── */}
        {(() => {
          const c = data.caged;
          if (!c?.historico?.length) return null;
          return (
            <>
              <HR />
              <section style={{ marginBottom: 36 }}>
                <Lbl n="06" c={T.sig}>Emprego Formal — CAGED / BCB</Lbl>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  <Stat label="Saldo último mês" value={`${c.saldo_ultimo >= 0 ? "+" : ""}${fmtN(c.saldo_ultimo)}`} sub={c.historico[0]?.data} color={c.saldo_ultimo >= 0 ? T.sig : T.rsk} />
                  <Stat label="Acumulado ano" value={`${c.acumulado_ano >= 0 ? "+" : ""}${fmtN(c.acumulado_ano)}`} sub="empregos criados" color={c.acumulado_ano >= 0 ? T.sig : T.rsk} />
                  <Stat label="Admissões (último mês)" value={fmtN(c.historico[0]?.admissoes ?? 0)} color={T.ins} />
                  <Stat label="Desligamentos" value={fmtN(c.historico[0]?.desligamentos ?? 0)} color={T.att} />
                </div>
                <div style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 13, overflow: "hidden", boxShadow: T.sh }}>
                  <div style={{ background: "#F5F5F7", padding: "8px 15px", borderBottom: `1px solid ${T.b1}`, fontFamily: T.mono, fontSize: 9.5, color: T.t3 }}>ÚLTIMOS MESES</div>
                  {c.historico.map((h, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, padding: "8px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center" }}>
                      <span style={{ fontFamily: T.mono, fontSize: 11, color: T.t2 }}>{h.data}</span>
                      <span style={{ fontFamily: T.mono, fontSize: 12, color: T.ins }}>{fmtN(h.admissoes)}</span>
                      <span style={{ fontFamily: T.mono, fontSize: 12, color: T.att }}>{fmtN(h.desligamentos)}</span>
                      <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: h.saldo >= 0 ? T.sig : T.rsk }}>{h.saldo >= 0 ? "+" : ""}{fmtN(h.saldo)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.t3, marginTop: 6 }}>Fonte: {c.fonte}</div>
              </section>
            </>
          );
        })()}

        {/* ── Dívida pública + Reservas ── */}
        {(() => {
          const debt = data.publicDebt;
          const res  = data.reserves;
          if (!debt?.bruta_pib && !res?.valor_usd_mi) return null;
          return (
            <>
              <HR />
              <section style={{ marginBottom: 36 }}>
                <Lbl n="07" c={T.rsk}>Fiscal e Reservas — BCB</Lbl>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {debt && debt.bruta_pib > 0 && <Stat label="Dívida bruta / PIB" value={`${fmt(debt.bruta_pib)}%`} sub={debt.data} color={T.rsk} />}
                  {debt && debt.liquida_pib > 0 && <Stat label="Dívida líquida / PIB" value={`${fmt(debt.liquida_pib)}%`} sub={debt.data} color={T.att} />}
                  {res && res.valor_usd_mi > 0 && <Stat label="Reservas internacionais" value={`US$ ${fmt(res.valor_usd_mi / 1000, 0)} bi`} sub={res.data} color={T.sig} />}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.t3, marginTop: 8 }}>Fonte: {debt?.fonte} · {res?.fonte}</div>
              </section>
            </>
          );
        })()}

        {/* ── IPEA: Desemprego, Gini, Salário Mínimo ── */}
        {(() => {
          const ipea = data.ipea;
          if (!ipea || !Object.keys(ipea.indicadores).length) return null;
          const ind = ipea.indicadores;
          return (
            <>
              <HR />
              <section style={{ marginBottom: 36 }}>
                <Lbl n="08" c={T.prd}>Indicadores Sociais — IPEA Data</Lbl>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {ind.desocupacao && <Stat label="Taxa de desocupação" value={`${fmt(ind.desocupacao.valor)}%`} sub={`PNAD · ${ind.desocupacao.data}`} color={T.rsk} />}
                  {ind.gini        && <Stat label="Coeficiente de Gini" value={fmt(ind.gini.valor, 3)} sub={`${ind.gini.data} · 0=igualdade, 1=máx desig.`} color={T.att} />}
                  {ind.salario_minimo && <Stat label="Salário mínimo real" value={`R$ ${fmtN(ind.salario_minimo.valor)}`} sub={ind.salario_minimo.data} color={T.sig} />}
                  {ind.pobreza     && <Stat label="% em pobreza (<½ SM)" value={`${fmt(ind.pobreza.valor)}%`} sub={ind.pobreza.data} color={T.rsk} />}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.t3, marginTop: 8 }}>Fonte: {ipea.fonte}</div>
              </section>
            </>
          );
        })()}

        {/* ── Comex Stat ── */}
        {(() => {
          const tb = data.tradeBalance;
          const ufTrade = data.tradeByUF;
          if (!tb?.exportacoes_usd && !tb?.importacoes_usd) return null;
          const fmtUSD = (n: number) => n > 1e9 ? `US$ ${fmt(n / 1e9, 1)} bi` : `US$ ${fmt(n / 1e6, 0)} mi`;
          return (
            <>
              <HR />
              <section style={{ marginBottom: 36 }}>
                <Lbl n="09" c={T.ins}>Comércio Exterior — Comex Stat / MDIC</Lbl>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  {tb.exportacoes_usd > 0 && <Stat label={`Exportações Brasil (${tb.ano})`} value={fmtUSD(tb.exportacoes_usd)} color={T.sig} />}
                  {tb.importacoes_usd > 0 && <Stat label="Importações" value={fmtUSD(tb.importacoes_usd)} color={T.att} />}
                  {tb.saldo_usd !== 0 && <Stat label="Saldo" value={fmtUSD(tb.saldo_usd)} color={tb.saldo_usd >= 0 ? T.sig : T.rsk} />}
                </div>
                {ufTrade && ufTrade.exportacoes_usd > 0 && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Stat label={`Exportações ${data.uf ?? ""}`} value={fmtUSD(ufTrade.exportacoes_usd)} color={T.sig} />
                    <Stat label={`Importações ${data.uf ?? ""}`} value={fmtUSD(ufTrade.importacoes_usd)} color={T.att} />
                    <Stat label="Saldo UF" value={fmtUSD(ufTrade.saldo_usd)} color={ufTrade.saldo_usd >= 0 ? T.sig : T.rsk} />
                  </div>
                )}
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.t3, marginTop: 8 }}>Fonte: {tb.fonte}</div>
              </section>
            </>
          );
        })()}

        {/* ── ANS ── */}
        {(() => {
          const ans = data.ans;
          if (!ans?.total_brasil && !ans?.uf_selecionada) return null;
          return (
            <>
              <HR />
              <section style={{ marginBottom: 36 }}>
                <Lbl n="10" c={T.sig}>Planos de Saúde — ANS</Lbl>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {ans.total_brasil && <Stat label="Beneficiários no Brasil" value={fmtN(ans.total_brasil)} sub={ans.data_referencia} color={T.sig} />}
                  {ans.uf_selecionada && <Stat label={`Beneficiários ${ans.uf_selecionada.uf}`} value={fmtN(ans.uf_selecionada.beneficiarios)} color={T.ins} />}
                  {ans.total_brasil && data.population?.populacao && (
                    <Stat label="Cobertura estimada" value={`${fmt((ans.total_brasil / data.population.populacao) * 100, 1)}%`} sub="beneficiários/população" color={T.att} />
                  )}
                </div>
                {ans.por_uf && ans.por_uf.length > 3 && (
                  <div style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 13, padding: "14px 16px", boxShadow: T.sh, marginTop: 12 }}>
                    <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.t3, marginBottom: 10 }}>TOP 10 ESTADOS POR BENEFICIÁRIOS</div>
                    <BarChart data={ans.por_uf.slice(0, 10).map(r => ({ label: r.uf, value: r.beneficiarios / 1000 }))} />
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: T.t3, marginTop: 6 }}>em milhares</div>
                  </div>
                )}
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.t3, marginTop: 8 }}>Fonte: {ans.fonte}</div>
              </section>
            </>
          );
        })()}

        {/* ── ANATEL ── */}
        {(() => {
          const at = data.anatel;
          if (!at?.telefonia_movel?.total_acessos && !at?.banda_larga?.total_acessos) return null;
          return (
            <>
              <HR />
              <section style={{ marginBottom: 36 }}>
                <Lbl n="11" c={T.ins}>Telecomunicações — ANATEL</Lbl>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {at.telefonia_movel?.total_acessos && (
                    <Stat label="Linhas móveis ativas" value={fmtN(Math.round(at.telefonia_movel.total_acessos / 1e6)) + " mi"} sub={at.telefonia_movel.data_referencia} color={T.ins} />
                  )}
                  {at.banda_larga?.total_acessos && (
                    <Stat label="Acessos banda larga" value={fmtN(at.banda_larga.total_acessos)} sub={at.banda_larga.data_referencia} color={T.prd} />
                  )}
                  {at.telefonia_movel?.total_acessos && data.population?.populacao && (
                    <Stat
                      label="Chips / habitante"
                      value={fmt(at.telefonia_movel.total_acessos / data.population.populacao, 2)}
                      sub="densidade móvel"
                      color={T.att}
                    />
                  )}
                </div>
              </section>
            </>
          );
        })()}

        {/* ── Fontes disponíveis (registry) ── */}
        <HR />
        <section style={{ marginBottom: 36 }}>
          <Lbl n="★">Mapa de APIs Públicas Brasileiras</Lbl>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 10, marginTop: 10 }}>
            {([
              { sigla:"IBGE",        status:"ativo",           cor: T.sig, bgCor: T.sigL },
              { sigla:"BCB/SGS",     status:"ativo",           cor: T.sig, bgCor: T.sigL },
              { sigla:"IPEA Data",   status:"ativo",           cor: T.sig, bgCor: T.sigL },
              { sigla:"Comex Stat",  status:"ativo",           cor: T.sig, bgCor: T.sigL },
              { sigla:"ANATEL",      status:"parcial",         cor: T.att, bgCor: T.attL },
              { sigla:"ANS",         status:"parcial",         cor: T.att, bgCor: T.attL },
              { sigla:"TSE",         status:"parcial",         cor: T.att, bgCor: T.attL },
              { sigla:"CVM",         status:"parcial",         cor: T.att, bgCor: T.attL },
              { sigla:"INEP",        status:"parcial",         cor: T.att, bgCor: T.attL },
              { sigla:"ANP",         status:"parcial",         cor: T.att, bgCor: T.attL },
              { sigla:"Receita Fed.",status:"chave-gratuita",  cor: T.ins, bgCor: T.insL },
              { sigla:"Transparência",status:"chave-gratuita", cor: T.ins, bgCor: T.insL },
              { sigla:"DATASUS",     status:"complexo",        cor: T.rsk, bgCor: T.rskL },
              { sigla:"CFM",         status:"sem-api",         cor: T.rsk, bgCor: T.rskL },
              { sigla:"ANVISA",      status:"complexo",        cor: T.rsk, bgCor: T.rskL },
              { sigla:"RAIS",        status:"sem-api",         cor: T.rsk, bgCor: T.rskL },
            ] as Array<{ sigla: string; status: string; cor: string; bgCor: string }>).map((api, i) => (
              <div key={i} style={{ background: T.w, border: `1px solid ${T.b1}`, borderRadius: 11, padding: "10px 13px", boxShadow: T.sh, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.t0 }}>{api.sigla}</span>
                <span style={{ fontFamily: T.mono, fontSize: 9, padding: "2px 8px", borderRadius: 100, background: api.bgCor, color: api.cor }}>{api.status}</span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.t3, marginTop: 10 }}>
            ativo = implementado · parcial = CKAN/CSV · chave-gratuita = cadastro necessário · complexo = TabNet/SOAP
          </div>
        </section>

        {/* Erros não-críticos */}
        {data.errors.length > 0 && (
          <div style={{ padding: "10px 14px", background: T.attL, borderRadius: 10, marginBottom: 20 }}>
            <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.att, marginBottom: 4 }}>AVISOS</div>
            {data.errors.map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: T.t2, fontFamily: T.mono }}>{e}</div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ paddingTop: 20, borderTop: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: T.serif, fontSize: 13, color: T.t3 }}>Meridian Research</span>
          <span style={{ fontFamily: T.mono, fontSize: 10, color: T.t3 }}>
            Fontes: IBGE · BCB/SGS · IPEA · Comex Stat · ANS · ANATEL · dados públicos gratuitos
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [query,    setQuery]    = useState("");
  const [status,   setStatus]   = useState<"idle" | "running" | "done" | "error">("idle");
  const [data,     setData]     = useState<DashboardData | null>(null);
  const [err,      setErr]      = useState("");
  const [progress, setProgress] = useState<string[]>([]);

  const run = useCallback(async () => {
    if (!query.trim() || status === "running") return;
    setStatus("running"); setData(null); setErr(""); setProgress([]);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const line = chunk.replace(/^data: /, "").trim();
          if (!line) continue;
          let event: ProgressEvent;
          try { event = JSON.parse(line) as ProgressEvent; } catch { continue; }

          if (event.type === "progress") {
            setProgress(prev => [...prev, event.msg]);
          } else if (event.type === "dashboard") {
            setData(event.data);
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

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: T.ff, color: T.t0 }}>
      {/* Nav */}
      <div className="no-print" style={{ background: "rgba(250,250,250,.95)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${T.b1}`, padding: "13px 28px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
            placeholder="Ex: clínica de catarata em Brasília, fintech no Brasil..."
            style={{ flex: 1, minWidth: 200, background: "#F5F5F7", border: `1px solid ${T.b1}`, borderRadius: 10, padding: "8px 13px", fontFamily: T.ff, fontSize: 13, color: T.t0, resize: "none", height: 38, lineHeight: 1.4 }}
          />
          <button
            onClick={run}
            disabled={status === "running" || !query.trim()}
            style={{ background: status === "running" ? T.sigL : T.sig, color: status === "running" ? T.sig : "#fff", border: `1px solid ${status === "running" ? T.sig : "transparent"}`, borderRadius: 10, padding: "8px 18px", fontFamily: T.ff, fontSize: 13, fontWeight: 600, cursor: status === "running" ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", gap: 7 }}
          >
            {status === "running" && <div style={{ width: 11, height: 11, border: `2px solid ${T.sig}`, borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />}
            {status === "running" ? "Buscando..." : "Buscar →"}
          </button>
          {data && (
            <button onClick={() => window.print()} style={{ background: "transparent", border: `1px solid ${T.b1}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: T.t2, cursor: "pointer", flexShrink: 0 }}>
              ⬇ PDF
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 28px 80px" }}>

        {/* Empty */}
        {status === "idle" && !data && (
          <div className="no-print" style={{ textAlign: "center", padding: "72px 0 32px" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: T.sigL, border: `1px solid rgba(0,135,90,.2)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke={T.sig} strokeWidth="1.5" opacity=".5" />
                <circle cx="10" cy="10" r="2.5" fill={T.sig} />
                <path d="M10 2v2.5M10 15.5V18M2 10h2.5M15.5 10H18" stroke={T.sig} strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
              </svg>
            </div>
            <h2 style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 400, color: T.t0, margin: "0 0 10px" }}>Meridian Research</h2>
            <p style={{ fontSize: 14, color: T.t2, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 6px" }}>
              Dashboard de dados reais — IBGE e BCB. Sem API key. Sem custo.
            </p>
            <p style={{ fontSize: 12, color: T.t3, margin: "0 auto 24px", maxWidth: 420 }}>
              População · pirâmide etária · renda · PIB/capita · SELIC · IPCA · inflação saúde · câmbio
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

        {/* Loading */}
        {status === "running" && <ProgressLog lines={progress} />}

        {/* Error */}
        {status === "error" && (
          <div style={{ margin: "32px 0", padding: "18px 20px", background: T.rskL, border: `1px solid rgba(192,57,43,.2)`, borderRadius: 14 }}>
            <div style={{ fontWeight: 600, color: T.rsk, fontSize: 14, marginBottom: 10 }}>Erro</div>
            <pre style={{ fontSize: 12, fontFamily: T.mono, color: T.t1, whiteSpace: "pre-wrap", wordBreak: "break-all", margin: "0 0 12px" }}>{err}</pre>
            <button onClick={run} style={{ padding: "7px 16px", borderRadius: 8, background: T.rsk, color: "#fff", border: "none", fontSize: 12, cursor: "pointer", fontFamily: T.ff, fontWeight: 600 }}>
              Tentar novamente
            </button>
          </div>
        )}

        {data && <Dashboard data={data} />}
      </div>
    </div>
  );
}
