/**
 * scripts/debug-powerbi-query.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Script de diagnóstico DESCARTÁVEL — NÃO modifica o app.
 *
 * Objetivo: buscar linhas brutas de jan/2026 para PATEO HYUNDAI e YDUQS/WYDEN
 * e mostrar os valores de todas as colunas monetárias para descobrir qual
 * coluna representa o valor correto para o ranking de clientes.
 *
 * Uso:
 *   node scripts/debug-powerbi-query.js
 *
 * Requer: .env na raiz do projeto com as mesmas vars do backend.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Carrega .env da raiz (mesmo caminho que backend/server.js usa)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "../.env") });

const PBI_API = "https://api.powerbi.com/v1.0/myorg";

// ── 1. Autenticação (idêntica a _powerbi.js) ──────────────────────────────────

async function getToken() {
  const url = process.env.VITE_PBI_PROXY_URL;
  if (!url) throw new Error("VITE_PBI_PROXY_URL não definida no .env");

  console.log("\n[auth] obtendo token Power BI...");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "password",
      scope:         "https://analysis.windows.net/powerbi/api/.default",
      client_id:     process.env.VITE_PBI_CLIENT_ID,
      username:      process.env.VITE_PBI_USERNAME,
      password:      process.env.VITE_PBI_PASSWORD,
      client_secret: process.env.VITE_PBI_CLIENT_SECRET,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Token falhou ${res.status}: ${body.slice(0, 300)}`);
  }
  const { access_token } = await res.json();
  console.log("[auth] token obtido com sucesso");
  return access_token;
}

// ── 2. Descobrir dataset por nome ─────────────────────────────────────────────

const DATASET_NAME = "Ações de Conteúdo"; // nome exato no Power BI Service

async function findDataset(token) {
  const headers = { Authorization: `Bearer ${token}` };
  console.log(`\n[dataset] procurando "${DATASET_NAME}"...`);

  // Tenta em "Meu workspace" primeiro
  const myRes = await fetch(`${PBI_API}/datasets`, { headers });
  if (myRes.ok) {
    const { value = [] } = await myRes.json();
    const match = value.find(
      (ds) => ds.name.trim().toLowerCase() === DATASET_NAME.trim().toLowerCase()
    );
    if (match) {
      console.log(`[dataset] encontrado em "Meu workspace": ${match.id}`);
      return { datasetId: match.id, workspaceId: null };
    }
  }

  // Tenta em todos os grupos/workspaces
  const groupsRes = await fetch(`${PBI_API}/groups`, { headers });
  if (groupsRes.ok) {
    const { value: groups = [] } = await groupsRes.json();
    for (const group of groups) {
      const r = await fetch(`${PBI_API}/groups/${group.id}/datasets`, { headers });
      if (!r.ok) continue;
      const { value = [] } = await r.json();
      const match = value.find(
        (ds) => ds.name.trim().toLowerCase() === DATASET_NAME.trim().toLowerCase()
      );
      if (match) {
        console.log(`[dataset] encontrado no workspace "${group.name}": ${match.id}`);
        return { datasetId: match.id, workspaceId: group.id };
      }
    }
  }

  throw new Error(`Dataset "${DATASET_NAME}" não encontrado em nenhum workspace.`);
}

// ── 3. Executar query DAX ─────────────────────────────────────────────────────

async function runDAX(token, datasetId, workspaceId, query) {
  const base = workspaceId
    ? `${PBI_API}/groups/${workspaceId}/datasets/${datasetId}`
    : `${PBI_API}/datasets/${datasetId}`;

  const headers = {
    Authorization:  `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(`${base}/executeQueries`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      queries: [{ query }],
      serializerSettings: { includeNulls: true },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`DAX falhou ${res.status}: ${err.slice(0, 500)}`);
  }

  const data = await res.json();
  return data.results?.[0]?.tables?.[0]?.rows ?? [];
}

// ── 4. Normaliza chave: remove prefixo "Tabela[Coluna]" → "Coluna" ────────────

function clean(rawKey) {
  const m = rawKey.match(/\[([^\]]+)\]$/);
  return m ? m[1] : rawKey;
}

function cleanRows(rows) {
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [clean(k), v]))
  );
}

// ── 5. Formata número como moeda BR ───────────────────────────────────────────

function fmt(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number")
    return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return String(v);
}

// ── 6. Main ───────────────────────────────────────────────────────────────────

async function main() {
  const token = await getToken();
  const { datasetId, workspaceId } = await findDataset(token);

  // ── Query A: linhas brutas de jan/2026 para os dois clientes ──────────────
  // CALCULATETABLE filtra o contexto antes do SELECTCOLUMNS (evita erro de contexto de linha)
  const queryA = `
EVALUATE
CALCULATETABLE(
  SELECTCOLUMNS(
    'fatAConteudo',
    "Exibição",           'fatAConteudo'[Exibição],
    "Cliente",            'fatAConteudo'[Cliente],
    "Conteudo Bruto Neg", 'fatAConteudo'[Conteudo Bruto Negociado],
    "Conteudo Bruto",     'fatAConteudo'[Conteúdo Bruto],
    "Conteudo Liquido",   'fatAConteudo'[Conteúdo Líquido],
    "Liq Faturado",       'fatAConteudo'[Líquido Faturado],
    "Desconto",           'fatAConteudo'[Desconto],
    "DeC",                'fatAConteudo'[DeC]
  ),
  YEAR('fatAConteudo'[Exibição]) = 2026,
  MONTH('fatAConteudo'[Exibição]) = 1,
  'fatAConteudo'[Cliente] IN { "PATEO HYUNDAI", "YDUQS/WYDEN" }
)
ORDER BY [Cliente], [Exibição]
`;

  console.log("\n[query A] linhas brutas jan/2026 — PATEO HYUNDAI e YDUQS/WYDEN...");
  const rowsA = cleanRows(await runDAX(token, datasetId, workspaceId, queryA));

  if (!rowsA.length) {
    console.log("[query A] NENHUMA linha retornada. Verifique o filtro de data/cliente.");
  } else {
    console.log(`[query A] ${rowsA.length} linhas encontradas:\n`);

    // Cabeçalho da tabela
    const cols = ["Exibição", "Cliente", "Conteudo Bruto Neg", "Conteudo Bruto", "Conteudo Liquido", "Liq Faturado", "Desconto", "DeC"];
    const pad = (s, n) => String(s ?? "null").padEnd(n);

    console.log(
      pad("Exibição", 14) +
      pad("Cliente", 22) +
      pad("CBrutoNeg", 18) +
      pad("CBruto", 18) +
      pad("CLiquido", 18) +
      pad("LiqFaturado", 18) +
      pad("Desconto", 12) +
      "DeC"
    );
    console.log("─".repeat(140));

    for (const row of rowsA) {
      const exib = row["Exibição"]
        ? new Date(row["Exibição"]).toLocaleDateString("pt-BR")
        : "null";
      console.log(
        pad(exib, 14) +
        pad(row["Cliente"], 22) +
        pad(fmt(row["Conteudo Bruto Neg"]), 18) +
        pad(fmt(row["Conteudo Bruto"]), 18) +
        pad(fmt(row["Conteudo Liquido"]), 18) +
        pad(fmt(row["Liq Faturado"]), 18) +
        pad(fmt(row["Desconto"]), 12) +
        fmt(row["DeC"])
      );
    }
  }

  // ── Query B: agregado por cliente em jan/2026 para as 4 colunas ───────────
  const queryB = `
EVALUATE
GROUPBY(
  ADDCOLUMNS(
    FILTER(
      'fatAConteudo',
      FORMAT('fatAConteudo'[Exibição], "YYYY-MM") = "2026-01"
    ),
    "__mes", "2026-01"
  ),
  'fatAConteudo'[Cliente],
  "SomaBrutoNeg",   SUMX(CURRENTGROUP(), 'fatAConteudo'[Conteudo Bruto Negociado]),
  "SomaBruto",      SUMX(CURRENTGROUP(), 'fatAConteudo'[Conteúdo Bruto]),
  "SomaLiquido",    SUMX(CURRENTGROUP(), 'fatAConteudo'[Conteúdo Líquido]),
  "SomaLiqFat",     SUMX(CURRENTGROUP(), 'fatAConteudo'[Líquido Faturado]),
  "Registros",      COUNTX(CURRENTGROUP(), 'fatAConteudo'[Exibição])
)
ORDER BY [SomaBruto] DESC
`;

  console.log("\n[query B] totais por cliente em jan/2026 (todos os clientes, ordenado por Bruto)...");
  const rowsB = cleanRows(await runDAX(token, datasetId, workspaceId, queryB));

  if (!rowsB.length) {
    console.log("[query B] NENHUMA linha retornada.");
  } else {
    console.log(`[query B] ${rowsB.length} clientes em jan/2026:\n`);

    const pad = (s, n) => String(s ?? "null").padEnd(n);
    console.log(
      pad("Nº", 4) +
      pad("Cliente", 30) +
      pad("CBrutoNeg", 20) +
      pad("CBruto", 20) +
      pad("CLiquido", 20) +
      pad("LiqFaturado", 20) +
      "Reg"
    );
    console.log("─".repeat(130));

    rowsB.forEach((row, i) => {
      console.log(
        pad(i + 1, 4) +
        pad(row["Cliente"], 30) +
        pad(fmt(row["SomaBrutoNeg"]), 20) +
        pad(fmt(row["SomaBruto"]), 20) +
        pad(fmt(row["SomaLiquido"]), 20) +
        pad(fmt(row["SomaLiqFat"]), 20) +
        (row["Registros"] ?? 0)
      );
    });

    // Destaque para os dois clientes de interesse
    const targets = ["PATEO HYUNDAI", "YDUQS/WYDEN"];
    console.log("\n── Detalhes dos clientes de interesse ──");
    for (const name of targets) {
      const r = rowsB.find((x) => x["Cliente"]?.toUpperCase() === name.toUpperCase());
      if (r) {
        console.log(`\n${r["Cliente"]}:`);
        console.log(`  Conteudo Bruto Negociado : ${fmt(r["SomaBrutoNeg"])}`);
        console.log(`  Conteúdo Bruto           : ${fmt(r["SomaBruto"])}`);
        console.log(`  Conteúdo Líquido         : ${fmt(r["SomaLiquido"])}`);
        console.log(`  Líquido Faturado         : ${fmt(r["SomaLiqFat"])}`);
        console.log(`  Registros                : ${r["Registros"]}`);
      } else {
        console.log(`\n${name}: ← NÃO encontrado em jan/2026`);
      }
    }
  }
}

main().catch((err) => {
  console.error("\n[ERRO]", err.message);
  process.exit(1);
});
