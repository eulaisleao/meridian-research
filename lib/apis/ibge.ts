/**
 * Wrapper para as APIs públicas do IBGE
 * Documentação: https://servicodados.ibge.gov.br/api/docs
 */

const BASE = "https://servicodados.ibge.gov.br/api/v3";
const SIDRA = "https://apisidra.ibge.gov.br";

// Mapa UF sigla → código IBGE
const UF_CODES: Record<string, string> = {
  AC: "12", AL: "27", AP: "16", AM: "13", BA: "29",
  CE: "23", DF: "53", ES: "32", GO: "52", MA: "21",
  MT: "51", MS: "50", MG: "31", PA: "15", PB: "25",
  PR: "41", PE: "26", PI: "22", RJ: "33", RN: "24",
  RS: "43", RO: "11", RR: "14", SC: "42", SP: "35",
  SE: "28", TO: "17",
};

function ufCode(uf: string): string {
  return UF_CODES[uf.toUpperCase()] ?? uf;
}

// ─── População estimada por UF (Censo 2022 / estimativas) ────────────────────
export async function fetchPopulation(uf?: string): Promise<{
  uf?: string;
  populacao: number;
  ano: string;
  fonte: string;
}> {
  // Tabela 9514: Estimativas da população (2024)
  const localidade = uf ? `N3/${ufCode(uf)}` : "N1/1";
  const url = `${SIDRA}/values/t/9514/n${localidade.split("/")[0].slice(1)}/${localidade.split("/")[1]}/v/allve/p/last%201`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`IBGE HTTP ${res.status}`);
    const data = await res.json();
    // data[0] é header, data[1...] são os valores
    const row = data.find((r: Record<string, string>) => r.V && r.V !== "V");
    return {
      uf: uf?.toUpperCase(),
      populacao: parseInt(row?.V ?? "0", 10),
      ano: row?.D2N ?? "2024",
      fonte: "IBGE/Estimativas Populacionais",
    };
  } catch {
    // fallback: tabela 6579 (Censo 2022)
    const fallUrl = `${BASE}/agregados/6579/periodos/2022/variaveis/9324?localidades=${uf ? `N3[${ufCode(uf)}]` : "N1[1]"}`;
    const res2 = await fetch(fallUrl, { next: { revalidate: 86400 } });
    const data2 = await res2.json();
    const resultado = data2?.[0]?.resultados?.[0]?.series?.[0]?.serie?.["2022"] ?? "0";
    return {
      uf: uf?.toUpperCase(),
      populacao: parseInt(resultado, 10),
      ano: "2022",
      fonte: "IBGE/Censo 2022",
    };
  }
}

// ─── Pirâmide etária (% por faixa) ────────────────────────────────────────────
export async function fetchAgePyramid(uf?: string): Promise<{
  faixas: Array<{ faixa: string; percentual: number }>;
  pct_60_mais: number;
  fonte: string;
}> {
  // Tabela 9606: população por grupos de idade (Censo 2022)
  const localidade = uf ? `N3[${ufCode(uf)}]` : "N1[1]";
  const url = `${BASE}/agregados/9606/periodos/2022/variaveis/606?localidades=${localidade}`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`IBGE HTTP ${res.status}`);
    const data = await res.json();

    const series = data?.[0]?.resultados ?? [];
    const faixas: Array<{ faixa: string; percentual: number }> = [];
    let total = 0;
    let acima60 = 0;

    for (const resultado of series) {
      const classificacao = resultado.classificacoes?.[0]?.categoria;
      if (!classificacao) continue;
      for (const [catId, catNome] of Object.entries(classificacao)) {
        const valor = parseInt(resultado.series?.[0]?.serie?.["2022"] ?? "0", 10);
        total += valor;
        if (["60 a 64 anos","65 a 69 anos","70 a 74 anos","75 a 79 anos","80 anos ou mais"].includes(String(catNome))) {
          acima60 += valor;
        }
        faixas.push({ faixa: String(catNome), percentual: valor });
        void catId;
      }
    }

    // converte para percentual
    const faixasPct = faixas.map(f => ({
      faixa: f.faixa,
      percentual: total > 0 ? parseFloat(((f.percentual / total) * 100).toFixed(1)) : 0,
    }));

    return {
      faixas: faixasPct,
      pct_60_mais: total > 0 ? parseFloat(((acima60 / total) * 100).toFixed(1)) : 0,
      fonte: "IBGE/Censo 2022 – Grupos de Idade",
    };
  } catch {
    return {
      faixas: [],
      pct_60_mais: 0,
      fonte: "IBGE/Censo 2022 (dados indisponíveis)",
    };
  }
}

// ─── PIB per capita por UF ────────────────────────────────────────────────────
export async function fetchPIBPerCapita(uf?: string): Promise<{
  pib_per_capita: number;
  ano: string;
  fonte: string;
}> {
  const localidade = uf ? `N3[${ufCode(uf)}]` : "N1[1]";
  // Tabela 5938: Produto Interno Bruto per capita (R$)
  const url = `${BASE}/agregados/5938/periodos/2021/variaveis/37?localidades=${localidade}`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`IBGE HTTP ${res.status}`);
    const data = await res.json();
    const valor = data?.[0]?.resultados?.[0]?.series?.[0]?.serie?.["2021"] ?? "0";
    return {
      pib_per_capita: parseInt(valor, 10),
      ano: "2021",
      fonte: "IBGE/PIB por UF 2021",
    };
  } catch {
    return { pib_per_capita: 0, ano: "2021", fonte: "IBGE/PIB (dados indisponíveis)" };
  }
}

// ─── Renda domiciliar média (PNAD) ────────────────────────────────────────────
export async function fetchHouseholdIncome(uf?: string): Promise<{
  renda_media: number;
  ano: string;
  fonte: string;
}> {
  // Tabela 7435: rendimento médio mensal real – PNAD Contínua
  const localidade = uf ? `N3[${ufCode(uf)}]` : "N1[1]";
  const url = `${BASE}/agregados/7435/periodos/2023/variaveis/5932?localidades=${localidade}`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`IBGE HTTP ${res.status}`);
    const data = await res.json();
    const valor = data?.[0]?.resultados?.[0]?.series?.[0]?.serie?.["2023"] ?? "0";
    return {
      renda_media: parseInt(valor, 10),
      ano: "2023",
      fonte: "IBGE/PNAD Contínua – Rendimento Médio Real",
    };
  } catch {
    return { renda_media: 0, ano: "2023", fonte: "IBGE/PNAD (dados indisponíveis)" };
  }
}
