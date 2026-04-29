/**
 * _pbip-parser.js
 *
 * Funções de parse de arquivos PBIP (TMDL + Report JSON).
 * Usadas por extract-knowledge.js e extract-portal-knowledge.js.
 *
 * Sem dependências externas — apenas Node.js nativo.
 */

import fs   from "fs";
import path from "path";

// ── Helpers internos ──────────────────────────────────────────────────────────

const read     = (p) => fs.readFileSync(p, "utf8");
const readJson = (p) => JSON.parse(read(p));

function cleanVal(v) {
  return v.trim().replace(/^"(.*)"$/, "$1").trim();
}

// Tabelas auto-geradas pelo Power BI — ignorar
const SYSTEM_TABLE_PREFIXES = ["DateTableTemplate_", "LocalDateTable_"];

// ── parseTmdlTable ────────────────────────────────────────────────────────────

/**
 * Parseia um arquivo .tmdl de tabela.
 * @returns {{ name, columns, measures, dataSource }}
 *
 * Correções aplicadas:
 *   Bug 1 — arquivos com /// doc comments antes de "table Name" (ex: RD Station 3.0)
 *            o parser buscava apenas lines[0]; agora varre até 15 linhas.
 *   Bug 2 — colunas calculadas com expressão DAX inline (ex: column Status = SWITCH(...))
 *            a regex exigia fim-de-linha após o nome; agora aceita = e expressão opcionais.
 *            Também detecta isNameInferred para ignorar colunas placeholder (_Medidas._).
 *   Bug 3 — medidas com expressão multi-linha (ex: measure 'X' =\n\t\t\tCALCULATE(...))
 *            a regex exigia expressão na mesma linha; agora captura também os casos
 *            em que a expressão começa na próxima linha (\t\t\t nível).
 */
export function parseTmdlTable(filePath) {
  const raw   = read(filePath);
  const lines = raw.split(/\r?\n/);
  const result = { name: null, columns: [], measures: [], dataSource: null };

  // ── BUG 1 FIX: localiza "table Name" em até 15 linhas (pula /// doc comments) ──
  let tableLineIdx = -1;
  for (let t = 0; t < Math.min(lines.length, 15); t++) {
    if (/^table /.test(lines[t])) { tableLineIdx = t; break; }
  }
  if (tableLineIdx === -1) return result;
  result.name = lines[tableLineIdx].replace(/^table\s+/, "").trim();

  // Detecta fonte de dados a partir do código M da partition
  const gsMatch = raw.match(/GoogleSheets\.Contents\("([^"]+)"\)/);
  if (gsMatch) result.dataSource = { type: "GoogleSheets", url: gsMatch[1] };

  // Linha no nível direto da tabela (\t sem segundo \t)
  const isTableLevel = (l) => /^\t[^\t\r\n]/.test(l) && l.trim().length > 0;

  let i = tableLineIdx + 1;
  while (i < lines.length) {
    const line = lines[i];

    // ── BUG 2 FIX: aceita column 'Nome' e column Nome com ou sem = expr ──────
    // Quoted first (handles names with spaces); unquoted after.
    // [^\s']+ evita consumir aspas ou espaços no caso não-quoted.
    const colMatch =
      line.match(/^\tcolumn '([^']+)'/) ||
      line.match(/^\tcolumn ([^\s'=]+)/);

    if (colMatch) {
      const col = {
        name: colMatch[1].trim(),
        dataType: "string",
        formatString: null,
        summarizeBy: null,
        _isNameInferred: false,
      };
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (isTableLevel(l)) break;
        if (/^\t\t[^\t]/.test(l)) {
          const kv = l.trim().match(/^(dataType|formatString|summarizeBy):\s*(.+)/);
          if (kv) {
            if (kv[1] === "dataType")     col.dataType     = cleanVal(kv[2]);
            if (kv[1] === "formatString") col.formatString = cleanVal(kv[2]);
            if (kv[1] === "summarizeBy")  col.summarizeBy  = cleanVal(kv[2]);
          }
          // BUG 2 FIX (suplementar): isNameInferred indica coluna placeholder gerada
          if (l.trim() === "isNameInferred") col._isNameInferred = true;
        }
        i++;
      }
      // Ignora: placeholder [Column] (tabela Medidas antiga), _ com isNameInferred
      if (!col.name.startsWith("[") && !col._isNameInferred) {
        const { _isNameInferred: _, ...colClean } = col;
        result.columns.push(colClean);
      }
      continue;
    }

    // ── BUG 3 FIX: aceita measure com expressão na mesma linha OU multi-linha ──
    // Captura o nome em [1] e a expressão (quando existe) em [2].
    const measureMatch =
      line.match(/^\tmeasure '([^']+)'\s*=\s*(.+)/) ||
      line.match(/^\tmeasure (\S+)\s*=\s*(.+)/)     ||
      line.match(/^\tmeasure '([^']+)'\s*=\s*$/)    ||   // multi-linha: nada após =
      line.match(/^\tmeasure (\S+)\s*=\s*$/);              // multi-linha: nada após =

    if (measureMatch) {
      const m = {
        name:         measureMatch[1].trim(),
        expression:   (measureMatch[2] ?? "").trim(),
        formatString: null,
      };
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (isTableLevel(l)) break;
        // BUG 3 FIX: expressão começa na próxima linha (\t\t\t nível, 3 tabs)
        if (!m.expression && /^\t\t\t/.test(l) && l.trim().length > 0) {
          m.expression = l.trim().slice(0, 200); // primeira linha da expressão, cap 200
        }
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

// ── parseRelationships ────────────────────────────────────────────────────────

/**
 * Parseia relationships.tmdl.
 * @returns {Array<{ fromTable, fromColumn, toTable, toColumn, joinOnDateBehavior }>}
 */
export function parseRelationships(filePath) {
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
        const prop      = lines[i].trim();
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

// ── parsePages ────────────────────────────────────────────────────────────────

/**
 * Lê pages/pages.json + cada page.json dentro do reportDir.
 * @param {string|null} reportDir — caminho para .Report/definition/; null → []
 * @returns {Array<{ order, id, name, hidden }>}
 */
export function parsePages(reportDir) {
  if (!reportDir) return [];

  const pagesMetaFile = path.join(reportDir, "pages/pages.json");
  if (!fs.existsSync(pagesMetaFile)) return [];

  const { pageOrder = [] } = readJson(pagesMetaFile);

  return pageOrder.map((pageId, idx) => {
    const pageFile = path.join(reportDir, `pages/${pageId}/page.json`);
    if (!fs.existsSync(pageFile)) return { order: idx + 1, id: pageId, name: pageId, hidden: false };

    const p      = readJson(pageFile);
    const hidden = p.visibility !== undefined && p.visibility !== 0;
    return { order: idx + 1, id: pageId, name: p.displayName ?? pageId, hidden };
  });
}

// ── extractKnowledge ──────────────────────────────────────────────────────────

/**
 * Orquestra a extração completa de um PBIP.
 *
 * @param {string}      semanticModelDir  — caminho para .SemanticModel/definition/
 * @param {string|null} reportDir         — caminho para .Report/definition/ (ou null)
 * @param {string}      dashboardName     — nome do dashboard (vai pro JSON)
 * @returns {object} knowledge object (sem escrever nada em disco)
 */
export function extractKnowledge(semanticModelDir, reportDir, dashboardName) {
  const tablesDir  = path.join(semanticModelDir, "tables");
  const tmdlFiles  = fs.existsSync(tablesDir)
    ? fs.readdirSync(tablesDir).filter((f) => f.endsWith(".tmdl"))
    : [];

  const factTables  = [];
  const allMeasures = [];
  let   dataSource  = null;

  for (const file of tmdlFiles) {
    const tableData = parseTmdlTable(path.join(tablesDir, file));
    if (!tableData.name) continue;
    if (SYSTEM_TABLE_PREFIXES.some((p) => tableData.name.startsWith(p))) continue;

    // Medidas (de qualquer tabela, incluindo "Medidas")
    for (const m of tableData.measures) {
      allMeasures.push({
        name:         m.name,
        table:        tableData.name,
        expression:   m.expression,
        formatString: m.formatString,
      });
    }

    // Só inclui tabelas com colunas reais (não o placeholder da tabela Medidas)
    const hasRealColumns = tableData.columns.some((c) => c.name !== "Column");
    if (hasRealColumns) {
      if (tableData.dataSource) dataSource = tableData.dataSource;
      factTables.push({ name: tableData.name, columns: tableData.columns });
    }
  }

  const relFile       = path.join(semanticModelDir, "relationships.tmdl");
  const relationships = parseRelationships(relFile);
  const pages         = parsePages(reportDir);

  return {
    dashboardName,
    generatedAt: new Date().toISOString(),
    dataSource:  dataSource ?? null,
    tables:      factTables,
    measures:    allMeasures,
    relationships,
    pages,
  };
}
