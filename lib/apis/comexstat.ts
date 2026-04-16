/**
 * Wrapper para a API Comex Stat do MDIC
 * Documentação: https://api.comexstat.mdic.gov.br/
 * Sem autenticação. Dados de comércio exterior do Brasil.
 */

const BASE = "https://api.comexstat.mdic.gov.br";

// Mapa de UF sigla → código IBGE (usado pelo Comex Stat)
const UF_CODES: Record<string, string> = {
  AC:"12", AL:"27", AP:"16", AM:"13", BA:"29", CE:"23", DF:"53",
  ES:"32", GO:"52", MA:"21", MT:"51", MS:"50", MG:"31", PA:"15",
  PB:"25", PR:"41", PE:"26", PI:"22", RJ:"33", RN:"24", RS:"43",
  RO:"11", RR:"14", SC:"42", SP:"35", SE:"28", TO:"17",
};

// ─── Balança comercial anual (Brasil) ────────────────────────────────────────
export async function fetchTradeBalance(year = new Date().getFullYear() - 1): Promise<{
  exportacoes_usd: number;
  importacoes_usd: number;
  saldo_usd: number;
  ano: number;
  fonte: string;
}> {
  try {
    const [exp, imp] = await Promise.all([
      fetch(`${BASE}/general?flow=exp&monthDetail=false&year=${year}&lang=pt`, { next: { revalidate: 86400 } }),
      fetch(`${BASE}/general?flow=imp&monthDetail=false&year=${year}&lang=pt`, { next: { revalidate: 86400 } }),
    ]);

    if (!exp.ok || !imp.ok) throw new Error("Comex Stat HTTP error");

    const expData = await exp.json();
    const impData = await imp.json();

    // A API retorna array; total pode estar em sumário ou soma dos itens
    const expTotal = extractTotal(expData);
    const impTotal = extractTotal(impData);

    return {
      exportacoes_usd: expTotal,
      importacoes_usd: impTotal,
      saldo_usd: expTotal - impTotal,
      ano: year,
      fonte: `Comex Stat / MDIC – ${year}`,
    };
  } catch {
    return { exportacoes_usd: 0, importacoes_usd: 0, saldo_usd: 0, ano: year, fonte: "Comex Stat / MDIC (erro)" };
  }
}

function extractTotal(data: unknown): number {
  if (!data) return 0;
  // A API pode retornar { data: [...] } ou diretamente array
  const arr = Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? [];
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  // Tenta somar o campo metricFOB ou metricKG
  return arr.reduce((sum: number, row: unknown) => {
    const r = row as Record<string, unknown>;
    const v = parseFloat(String(r.metricFOB ?? r.metric_fob ?? r.fob ?? 0));
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
}

// ─── Balança por UF ───────────────────────────────────────────────────────────
export async function fetchTradeByUF(uf: string, year = new Date().getFullYear() - 1): Promise<{
  uf: string;
  exportacoes_usd: number;
  importacoes_usd: number;
  saldo_usd: number;
  ano: number;
  fonte: string;
}> {
  const ufCode = UF_CODES[uf.toUpperCase()];
  if (!ufCode) return { uf, exportacoes_usd: 0, importacoes_usd: 0, saldo_usd: 0, ano: year, fonte: "UF inválida" };

  try {
    const [exp, imp] = await Promise.all([
      fetch(`${BASE}/states?flow=exp&monthDetail=false&year=${year}&stateCode=${ufCode}&lang=pt`, { next: { revalidate: 86400 } }),
      fetch(`${BASE}/states?flow=imp&monthDetail=false&year=${year}&stateCode=${ufCode}&lang=pt`, { next: { revalidate: 86400 } }),
    ]);

    if (!exp.ok || !imp.ok) throw new Error("Comex Stat HTTP error");

    const expData = await exp.json();
    const impData = await imp.json();

    const expTotal = extractTotal(expData);
    const impTotal = extractTotal(impData);

    return {
      uf: uf.toUpperCase(),
      exportacoes_usd: expTotal,
      importacoes_usd: impTotal,
      saldo_usd: expTotal - impTotal,
      ano: year,
      fonte: `Comex Stat / MDIC – ${uf.toUpperCase()} ${year}`,
    };
  } catch {
    return { uf, exportacoes_usd: 0, importacoes_usd: 0, saldo_usd: 0, ano: year, fonte: "Comex Stat / MDIC (erro)" };
  }
}

// ─── Série histórica mensal ───────────────────────────────────────────────────
export async function fetchTradeMonthly(year = new Date().getFullYear() - 1): Promise<{
  mensal: Array<{ mes: number; exportacoes: number; importacoes: number }>;
  ano: number;
  fonte: string;
}> {
  try {
    const [exp, imp] = await Promise.all([
      fetch(`${BASE}/general?flow=exp&monthDetail=true&year=${year}&lang=pt`, { next: { revalidate: 86400 } }),
      fetch(`${BASE}/general?flow=imp&monthDetail=true&year=${year}&lang=pt`, { next: { revalidate: 86400 } }),
    ]);

    if (!exp.ok || !imp.ok) throw new Error("Comex Stat HTTP error");

    const expArr: Record<string, unknown>[] = flattenData(await exp.json());
    const impArr: Record<string, unknown>[] = flattenData(await imp.json());

    const mensal: Array<{ mes: number; exportacoes: number; importacoes: number }> = [];
    for (let m = 1; m <= 12; m++) {
      const e = expArr.find(r => Number(r.monthCode ?? r.month ?? 0) === m);
      const i = impArr.find(r => Number(r.monthCode ?? r.month ?? 0) === m);
      if (e || i) {
        mensal.push({
          mes: m,
          exportacoes: parseFloat(String(e?.metricFOB ?? e?.fob ?? 0)) || 0,
          importacoes: parseFloat(String(i?.metricFOB ?? i?.fob ?? 0)) || 0,
        });
      }
    }

    return { mensal, ano: year, fonte: `Comex Stat / MDIC – mensal ${year}` };
  } catch {
    return { mensal: [], ano: year, fonte: "Comex Stat / MDIC (erro)" };
  }
}

function flattenData(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  const d = data as { data?: unknown[] };
  if (Array.isArray(d?.data)) return d.data as Record<string, unknown>[];
  return [];
}
