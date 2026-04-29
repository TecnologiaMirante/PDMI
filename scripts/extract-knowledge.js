#!/usr/bin/env node
/**
 * extract-knowledge.js
 *
 * Lê a estrutura do PBIP local (SemanticModel + Report) e gera:
 *   powerbi/knowledge/acoes-de-conteudo.knowledge.json
 *
 * Uso (na raiz do projeto):
 *   node scripts/extract-knowledge.js
 *
 * Para múltiplos dashboards via servidor de rede, use:
 *   node scripts/extract-portal-knowledge.js
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { extractKnowledge } from "./_pbip-parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SEMANTIC_DIR = path.join(ROOT, "powerbi/Ações de Conteúdo.SemanticModel/definition");
const REPORT_DIR   = path.join(ROOT, "powerbi/Ações de Conteúdo.Report/definition");
const OUT_DIR      = path.join(ROOT, "powerbi/knowledge");
const OUT_FILE     = path.join(OUT_DIR, "acoes-de-conteudo.knowledge.json");

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  console.log("📖 Lendo PBIP — Ações de Conteúdo\n");

  const knowledge = extractKnowledge(SEMANTIC_DIR, REPORT_DIR, "Ações de Conteúdo");

  // Log detalhado por tabela
  for (const table of knowledge.tables) {
    console.log(`  📊 ${table.name}: ${table.columns.length} colunas`);
    for (const c of table.columns) {
      console.log(`      ↳ ${c.name.padEnd(28)} [${c.dataType}]${c.formatString ? ` fmt:"${c.formatString}"` : ""}`);
    }
  }
  for (const m of knowledge.measures) {
    console.log(`  📐 [medida] ${m.name} = ${m.expression.slice(0, 70)}${m.expression.length > 70 ? "…" : ""}`);
  }
  console.log(`\n  🔗 Relacionamentos: ${knowledge.relationships.length}`);
  for (const r of knowledge.relationships) {
    console.log(`      ${r.fromTable}[${r.fromColumn}] → ${r.toTable}[${r.toColumn}]`);
  }
  const visible = knowledge.pages.filter((p) => !p.hidden);
  const hidden  = knowledge.pages.filter((p) =>  p.hidden);
  console.log(`\n  📄 Páginas: ${knowledge.pages.length} (${visible.length} visíveis, ${hidden.length} ocultas)`);
  for (const p of knowledge.pages) {
    console.log(`      ${p.hidden ? "🙈" : "👁️ "} ${String(p.order).padStart(2)}. ${p.name}`);
  }

  // Grava arquivo
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(knowledge, null, 2), "utf8");

  const sizeKB = (fs.statSync(OUT_FILE).size / 1024).toFixed(1);
  const cols   = knowledge.tables.reduce((s, t) => s + t.columns.length, 0);

  console.log("\n" + "─".repeat(60));
  console.log(`✅ Gerado: powerbi/knowledge/acoes-de-conteudo.knowledge.json`);
  console.log(`   Tamanho : ${sizeKB} KB`);
  console.log(`   Tabelas : ${knowledge.tables.length} | Colunas : ${cols}`);
  console.log(`   Medidas : ${knowledge.measures.length} | Relac. : ${knowledge.relationships.length}`);
  console.log(`   Páginas : ${knowledge.pages.length} (${visible.length} visíveis)`);
  console.log("─".repeat(60));
}

main();
