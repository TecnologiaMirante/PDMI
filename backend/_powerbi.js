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

async function runDAX(base, headers, query, timeoutMs = 45000, label = "query") {
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
      console.warn(`[runDAX:${label}] HTTP ${res.status}: ${err}`);
      return null;
    }
    const data = await res.json();
    return data.results?.[0]?.tables?.[0]?.rows ?? null;
  } catch (e) {
    clearTimeout(timer);
    if (e.name !== "AbortError") console.warn(`[runDAX:${label}] erro: ${e.message}`);
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

  // ── Query 3: Faturamento anual por cliente ──────────────────────────────────
  // GROUPBY simples sem aninhamento — Faturamento + Registros por Ano × Cliente.
  // Meses Ativos é calculado em JS via Query 4.
  const annualClientRows = await runDAX(base, headers,
    `EVALUATE
VAR Base =
    ADDCOLUMNS(
        'fatAConteudo',
        "__ano", YEAR('fatAConteudo'[Exibição])
    )
RETURN
GROUPBY(
    Base,
    [__ano],
    'fatAConteudo'[Cliente],
    "Faturamento Anual", SUMX(CURRENTGROUP(), 'fatAConteudo'[Líquido Faturado]),
    "Registros",         COUNTX(CURRENTGROUP(), 'fatAConteudo'[Exibição])
)
ORDER BY [__ano] DESC, [Faturamento Anual] DESC`,
    45000, "q3-anual"
  );

  if (annualClientRows?.length) {
    console.log(`[snapshot] clientes por ano: ${annualClientRows.length} combinações`);
  } else {
    console.log(`[snapshot] clientes por ano: sem dados`);
  }

  // ── Query 4: Meses ativos por Ano × Cliente ─────────────────────────────────
  // DISTINCT + SELECTCOLUMNS retorna todas as combinações (ano, cliente, mês).
  // JS conta meses distintos por (ano, cliente) e injeta na seção anual.
  const annualMesRows = await runDAX(base, headers,
    `EVALUATE
DISTINCT(
    SELECTCOLUMNS(
        'fatAConteudo',
        "__ano",    YEAR('fatAConteudo'[Exibição]),
        "Cliente",  'fatAConteudo'[Cliente],
        "__mes",    FORMAT('fatAConteudo'[Exibição], "YYYY-MM")
    )
)`,
    45000, "q4-meses"
  );

  if (annualMesRows?.length) {
    console.log(`[snapshot] meses ativos: ${annualMesRows.length} combinações ano×cliente×mês`);
  } else {
    console.log(`[snapshot] meses ativos: sem dados`);
  }

  return {
    tableNames,
    measures,
    relationships,
    tableSnapshots,
    crossSnapshots,
    annualClientRows: annualClientRows ? cleanRows(annualClientRows) : null,
    annualMesRows:    annualMesRows    ? cleanRows(annualMesRows)    : null,
  };
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

  const { measures, relationships, tableSnapshots, crossSnapshots, annualClientRows, annualMesRows } = snapshot;
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

  // Top clientes por ano
  if (annualClientRows?.length) {
    lines.push(`\n=== TOP CLIENTES POR ANO (top 20/ano) ===`);

    // Mapa de meses ativos: `${ano}|${cliente}` → Set de strings de mês
    const mesMap = new Map();
    if (annualMesRows?.length) {
      for (const row of annualMesRows) {
        const key = `${row.__ano}|${row.Cliente}`;
        if (!mesMap.has(key)) mesMap.set(key, new Set());
        mesMap.get(key).add(row.__mes);
      }
    }

    // Agrupa por ano (DAX já entrega ordenado por ano desc, faturamento desc)
    const byYear = new Map();
    for (const row of annualClientRows) {
      const ano = row.__ano;
      if (!byYear.has(ano)) byYear.set(ano, []);
      byYear.get(ano).push(row);
    }

    // Pega os 2 anos mais recentes presentes nos dados
    const years = [...byYear.keys()].sort((a, b) => b - a).slice(0, 2);

    for (const ano of years) {
      lines.push(`Ano ${ano}:`);
      const clients = byYear.get(ano).slice(0, 20);
      clients.forEach((row, idx) => {
        const fat = typeof row["Faturamento Anual"] === "number"
          ? `R$ ${row["Faturamento Anual"].toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : row["Faturamento Anual"];
        const mesesAtivos = mesMap.get(`${ano}|${row.Cliente}`)?.size ?? "?";
        lines.push(`  ${idx + 1}. ${row.Cliente} — ${fat} — ${mesesAtivos} meses — ${row.Registros} registros`);
      });
    }
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

// ── Query dinâmica (tool_use) ─────────────────────────────────────────────────

const ALLOWED_AGGREGATIONS = new Set(["SUM", "COUNT", "AVG", "MAX", "MIN"]);
const AGG_ITER = { SUM: "SUMX", COUNT: "COUNTX", AVG: "AVERAGEX", MAX: "MAXX", MIN: "MINX" };

/**
 * Valida os parâmetros do tool_use contra o knowledge.json do dashboard.
 * Retorna { valid: true } ou { valid: false, error: string }.
 */
function validateDynamicParams(params, knowledge) {
  if (!knowledge?.tables?.length) return { valid: false, error: "knowledge não disponível para este dashboard" };

  const { table, dimension, metric, date_column, aggregation, top_n } = params;

  // Tabela
  const tableObj = knowledge.tables.find((t) => t.name === table);
  if (!tableObj) {
    return { valid: false, error: `tabela '${table}' não encontrada no modelo` };
  }

  const colNames = new Set((tableObj.columns ?? []).map((c) => c.name));

  // Dimensão
  if (!colNames.has(dimension)) {
    return { valid: false, error: `coluna '${dimension}' não encontrada na tabela '${table}'` };
  }

  // Métrica
  if (!colNames.has(metric)) {
    return { valid: false, error: `coluna '${metric}' não encontrada na tabela '${table}'` };
  }

  // Coluna de data (opcional)
  if (date_column && !colNames.has(date_column)) {
    return { valid: false, error: `coluna de data '${date_column}' não encontrada na tabela '${table}'` };
  }

  // Agregação
  const agg = (aggregation ?? "SUM").toUpperCase();
  if (!ALLOWED_AGGREGATIONS.has(agg)) {
    return { valid: false, error: `agregação '${aggregation}' não permitida — use SUM, COUNT, AVG, MAX ou MIN` };
  }

  // topN
  if (top_n !== undefined && (typeof top_n !== "number" || top_n < 1)) {
    return { valid: false, error: `top_n inválido: deve ser número positivo` };
  }

  return { valid: true };
}

/**
 * Monta a DAX a partir de parâmetros estruturados (nunca aceita DAX livre).
 */
function buildDynamicDAX({ table, dimension, metric, aggregation, date_column, year, month, top_n }) {
  const topN  = Math.min(top_n ?? 10, 50);
  const agg   = (aggregation ?? "SUM").toUpperCase();
  const iterFn = AGG_ITER[agg] ?? "SUMX";

  // Filtro de período (opcional)
  const filterParts = [];
  if (date_column && year)  filterParts.push(`YEAR('${table}'[${date_column}]) = ${year}`);
  if (date_column && month) filterParts.push(`MONTH('${table}'[${date_column}]) = ${month}`);

  const sourceTable = filterParts.length
    ? `FILTER(\n        '${table}',\n        ${filterParts.join(" && ")}\n    )`
    : `'${table}'`;

  const valueExpr = `${iterFn}(CURRENTGROUP(), '${table}'[${metric}])`;

  return `EVALUATE
TOPN(
    ${topN},
    GROUPBY(
        ${sourceTable},
        '${table}'[${dimension}],
        "Valor", ${valueExpr}
    ),
    [Valor], DESC
)
ORDER BY [Valor] DESC`;
}

/**
 * Valida params, monta DAX, executa no Power BI e retorna os resultados.
 *
 * @param {string}      token       - Bearer token PBI
 * @param {string}      datasetId   - ID do dataset do dashboard atual
 * @param {string|null} workspaceId - Workspace do dashboard (null = My Workspace)
 * @param {object}      params      - Parâmetros estruturados vindos do Claude
 * @param {object}      knowledge   - knowledge.json do dashboard (para validação)
 * @returns {{ rows: object[]|null, dax: string|null, error: string|null }}
 */
export async function executeDynamicQuery(token, datasetId, workspaceId, params, knowledge) {
  // 1. Validação rígida
  const validation = validateDynamicParams(params, knowledge);
  if (!validation.valid) {
    return { rows: null, dax: null, error: validation.error };
  }

  // 2. Monta DAX via template
  const dax = buildDynamicDAX(params);
  console.log(`[tool_use] DAX gerada:\n${dax}`);

  // 3. Executa
  const base = workspaceId
    ? `${PBI_API}/groups/${workspaceId}/datasets/${datasetId}`
    : `${PBI_API}/datasets/${datasetId}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const rows = await runDAX(base, headers, dax, 15000, "dynamic");

  if (!rows) {
    return { rows: null, dax, error: "Query não retornou dados (possível erro DAX ou dataset indisponível)" };
  }

  const cleaned = cleanRows(rows);
  console.log(`[tool_use] resultado: ${cleaned.length} linhas`);
  return { rows: cleaned, dax, error: null };
}
