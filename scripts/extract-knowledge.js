#!/usr/bin/env node
/**
 * extract-knowledge.js
 *
 * Lê a estrutura do PBIP (SemanticModel + Report) e gera:
 *   powerbi/knowledge/acoes-de-conteudo.knowledge.json
 *
 * Uso (na raiz do projeto):
 *   node scripts/extract-knowledge.js
 *
 * Sem dependências externas — usa apenas Node.js nativo.
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SEMANTIC_DIR = path.join(ROOT, "powerbi/Ações de Conteúdo.SemanticModel/definition");
const REPORT_DIR   = path.join(ROOT, "powerbi/Ações de Conteúdo.Report/definition");
const OUT_DIR      = path.join(ROOT, "powerbi/knowledge");
const OUT_FILE     = path.join(OUT_DIR, "acoes-de-conteudo.knowledge.json");

// Tabelas geradas automaticamente pelo Power BI — ignorar
const SYSTEM_TABLE_PREFIXES = ["DateTableTemplate_", "LocalDateTable_"];

// ── Helpers ───────────────────────────────────────────────────────────────────

const read     = (p) => fs.readFileSync(p, "utf8");
const readJson = (p) => JSON.parse(read(p));

/** Dado um valor TMDL (após ":"), limpa espaços e aspas externas opcionais. */
function cleanVal(v) {
  return v.trim().replace(/^"(.*)"$/, "$1").trim();
}

// ── TMDL Parser ───────────────────────────────────────────────────────────────

/**
 * Parseia um arquivo .tmdl de tabela.
 * Retorna { name, columns, measures, dataSource }
 *
 * Formato TMDL (indentação com TAB):
 *   table <nome>               ← nível 0
 *     column '<nome>'          ← nível 1 (\t)
 *       dataType: ...          ← nível 2 (\t\t)
 *     measure '<nome>' = <expr>
 *       formatString: ...
 *     partition ... = m
 *       source = ```
 *         let ... in ...
 *         ```
 */
function parseTmdlTable(filePath) {
  const raw   = read(filePath);
  const lines = raw.split(/\r?\n/);
  const result = { name: null, columns: [], measures: [], dataSource: null };

  // Linha 0: "table <nome>"
  const nameMatch = lines[0].match(/^table (.+)/);
  if (!nameMatch) return result;
  result.name = nameMatch[1].trim();

  // Extrai URL de fonte de dados da partition M (opcional)
  const gsMatch = raw.match(/GoogleSheets\.Contents\("([^"]+)"\)/);
  if (gsMatch) {
    result.dataSource = { type: "GoogleSheets", url: gsMatch[1] };
  }

  /**
   * Verifica se a linha representa um novo item direto da tabela (nível \t).
   * Usada para saber quando um bloco column/measure termina.
   */
  function isTableLevelLine(l) {
    return /^\t[^\t\r\n]/.test(l) && l.trim().length > 0;
  }

  let i = 1;
  while (i < lines.length) {
    const line = lines[i];

    // ── Coluna ────────────────────────────────────────────────────────────────
    // "\tcolumn '<nome com espaço>'" ou "\tcolumn <nome>"
    const colQuoted   = line.match(/^\tcolumn '([^']+)'\s*$/);
    const colUnquoted = line.match(/^\tcolumn (\S+)\s*$/);
    const colMatch    = colQuoted || colUnquoted;

    if (colMatch) {
      const col = {
        name:        colMatch[1].trim(),
        dataType:    "string",
        formatString: null,
        summarizeBy: null,
      };
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (isTableLevelLine(l)) break;           // próximo item da tabela
        if (/^\t\t[^\t]/.test(l)) {               // propriedade do column (\t\t)
          const kv = l.trim().match(/^(dataType|formatString|summarizeBy):\s*(.+)/);
          if (kv) {
            if (kv[1] === "dataType")     col.dataType     = cleanVal(kv[2]);
            if (kv[1] === "formatString") col.formatString = cleanVal(kv[2]);
            if (kv[1] === "summarizeBy")  col.summarizeBy  = cleanVal(kv[2]);
          }
        }
        i++;
      }
      // Ignora colunas geradas internamente (ex: coluna placeholder da tabela Medidas)
      if (!col.name.startsWith("[")) {
        result.columns.push(col);
      }
      continue;
    }

    // ── Medida ────────────────────────────────────────────────────────────────
    // "\tmeasure '<nome>' = <expressão>" ou "\tmeasure <nome> = <expressão>"
    const measureMatch =
      line.match(/^\tmeasure '([^']+)'\s*=\s*(.+)/) ||
      line.match(/^\tmeasure (\S+)\s*=\s*(.+)/);

    if (measureMatch) {
      const m = {
        name:         measureMatch[1].trim(),
        expression:   measureMatch[2].trim(),
        formatString: null,
      };
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (isTableLevelLine(l)) break;
        if (/^\t\t[^\t]/.test(l)) {
          const fmtMatch = l.trim().match(/^formatString:\s*(.+)/);
          if (fmtMatch) m.formatString = cleanVal(fmtMatch[1]);
        }
        i++;
      }
      result.measures.push(m);
      continue;
    }

    i++;
  }

  return result;
}

// ── Parse relationships.tmdl ──────────────────────────────────────────────────

/**
 * Formato:
 *   relationship <uuid>
 *     joinOnDateBehavior: datePartOnly
 *     fromColumn: <tabela>.<coluna>
 *     toColumn: <tabela>.<coluna>
 */
function parseRelationships(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const lines = read(filePath).split(/\r?\n/);
  const rels  = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].startsWith("relationship ")) {
      const rel = {
        fromTable: null, fromColumn: null,
        toTable:   null, toColumn:   null,
        joinOnDateBehavior: null,
      };
      i++;
      while (i < lines.length && lines[i].startsWith("\t")) {
        const prop = lines[i].trim();

        const fromMatch = prop.match(/^fromColumn:\s*([^.]+)\.(.+)/);
        const toMatch   = prop.match(/^toColumn:\s*([^.]+)\.(.+)/);
        const behMatch  = prop.match(/^joinOnDateBehavior:\s*(.+)/);

        if (fromMatch) { rel.fromTable = fromMatch[1].trim(); rel.fromColumn = fromMatch[2].trim(); }
        if (toMatch)   { rel.toTable   = toMatch[1].trim();   rel.toColumn   = toMatch[2].trim(); }
        if (behMatch)  { rel.joinOnDateBehavior = behMatch[1].trim(); }
        i++;
      }
      rels.push(rel);
      continue;
    }
    i++;
  }

  return rels;
}

// ── Parse Report pages ────────────────────────────────────────────────────────

/**
 * Lê pages/pages.json (ordem) + cada pages/<id>/page.json (nome, visibilidade).
 */
function parsePages(reportDir) {
  const pagesMetaFile = path.join(reportDir, "pages/pages.json");
  if (!fs.existsSync(pagesMetaFile)) return [];

  const { pageOrder = [] } = readJson(pagesMetaFile);

  return pageOrder.map((pageId, idx) => {
    const pageFile = path.join(reportDir, `pages/${pageId}/page.json`);
    if (!fs.existsSync(pageFile)) {
      return { order: idx + 1, id: pageId, name: pageId, hidden: false };
    }
    const p = readJson(pageFile);
    // visibility === 0 ou undefined → visível; qualquer outro valor → oculta
    const hidden = p.visibility !== undefined && p.visibility !== 0;
    return {
      order:  idx + 1,
      id:     pageId,
      name:   p.displayName ?? pageId,
      hidden,
    };
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  console.log("📖 Lendo PBIP — Ações de Conteúdo\n");

  // ── 1. Tabelas ──────────────────────────────────────────────────────────────
  const tablesDir  = path.join(SEMANTIC_DIR, "tables");
  const tmdlFiles  = fs.readdirSync(tablesDir).filter((f) => f.endsWith(".tmdl"));

  const factTables = [];
  const allMeasures = [];
  let dataSource = null;

  for (const file of tmdlFiles) {
    const tableData = parseTmdlTable(path.join(tablesDir, file));
    if (!tableData.name) continue;

    // Pula tabelas de sistema
    if (SYSTEM_TABLE_PREFIXES.some((p) => tableData.name.startsWith(p))) {
      console.log(`  ⏭️  Sistema (ignorado): ${tableData.name}`);
      continue;
    }

    // Medidas DAX
    for (const m of tableData.measures) {
      allMeasures.push({ name: m.name, table: tableData.name, expression: m.expression, formatString: m.formatString });
    }

    // Tabela de fatos/dimensões reais (não é só placeholder de medidas)
    const hasRealColumns = tableData.columns.some((c) => c.name !== "Column");
    if (hasRealColumns) {
      if (tableData.dataSource) dataSource = tableData.dataSource;
      factTables.push({
        name:      tableData.name,
        columns:   tableData.columns,
      });
      console.log(
        `  📊 ${tableData.name}: ${tableData.columns.length} colunas` +
        (tableData.measures.length ? `, ${tableData.measures.length} medidas` : "")
      );
      for (const c of tableData.columns) {
        console.log(`      ↳ ${c.name.padEnd(28)} [${c.dataType}]${c.formatString ? ` fmt:"${c.formatString}"` : ""}`);
      }
    } else {
      console.log(`  📐 ${tableData.name}: tabela de medidas (${tableData.measures.length} medidas)`);
    }
    for (const m of tableData.measures) {
      console.log(`      ↳ [medida] ${m.name} = ${m.expression.slice(0, 70)}${m.expression.length > 70 ? "…" : ""}`);
    }
  }

  // ── 2. Relacionamentos ──────────────────────────────────────────────────────
  const relationships = parseRelationships(path.join(SEMANTIC_DIR, "relationships.tmdl"));
  console.log(`\n  🔗 Relacionamentos: ${relationships.length}`);
  for (const r of relationships) {
    console.log(`      ${r.fromTable}[${r.fromColumn}] → ${r.toTable}[${r.toColumn}]${r.joinOnDateBehavior ? ` (${r.joinOnDateBehavior})` : ""}`);
  }

  // ── 3. Páginas ──────────────────────────────────────────────────────────────
  const pages = parsePages(REPORT_DIR);
  const visiblePages = pages.filter((p) => !p.hidden);
  const hiddenPages  = pages.filter((p) => p.hidden);
  console.log(`\n  📄 Páginas: ${pages.length} total (${visiblePages.length} visíveis, ${hiddenPages.length} ocultas)`);
  for (const p of pages) {
    console.log(`      ${p.hidden ? "🙈" : "👁️ "} ${String(p.order).padStart(2)}. ${p.name}`);
  }

  // ── 4. Monta knowledge.json ─────────────────────────────────────────────────
  const knowledge = {
    dashboardName: "Ações de Conteúdo",
    generatedAt:   new Date().toISOString(),

    // Fonte de dados
    dataSource: dataSource
      ? { ...dataSource, notes: "Filtrado por ORIGEM = GLOBO | LOCAL" }
      : null,

    // Tabelas com colunas (ex: fatAConteudo)
    tables: factTables,

    // Medidas DAX (de todas as tabelas)
    measures: allMeasures,

    // Relacionamentos entre tabelas
    relationships,

    // Páginas do relatório (em ordem de exibição)
    pages,
  };

  // ── 5. Grava arquivo ────────────────────────────────────────────────────────
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(knowledge, null, 2), "utf8");

  const sizeKB = (fs.statSync(OUT_FILE).size / 1024).toFixed(1);
  console.log("\n" + "─".repeat(60));
  console.log(`✅ Gerado: powerbi/knowledge/acoes-de-conteudo.knowledge.json`);
  console.log(`   Tamanho : ${sizeKB} KB`);
  console.log(`   Tabelas : ${factTables.length}`);
  console.log(`   Colunas : ${factTables.reduce((s, t) => s + t.columns.length, 0)}`);
  console.log(`   Medidas : ${allMeasures.length}`);
  console.log(`   Relac.  : ${relationships.length}`);
  console.log(`   Páginas : ${pages.length} (${visiblePages.length} visíveis)`);
  console.log("─".repeat(60));
}

main();
