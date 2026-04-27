/**
 * Helper Power BI server-side.
 * - Auto-descobre tabelas via GET /datasets/{id}/tables (não requer admin)
 * - TOPN aumentado para coberta total dos dados
 */

const PBI_API = "https://api.powerbi.com/v1.0/myorg";

// ── Token ─────────────────────────────────────────────────────────────────────

export async function getPBIToken() {
  const res = await fetch(process.env.VITE_PBI_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      scope: "https://analysis.windows.net/powerbi/api/.default",
      client_id: process.env.VITE_PBI_CLIENT_ID,
      username: process.env.VITE_PBI_USERNAME,
      password: process.env.VITE_PBI_PASSWORD,
      client_secret: process.env.VITE_PBI_CLIENT_SECRET,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Token PBI falhou: ${res.status}`);
  const { access_token } = await res.json();
  return access_token;
}

// ── Busca dataset por nome ────────────────────────────────────────────────────

export async function findDataset(token, titulo) {
  const headers = { Authorization: `Bearer ${token}` };
  const target = titulo.trim().toLowerCase();

  const [myRes, groupsRes] = await Promise.all([
    fetch(`${PBI_API}/datasets`, { headers }),
    fetch(`${PBI_API}/groups`, { headers }),
  ]);

  if (myRes.ok) {
    const { value = [] } = await myRes.json();
    const match = value.find((ds) => ds.name.trim().toLowerCase() === target);
    if (match) return { datasetId: match.id, workspaceId: null };
  }

  if (groupsRes.ok) {
    const { value: groups = [] } = await groupsRes.json();
    for (const group of groups) {
      const r = await fetch(`${PBI_API}/groups/${group.id}/datasets`, { headers });
      if (!r.ok) continue;
      const { value = [] } = await r.json();
      const match = value.find((ds) => ds.name.trim().toLowerCase() === target);
      if (match) return { datasetId: match.id, workspaceId: group.id };
    }
  }

  return null;
}

// ── Auto-descoberta de tabelas via REST API (não requer admin) ────────────────
// Usa GET /datasets/{id}/tables — retorna nomes de todas as tabelas do dataset

export async function discoverTablesFromAPI(token, datasetId, workspaceId) {
  const base = workspaceId
    ? `${PBI_API}/groups/${workspaceId}/datasets/${datasetId}`
    : `${PBI_API}/datasets/${datasetId}`;

  const headers = { Authorization: `Bearer ${token}` };

  try {
    const res = await fetch(`${base}/tables`, { headers });
    if (!res.ok) {
      console.warn(`[discoverTables] ${res.status} — sem permissão para listar tabelas`);
      return [];
    }
    const { value = [] } = await res.json();
    const names = value.map((t) => t.name).filter(Boolean);
    console.log(`[discoverTables] ${names.length} tabelas encontradas: ${names.join(", ")}`);
    return names;
  } catch (e) {
    console.warn(`[discoverTables] erro: ${e.message}`);
    return [];
  }
}

// ── DAX helper ────────────────────────────────────────────────────────────────

async function runDAX(base, headers, query, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/executeQueries`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        queries: [{ query }],
        serializerSettings: { includeNulls: true },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.warn(`[runDAX] ${res.status}: ${err.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    return data.results?.[0]?.tables?.[0]?.rows ?? null;
  } catch (e) {
    clearTimeout(timer);
    if (e.name !== "AbortError") console.warn(`[runDAX] erro: ${e.message}`);
    return null;
  }
}

// Extrai nome de coluna do header retornado pelo executeQueries.
function parseColName(rawKey) {
  const m = rawKey.match(/\[([^\]]+)\]$/);
  return m ? m[1] : rawKey;
}

// Normaliza rows removendo prefixo de tabela das chaves
function cleanRows(rows) {
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [parseColName(k), v]))
  );
}

// ── Descoberta de colunas via TOPN(1) ─────────────────────────────────────────

async function discoverColumns(base, headers, tableName, knownCols) {
  if (knownCols?.length) {
    const textCols = knownCols.filter((c) => c.dataType === "string").map((c) => c.name);
    const numCols  = knownCols.filter((c) => ["int64", "double", "decimal", "currency"].includes(c.dataType)).map((c) => c.name);
    return { textCols, numCols, allCols: knownCols.map((c) => c.name) };
  }

  const rows = await runDAX(base, headers, `EVALUATE TOPN(1, '${tableName}')`, 15000);
  if (!rows?.length) return { textCols: [], numCols: [], allCols: [] };

  const textCols = [], numCols = [], allCols = [];
  for (const [rawKey, value] of Object.entries(rows[0])) {
    const col = parseColName(rawKey);
    allCols.push(col);
    if (typeof value === "string") textCols.push(col);
    else if (typeof value === "number") numCols.push(col);
  }
  return { textCols, numCols, allCols };
}

// ── Auto-detecção de relacionamentos ─────────────────────────────────────────

function autoDetectRelationships(tableColMap) {
  const factPrefixes = ["fat", "fato", "fact", "ft", "f_"];
  const dimPrefixes  = ["dim", "dime", "d_", "d"];

  const isFactTable = (t) => factPrefixes.some((p) => t.toLowerCase().startsWith(p));
  const isDimTable  = (t) => dimPrefixes.some((p) => t.toLowerCase().startsWith(p));

  const tables = Object.keys(tableColMap);
  const factTables = tables.filter(isFactTable);
  const dimTables  = tables.filter(isDimTable);

  const relationships = [];

  for (const factTable of factTables) {
    const factCols = new Set([
      ...(tableColMap[factTable]?.textCols ?? []),
      ...(tableColMap[factTable]?.numCols  ?? []),
      ...(tableColMap[factTable]?.allCols  ?? []),
    ]);

    for (const dimTable of dimTables) {
      const dimCols = new Set([
        ...(tableColMap[dimTable]?.textCols ?? []),
        ...(tableColMap[dimTable]?.numCols  ?? []),
        ...(tableColMap[dimTable]?.allCols  ?? []),
      ]);

      for (const col of factCols) {
        if (dimCols.has(col)) {
          relationships.push({ fromTable: factTable, fromColumn: col, toTable: dimTable, toColumn: col });
          break;
        }
      }
    }
  }

  console.log(`[snapshot] relacionamentos auto-detectados: ${relationships.length}`);
  return relationships;
}

// ── Snapshot de dados reais ───────────────────────────────────────────────────

export async function getDataSnapshot(token, datasetId, workspaceId, knownTables = [], modelSchema = {}) {
  const base = workspaceId
    ? `${PBI_API}/groups/${workspaceId}/datasets/${datasetId}`
    : `${PBI_API}/datasets/${datasetId}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const measures       = modelSchema.measures       ?? [];
  const columnsByTable = modelSchema.columnsByTable ?? {};
  let   relationships  = modelSchema.relationships  ?? [];

  const tableNames = knownTables.filter(Boolean);
  if (!tableNames.length) return null;

  // 1. Descobre colunas de cada tabela
  const tableColMap = {};
  for (const tableName of tableNames) {
    const knownCols = columnsByTable[tableName] ?? [];
    const cols = await discoverColumns(base, headers, tableName, knownCols);
    tableColMap[tableName] = cols;
    console.log(`[snapshot] "${tableName}": ${cols.textCols.length} texto, ${cols.numCols.length} numérico`);
  }

  // 2. Se não há relacionamentos do schema, tenta auto-detectar
  if (!relationships.length) {
    relationships = autoDetectRelationships(tableColMap);
  }

  // 3. Snapshot por tabela — TOPN aumentado para cobrir todos os dados relevantes
  const tableSnapshots = [];
  for (const tableName of tableNames) {
    const { textCols, numCols } = tableColMap[tableName] ?? { textCols: [], numCols: [] };

    let rows = null;

    if (textCols.length > 0) {
      const dims = textCols.slice(0, 5).map((c) => `'${tableName}'[${c}]`).join(", ");
      const sums = numCols.slice(0, 15).map((c) => `"${c}", SUM('${tableName}'[${c}])`).join(", ");
      rows = await runDAX(
        base, headers,
        `EVALUATE
         TOPN(500,
           SUMMARIZECOLUMNS(
             ${dims}${sums ? ", " + sums : ""},
             "Registros", COUNTROWS('${tableName}')
           ),
           [Registros], DESC
         )`
      );
    } else if (numCols.length) {
      const sums = numCols.slice(0, 15).map((c) => `"${c}", SUM('${tableName}'[${c}])`).join(", ");
      rows = await runDAX(base, headers, `EVALUATE ROW(${sums}, "Total", COUNTROWS('${tableName}'))`);
    }

    if (rows?.length) {
      tableSnapshots.push({
        table: tableName,
        rows: cleanRows(rows),
        aggregated: textCols.length > 0,
      });
      console.log(`[snapshot] "${tableName}": ${rows.length} linhas de dados`);
    } else {
      console.log(`[snapshot] "${tableName}": sem dados`);
    }
  }

  // 4. Análise cruzada dim × fact — TOPN aumentado para cobertura real
  const crossSnapshots = [];
  const factToDims = {};
  for (const rel of relationships) {
    if (!factToDims[rel.fromTable]) factToDims[rel.fromTable] = [];
    factToDims[rel.fromTable].push(rel.toTable);
  }

  for (const [factTable, dimTables] of Object.entries(factToDims)) {
    const factCols = tableColMap[factTable];
    if (!factCols?.numCols?.length) continue;

    const sums = factCols.numCols.slice(0, 12).map((c) => `"${c}", SUM('${factTable}'[${c}])`).join(", ");

    for (const dimTable of [...new Set(dimTables)].slice(0, 6)) {
      const dimCols = tableColMap[dimTable];
      if (!dimCols?.textCols?.length) continue;

      const groupBy = dimCols.textCols.slice(0, 4).map((c) => `'${dimTable}'[${c}]`).join(", ");

      const rows = await runDAX(
        base, headers,
        `EVALUATE
         TOPN(500,
           SUMMARIZECOLUMNS(
             ${groupBy},
             ${sums},
             "Registros", COUNTROWS('${factTable}')
           ),
           [Registros], DESC
         )`
      );

      if (rows?.length) {
        crossSnapshots.push({ factTable, dimTable, rows: cleanRows(rows) });
        console.log(`[snapshot] cruzamento ${factTable} × ${dimTable}: ${rows.length} linhas`);
      }
    }
  }

  return { tableNames, measures, relationships, tableSnapshots, crossSnapshots };
}

// ── Formata snapshot ──────────────────────────────────────────────────────────

const MAX_SNAPSHOT_CHARS = 40_000;
const MAX_ROWS_CROSS = 200;
const MAX_ROWS_DIM   = 100;
const MAX_MEASURES   = 60;
const MAX_CROSS      = 12;

function fmtVal(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isInteger(v) ? v.toLocaleString("pt-BR") : v.toFixed(4);
  return v;
}

function rowLine(row) {
  return "  " + Object.entries(row)
    .map(([k, v]) => { const f = fmtVal(v); return f !== null ? `${k}: ${f}` : null; })
    .filter(Boolean)
    .join(" | ");
}

export function formatSnapshot(snapshot) {
  if (!snapshot) return "";

  const { tableNames, measures, relationships, tableSnapshots, crossSnapshots } = snapshot;
  const lines = ["\n\n--- DADOS REAIS DO DATASET ---"];

  if (tableNames?.length) lines.push(`Tabelas: ${tableNames.join(", ")}`);

  if (relationships?.length) {
    lines.push(`\nRelacionamentos:`);
    for (const r of relationships) lines.push(`  ${r.fromTable}[${r.fromColumn}] → ${r.toTable}[${r.toColumn}]`);
  }

  if (measures?.length) {
    lines.push(`\nMedidas DAX:`);
    for (const m of measures.slice(0, MAX_MEASURES)) lines.push(`  [${m.table}].[${m.name}] = ${m.expression}`);
    if (measures.length > MAX_MEASURES) lines.push(`  ... +${measures.length - MAX_MEASURES} medidas`);
  }

  if (crossSnapshots?.length) {
    lines.push(`\n=== ANÁLISE CRUZADA (dados para responder perguntas analíticas) ===`);
    for (const { factTable, dimTable, rows } of crossSnapshots.slice(0, MAX_CROSS)) {
      lines.push(`\n${dimTable} × ${factTable} (${rows.length} combinações, ordenado por volume):`);
      for (const row of rows.slice(0, MAX_ROWS_CROSS)) lines.push(rowLine(row));
      if (rows.length > MAX_ROWS_CROSS) lines.push(`  ... +${rows.length - MAX_ROWS_CROSS} linhas adicionais`);
    }
  }

  if (tableSnapshots?.length) {
    lines.push(`\n=== DADOS POR TABELA ===`);
    for (const { table, rows, aggregated } of tableSnapshots) {
      lines.push(`\n"${table}" (${rows.length} ${aggregated ? "combinações" : "registros"}):`);
      for (const row of rows.slice(0, MAX_ROWS_DIM)) lines.push(rowLine(row));
      if (rows.length > MAX_ROWS_DIM) lines.push(`  ... +${rows.length - MAX_ROWS_DIM} linhas`);
    }
  }

  lines.push("\n--- FIM DOS DADOS ---");
  const result = lines.join("\n");
  console.log(`[snapshot] texto final: ${result.length} chars → ~${Math.round(result.length / 4)} tokens`);

  if (result.length > MAX_SNAPSHOT_CHARS) {
    return result.slice(0, MAX_SNAPSHOT_CHARS) + "\n[dados truncados por limite de contexto]";
  }
  return result;
}
