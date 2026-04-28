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

// Tabelas ignoradas no snapshot (sem valor analítico direto)
const SKIP_SNAPSHOT_TABLES = new Set(["Medidas"]);

export async function getDataSnapshot(token, datasetId, workspaceId, knownTables = [], modelSchema = {}) {
  const base = workspaceId
    ? `${PBI_API}/groups/${workspaceId}/datasets/${datasetId}`
    : `${PBI_API}/datasets/${datasetId}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const measures      = modelSchema.measures      ?? [];
  const relationships = modelSchema.relationships ?? [];

  const tableNames = knownTables.filter((t) => t && !SKIP_SNAPSHOT_TABLES.has(t));
  if (!tableNames.length) return null;

  const tableSnapshots = [];
  const crossSnapshots = [];

  // ── Query 1: Resumo mensal ──────────────────────────────────────────────────
  // GROUPBY + ADDCOLUMNS agrupa por expressão derivada de data (padrão DAX correto).
  // TOPN(24, [__mes], DESC) garante os 24 meses mais recentes — jan/2026 incluído.
  // Métrica: Líquido Faturado (confirmado via debug como valor correto para ranking).
  const monthlyRows = await runDAX(base, headers,
    `EVALUATE
TOPN(
  24,
  GROUPBY(
    ADDCOLUMNS(
      'fatAConteudo',
      "__mes", FORMAT('fatAConteudo'[Exibição], "YYYY-MM")
    ),
    [__mes],
    "Faturamento", SUMX(CURRENTGROUP(), 'fatAConteudo'[Líquido Faturado]),
    "Registros",   COUNTX(CURRENTGROUP(), 'fatAConteudo'[Exibição])
  ),
  [__mes], DESC
)
ORDER BY [__mes] DESC`
  );

  if (monthlyRows?.length) {
    tableSnapshots.push({
      table: "fatAConteudo — resumo mensal",
      rows: cleanRows(monthlyRows),
      aggregated: true,
    });
    console.log(`[snapshot] resumo mensal: ${monthlyRows.length} meses`);
  } else {
    console.log(`[snapshot] resumo mensal: sem dados`);
  }

  // ── Query 2: Top clientes por mês ───────────────────────────────────────────
  // TOPN(300, [__mes] DESC, [Faturamento] DESC):
  //   - Ordena primeiro pelo mês mais recente → jan/2026 sempre no topo
  //   - Dentro de cada mês, clientes pelo maior Líquido Faturado
  //   - formatSnapshot limita a MAX_CLIENTS_PER_MONTH clientes por mês
  const clientMonthRows = await runDAX(base, headers,
    `EVALUATE
TOPN(
  300,
  GROUPBY(
    ADDCOLUMNS(
      'fatAConteudo',
      "__mes", FORMAT('fatAConteudo'[Exibição], "YYYY-MM")
    ),
    [__mes],
    'fatAConteudo'[Cliente],
    "Faturamento", SUMX(CURRENTGROUP(), 'fatAConteudo'[Líquido Faturado]),
    "Registros",   COUNTX(CURRENTGROUP(), 'fatAConteudo'[Exibição])
  ),
  [__mes], DESC,
  [Faturamento], DESC
)
ORDER BY [__mes] DESC, [Faturamento] DESC`
  );

  if (clientMonthRows?.length) {
    crossSnapshots.push({
      factTable: "fatAConteudo",
      dimTable:  "Cliente × Mês",
      rows: cleanRows(clientMonthRows),
    });
    console.log(`[snapshot] cliente × mês: ${clientMonthRows.length} combinações`);
  } else {
    console.log(`[snapshot] cliente × mês: sem dados`);
  }

  return { tableNames, measures, relationships, tableSnapshots, crossSnapshots };
}

// ── Formata snapshot ──────────────────────────────────────────────────────────

const MAX_SNAPSHOT_CHARS    = 12_000;  // ~3.000 tokens
const MAX_ROWS_DIM          = 24;      // meses de resumo mensal
const MAX_MEASURES          = 15;      // só nomes, sem expressão
const MAX_CLIENTS_PER_MONTH = 5;       // top N clientes por mês

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

  const { measures, relationships, tableSnapshots, crossSnapshots } = snapshot;
  const lines = ["\n\n--- DADOS REAIS DO DATASET ---"];

  // Relacionamentos (compacto)
  if (relationships?.length) {
    lines.push(`Relacionamentos: ${relationships.map((r) => `${r.fromTable}[${r.fromColumn}]→${r.toTable}`).join(", ")}`);
  }

  // Medidas — apenas nomes (expressões já estão no knowledge.json)
  if (measures?.length) {
    const slice = measures.filter((m) => m.table !== "Medidas" || true).slice(0, MAX_MEASURES);
    lines.push(`Medidas (${measures.length} total, top ${slice.length}): ${slice.map((m) => `[${m.name}]`).join(", ")}`);
    if (measures.length > MAX_MEASURES) lines.push(`  ... +${measures.length - MAX_MEASURES} medidas omitidas`);
  }

  // Top clientes por mês
  if (crossSnapshots?.length) {
    lines.push(`\n=== TOP CLIENTES POR MÊS (top ${MAX_CLIENTS_PER_MONTH}/mês) ===`);
    for (const { rows } of crossSnapshots) {
      // As linhas chegam ordenadas por [__mes] DESC, [BrutoNegociado] DESC
      let currentMonth = null;
      let clientCount  = 0;
      for (const row of rows) {
        const month = row.__mes ?? "";
        if (month !== currentMonth) {
          currentMonth = month;
          clientCount  = 0;
          lines.push(`  ── ${month} ──`);
        }
        if (clientCount < MAX_CLIENTS_PER_MONTH) {
          const { __mes, ...rest } = row;
          lines.push(rowLine(rest));
          clientCount++;
        }
      }
    }
  }

  // Resumo mensal
  if (tableSnapshots?.length) {
    lines.push(`\n=== RESUMO MENSAL ===`);
    for (const { rows } of tableSnapshots) {
      for (const row of rows.slice(0, MAX_ROWS_DIM)) lines.push(rowLine(row));
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
