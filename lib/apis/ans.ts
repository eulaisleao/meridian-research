/**
 * Wrapper para dados abertos da ANS (Agência Nacional de Saúde Suplementar)
 * API CKAN: https://dadosabertos.ans.gov.br/api/3/
 * Sem autenticação.
 */

const CKAN = "https://dadosabertos.ans.gov.br/api/3/action";

interface CKANResult {
  success: boolean;
  result?: {
    records?: Record<string, string>[];
    total?: number;
    fields?: Array<{ id: string; type: string }>;
  };
}

// Resource IDs conhecidos (podem mudar; usamos package_show para descobrir)
const KNOWN_PACKAGES = [
  "beneficiarios-plano-de-saude",
  "beneficiarios_por_modalidade_uf",
  "informacoes-gerais",
];

// ─── Descobre resource_id via package_show ────────────────────────────────────
async function discoverResourceId(packageId: string): Promise<string | null> {
  try {
    const res = await fetch(`${CKAN}/package_show?id=${packageId}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; result?: { resources?: Array<{ id: string; format: string }> } };
    const resources = json.result?.resources ?? [];
    // Prefere CSV ou JSON
    const r = resources.find(x => x.format?.toUpperCase() === "JSON") ??
              resources.find(x => x.format?.toUpperCase() === "CSV") ??
              resources[0];
    return r?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Beneficiários por UF ─────────────────────────────────────────────────────
export async function fetchBeneficiariosByUF(uf?: string): Promise<{
  total_brasil?: number;
  por_uf?: Array<{ uf: string; beneficiarios: number }>;
  uf_selecionada?: { uf: string; beneficiarios: number; pct_populacao?: number };
  data_referencia?: string;
  fonte: string;
}> {
  // Tenta diferentes endpoints CKAN conhecidos
  for (const pkg of KNOWN_PACKAGES) {
    try {
      const resourceId = await discoverResourceId(pkg);
      if (!resourceId) continue;

      const url = `${CKAN}/datastore_search?resource_id=${resourceId}&limit=30`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) continue;

      const json = await res.json() as CKANResult;
      if (!json.success || !json.result?.records?.length) continue;

      const records = json.result.records;

      // Tenta identificar campos de UF e beneficiários
      const ufField = Object.keys(records[0]).find(k =>
        k.toLowerCase().includes("uf") || k.toLowerCase().includes("estado") || k.toLowerCase() === "sg_uf"
      );
      const benField = Object.keys(records[0]).find(k =>
        k.toLowerCase().includes("benef") || k.toLowerCase().includes("total") || k.toLowerCase().includes("qtd")
      );

      if (!ufField || !benField) continue;

      const porUF = records
        .map(r => ({ uf: String(r[ufField]).trim().toUpperCase(), beneficiarios: parseInt(String(r[benField]).replace(/\D/g, "")) || 0 }))
        .filter(r => r.uf.length === 2 && r.beneficiarios > 0)
        .sort((a, b) => b.beneficiarios - a.beneficiarios);

      if (porUF.length === 0) continue;

      const totalBrasil = porUF.reduce((s, r) => s + r.beneficiarios, 0);
      const ufRow = uf ? porUF.find(r => r.uf === uf.toUpperCase()) : undefined;

      // Tenta pegar data de referência
      const dataField = Object.keys(records[0]).find(k =>
        k.toLowerCase().includes("data") || k.toLowerCase().includes("competencia") || k.toLowerCase().includes("periodo")
      );

      return {
        total_brasil: totalBrasil,
        por_uf: porUF,
        uf_selecionada: ufRow,
        data_referencia: dataField ? String(records[0][dataField]) : undefined,
        fonte: `ANS / CKAN – ${pkg}`,
      };
    } catch {
      continue;
    }
  }

  // Se falhar tudo, retorna dados estimados com fonte explícita
  return {
    fonte: "ANS (API indisponível — use dadosabertos.ans.gov.br)",
  };
}

// ─── Lista de operadoras ativas ───────────────────────────────────────────────
export async function fetchOperadoras(): Promise<{
  total: number;
  por_modalidade?: Array<{ modalidade: string; total: number }>;
  fonte: string;
}> {
  try {
    // Dataset de operadoras ativas
    const resourceId = await discoverResourceId("operadoras-de-planos-privados-de-saude");
    if (!resourceId) throw new Error("resource não encontrado");

    const url = `${CKAN}/datastore_search_sql?sql=SELECT%20COUNT(*)%20as%20total%20FROM%20%22${resourceId}%22`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error("HTTP error");

    const json = await res.json() as CKANResult;
    const total = parseInt(String(json.result?.records?.[0]?.total ?? "0"));

    return { total, fonte: "ANS / CKAN – operadoras ativas" };
  } catch {
    return { total: 0, fonte: "ANS (API indisponível)" };
  }
}
