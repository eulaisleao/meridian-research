/**
 * Wrapper para dados abertos da ANATEL
 * Portal: https://informacoes.anatel.gov.br/paineis/
 * CKAN: https://dados.anatel.gov.br/dataset
 * Sem autenticação.
 */

const CKAN = "https://dados.anatel.gov.br/api/3/action";
const BCB_PROXY = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

// ─── Acessos de banda larga (via ANATEL CKAN) ─────────────────────────────────
export async function fetchBandaLarga(): Promise<{
  total_acessos?: number;
  por_tecnologia?: Array<{ tecnologia: string; total: number }>;
  data_referencia?: string;
  fonte: string;
}> {
  try {
    // Dataset de acessos SCM (Serviço de Comunicação Multimídia)
    const pkgRes = await fetch(`${CKAN}/package_show?id=acessos_scm`, { next: { revalidate: 86400 } });
    if (!pkgRes.ok) throw new Error("ANATEL HTTP error");

    const pkg = await pkgRes.json() as { success: boolean; result?: { resources?: Array<{ id: string; format: string }> } };
    const resources = pkg.result?.resources ?? [];
    const resource = resources.find(r => r.format?.toUpperCase() === "JSON") ?? resources[0];
    if (!resource) throw new Error("no resource");

    const dataRes = await fetch(`${CKAN}/datastore_search?resource_id=${resource.id}&limit=10&sort=Ano%20desc,Mes%20desc`, {
      next: { revalidate: 3600 },
    });
    if (!dataRes.ok) throw new Error("datastore error");

    const json = await dataRes.json() as {
      success: boolean;
      result?: { records?: Record<string, string>[]; total?: number };
    };

    if (!json.success || !json.result?.records?.length) throw new Error("no records");

    const records = json.result.records;
    const totalField = Object.keys(records[0]).find(k => k.toLowerCase().includes("acesso") || k.toLowerCase().includes("total"));

    return {
      total_acessos: totalField ? parseInt(String(records[0][totalField]).replace(/\D/g, "")) || undefined : undefined,
      data_referencia: `${records[0]["Ano"] ?? ""}/${records[0]["Mes"] ?? ""}`,
      fonte: "ANATEL / SCM",
    };
  } catch {
    return { fonte: "ANATEL (API indisponível — use dados.anatel.gov.br)" };
  }
}

// ─── Acessos de telefonia móvel ───────────────────────────────────────────────
export async function fetchTelefoniaMovel(): Promise<{
  total_acessos?: number;
  data_referencia?: string;
  fonte: string;
}> {
  try {
    // Via BCB série 7477: Linhas móveis em serviço (ANATEL via BCB)
    const res = await fetch(`${BCB_PROXY}.7477/dados/ultimos/1?formato=json`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error("BCB HTTP error");
    const data = await res.json() as Array<{ data: string; valor: string }>;
    return {
      total_acessos: data[0] ? parseFloat(data[0].valor) * 1000 : undefined, // série em milhares
      data_referencia: data[0]?.data,
      fonte: "ANATEL via BCB/SGS – Série 7477",
    };
  } catch {
    return { fonte: "ANATEL (dados indisponíveis)" };
  }
}
