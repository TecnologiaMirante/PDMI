#!/usr/bin/env node
/**
 * audit-pbip-extraction.js
 *
 * Lê powerbi/knowledge/index.json e, para cada dashboard,
 * compara o que está no disco (arquivos .tmdl, pages.json)
 * com o que foi extraído no knowledge.json.
 *
 * Uso (na raiz do projeto):
 *   node scripts/audit-pbip-extraction.js
 *   node scripts/audit-pbip-extraction.js --only <dashboardId>
 *   node scripts/audit-pbip-extraction.js --verbose
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, "..");

// ── CLI args ──────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const VERBOSE  = args.includes("--verbose");
const ONLY_IDX = args.indexOf("--only");
const ONLY_ID  = ONLY_IDX !== -1 ? args[ONLY_IDX + 1] : null;

// ── Prefixos de tabelas de sistema (mesmo critério do parser) ─────────────────

const SYSTEM_PREFIXES = ["DateTableTemplate_", "LocalDateTable_"];

function isSystemTable(filename) {
  const base = path.basename(filename, ".tmdl");
  return SYSTEM_PREFIXES.some((p) => base.startsWith(p));
}

function isMeasuresTable(filename) {
  const base = path.basename(filename, ".tmdl").toLowerCase();
  return base === "medidas" || base === "_medidas" || base.startsWith("medidas") || base.endsWith("medidas");
}

/**
 * Verifica se um .tmdl "real" possui ao menos uma coluna sem isNameInferred.
 * Tabelas com apenas colunas inferidas (ex: dimCalendar com coluna placeholder)
 * são descartadas pelo parser — não devem contar como "faltando" na auditoria.
 */
function tmdlHasRealColumns(filePath) {
  try {
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    let i = 0;
    while (i < lines.length) {
      if (/^\tcolumn /.test(lines[i])) {
        let inferred = false;
        i++;
        // Lê propriedades da coluna (nível \t\t) até próximo item de nível \t
        while (i < lines.length && !/^\t[^\t]/.test(lines[i])) {
          if (lines[i].trim() === "isNameInferred") inferred = true;
          i++;
        }
        if (!inferred) return true; // ao menos uma coluna real encontrada
        continue;
      }
      i++;
    }
    return false; // todas as colunas são inferred (ou não há colunas)
  } catch {
    return true; // não conseguiu ler → assume que é real
  }
}

// ── Contagem de páginas no disco ──────────────────────────────────────────────

function countPagesOnDisk(reportPath) {
  if (!reportPath) return { total: 0, note: "reportPath ausente" };

  const pagesJson = path.join(reportPath, "pages", "pages.json");
  if (!fs.existsSync(pagesJson)) return { total: 0, note: "pages.json não encontrado" };

  try {
    const { pageOrder = [] } = JSON.parse(fs.readFileSync(pagesJson, "utf8"));
    return { total: pageOrder.length, note: null };
  } catch (e) {
    return { total: 0, note: `erro ao ler pages.json: ${e.message}` };
  }
}

// ── Leitura do knowledge.json ─────────────────────────────────────────────────

function loadKnowledge(knowledgeDir, knowledgeFile) {
  const file = path.join(knowledgeDir, knowledgeFile);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

// ── Auditoria de um dashboard ─────────────────────────────────────────────────

function auditDashboard(entry, knowledgeDir) {
  const result = {
    dashboardId:   entry.dashboardId,
    dashboardName: entry.dashboardName ?? "(sem nome)",
    // disco
    tmdlTotal:       0,
    tmdlSystem:      0,
    tmdlMeasures:    0,
    tmdlReal:        0,
    tmdlPlaceholder: 0, // real mas sem colunas extraíveis (ex: dimCalendar c/ isNameInferred)
    hasMeasuresFile: false,
    pagesOnDisk:   0,
    pagesNote:     null,
    // knowledge
    extractedTables:    0,
    extractedColumns:   0,
    extractedMeasures:  0,
    extractedPages:     0,
    knowledgeLoaded:    false,
    // suspeitos
    flags:  [],
    status: "OK",
  };

  // ── Scan dos .tmdl no disco ───────────────────────────────────────────────

  const tablesDir = entry.semanticModelPath
    ? path.join(entry.semanticModelPath, "tables")
    : null;

  if (!tablesDir) {
    result.flags.push("semanticModelPath ausente no index.json");
  } else if (!fs.existsSync(tablesDir)) {
    result.flags.push("pasta tables/ não encontrada no disco");
  } else {
    let entries;
    try { entries = fs.readdirSync(tablesDir).filter((f) => f.endsWith(".tmdl")); }
    catch (e) { entries = []; result.flags.push(`erro ao ler tables/: ${e.message}`); }

    result.tmdlTotal = entries.length;

    for (const f of entries) {
      if (isSystemTable(f)) {
        result.tmdlSystem++;
      } else if (isMeasuresTable(f)) {
        result.tmdlMeasures++;
        result.hasMeasuresFile = true;
      } else {
        result.tmdlReal++;
        // Verifica se a tabela tem colunas extraíveis pelo parser
        const filePath = path.join(tablesDir, f);
        if (!tmdlHasRealColumns(filePath)) result.tmdlPlaceholder++;
      }
    }

    if (VERBOSE && entries.length) {
      result._tmdlFiles = entries;
    }
  }

  // ── Páginas no disco ──────────────────────────────────────────────────────

  const { total: pagesOnDisk, note: pagesNote } = countPagesOnDisk(entry.reportPath ?? null);
  result.pagesOnDisk = pagesOnDisk;
  result.pagesNote   = pagesNote;

  // ── knowledge.json ────────────────────────────────────────────────────────

  if (entry.knowledgeFile) {
    const knowledge = loadKnowledge(knowledgeDir, entry.knowledgeFile);
    if (knowledge) {
      result.knowledgeLoaded   = true;
      result.extractedTables   = knowledge.tables?.length ?? 0;
      result.extractedColumns  = (knowledge.tables ?? []).reduce((s, t) => s + (t.columns?.length ?? 0), 0);
      result.extractedMeasures = knowledge.measures?.length ?? 0;
      result.extractedPages    = knowledge.pages?.length ?? 0;
    } else {
      result.flags.push(`knowledge.json não encontrado: ${entry.knowledgeFile}`);
    }
  } else {
    result.flags.push("knowledgeFile ausente no index.json");
  }

  // ── Regras de suspeição ───────────────────────────────────────────────────

  if (result.tmdlReal > 0 && result.extractedTables === 0) {
    result.flags.push(`${result.tmdlReal} tmdl real(is) no disco, mas 0 tabelas extraídas`);
  }

  if (result.hasMeasuresFile && result.extractedMeasures === 0) {
    result.flags.push("arquivo de medidas existe, mas 0 medidas extraídas");
  }

  // Compara apenas as tabelas "efetivamente extraíveis" (real − placeholder)
  // Placeholder = tabelas reais cujas colunas são todas isNameInferred (ex: dimCalendar)
  const tmdlEffective = result.tmdlReal - result.tmdlPlaceholder;
  if (tmdlEffective >= 2 && result.extractedTables < tmdlEffective) {
    result.flags.push(`${tmdlEffective} tmdl extraíveis no disco, mas só ${result.extractedTables} tabela(s) extraída(s) — possível parse parcial`);
  }
  if (result.tmdlPlaceholder > 0 && VERBOSE) {
    result.flags.push(`${result.tmdlPlaceholder} tabela(s) com apenas colunas isNameInferred — ignoradas pelo parser (esperado)`);
  }

  if (result.pagesOnDisk > 0 && result.extractedPages === 0) {
    result.flags.push(`${result.pagesOnDisk} página(s) no disco, mas 0 extraídas`);
  }

  if (result.pagesOnDisk > 0 && result.extractedPages > 0 && result.extractedPages < result.pagesOnDisk) {
    result.flags.push(`disco: ${result.pagesOnDisk} páginas · extraídas: ${result.extractedPages} — discrepância`);
  }

  // flags de infraestrutura (sem tmdl, sem pages) não são necessariamente suspeitos
  // — mas qualquer flag vira SUSPEITO
  if (result.flags.length > 0) result.status = "SUSPEITO";

  return result;
}

// ── Formatação da tabela de saída ─────────────────────────────────────────────

function pad(str, len, right = false) {
  const s = String(str ?? "");
  return right
    ? s.slice(0, len).padStart(len)
    : s.slice(0, len).padEnd(len);
}

function printTable(results) {
  const NAME_W = 28;
  const NUM_W  = 5;

  const header =
    pad("Dashboard", NAME_W) + " " +
    pad("tmdl", NUM_W, true) + " " +
    pad("sis",  NUM_W, true) + " " +
    pad("med",  NUM_W, true) + " " +
    pad("real", NUM_W, true) + " │ " +
    pad("tabs", NUM_W, true) + " " +
    pad("cols", NUM_W, true) + " " +
    pad("meds", NUM_W, true) + " " +
    pad("pgs",  NUM_W, true) + " │ " +
    "status";

  const sep = "─".repeat(header.length);

  console.log(header);
  console.log(sep);

  for (const r of results) {
    const statusLabel = r.status === "OK"
      ? "✅ OK"
      : `⚠️  SUSPEITO`;

    const row =
      pad(r.dashboardName, NAME_W) + " " +
      pad(r.tmdlTotal,     NUM_W, true) + " " +
      pad(r.tmdlSystem,    NUM_W, true) + " " +
      pad(r.tmdlMeasures,  NUM_W, true) + " " +
      pad(r.tmdlReal,      NUM_W, true) + " │ " +
      pad(r.extractedTables,   NUM_W, true) + " " +
      pad(r.extractedColumns,  NUM_W, true) + " " +
      pad(r.extractedMeasures, NUM_W, true) + " " +
      pad(r.extractedPages,    NUM_W, true) + " │ " +
      statusLabel;

    console.log(row);

    if (VERBOSE && r._tmdlFiles?.length) {
      for (const f of r._tmdlFiles) {
        const tag = isSystemTable(f) ? "[sis]" : isMeasuresTable(f) ? "[med]" : "[real]";
        console.log(`  ${"".padEnd(NAME_W - 2)}${tag}  ${f}`);
      }
    }
  }

  console.log(sep);
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const indexFile    = path.join(ROOT, "powerbi/knowledge/index.json");
  const knowledgeDir = path.join(ROOT, "powerbi/knowledge");

  if (!fs.existsSync(indexFile)) {
    console.error(`\n❌ index.json não encontrado: ${indexFile}`);
    console.error("   Rode primeiro: node scripts/extract-portal-knowledge.js\n");
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
  let dashboards = index.dashboards ?? [];

  if (ONLY_ID) {
    dashboards = dashboards.filter((d) => d.dashboardId === ONLY_ID);
    if (!dashboards.length) {
      console.error(`\n❌ dashboardId não encontrado no index.json: ${ONLY_ID}\n`);
      process.exit(1);
    }
  }

  console.log("\n" + "═".repeat(74));
  console.log(` audit-pbip-extraction  —  ${dashboards.length} dashboard(s)${VERBOSE ? "  [verbose]" : ""}${ONLY_ID ? `  [only: ${ONLY_ID}]` : ""}`);
  console.log("═".repeat(74) + "\n");

  console.log("Legenda colunas:");
  console.log("  tmdl=total .tmdl  sis=sistema  med=medidas  real=tabelas reais");
  console.log("  tabs=tabelas extraídas  cols=colunas  meds=medidas  pgs=páginas\n");

  const results = dashboards.map((entry) => auditDashboard(entry, knowledgeDir));

  printTable(results);

  // ── Resumo ────────────────────────────────────────────────────────────────

  const ok        = results.filter((r) => r.status === "OK");
  const suspeitos = results.filter((r) => r.status === "SUSPEITO");

  console.log(`\nResultado: ${ok.length} OK · ${suspeitos.length} SUSPEITO(S)\n`);

  if (suspeitos.length > 0) {
    console.log("SUSPEITOS — detalhes:");
    for (const r of suspeitos) {
      console.log(`\n  ⚠️  ${r.dashboardName} (${r.dashboardId})`);
      for (const flag of r.flags) {
        console.log(`       ✗ ${flag}`);
      }
      if (r.pagesNote) {
        console.log(`       ℹ️  páginas: ${r.pagesNote}`);
      }
    }
    console.log();
  }

  console.log("═".repeat(74) + "\n");

  if (suspeitos.length > 0) process.exit(1);
}

main();
