#!/usr/bin/env node
/**
 * extract-portal-knowledge.js
 *
 * Lê os dashboards cadastrados no PDMI (Firestore) e extrai conhecimento
 * estrutural de cada PBIP encontrado no servidor de rede.
 *
 * Uso (na raiz do projeto):
 *   node scripts/extract-portal-knowledge.js --dry-run
 *   node scripts/extract-portal-knowledge.js --only <dashboardId>
 *   node scripts/extract-portal-knowledge.js
 *
 * Variáveis de ambiente (.env):
 *   POWERBI_SOURCE_ROOT            Caminho raiz dos BIs no servidor (UNC ou local)
 *   FIREBASE_SERVICE_ACCOUNT_PATH  Caminho para o JSON da service account Firebase
 *   VITE_FIREBASE_PROJECT_ID       ID do projeto Firebase
 */

import { config as loadEnv } from "dotenv";
import { fileURLToPath }     from "url";
import path                  from "path";
import fs                    from "fs";
import { createRequire }     from "module";

import { extractKnowledge }  from "./_pbip-parser.js";

// ── Paths ─────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, "..");

// ── Env ───────────────────────────────────────────────────────────────────────

loadEnv({ path: path.join(ROOT, ".env") });

const SOURCE_ROOT           = process.env.POWERBI_SOURCE_ROOT;
const SERVICE_ACCOUNT_PATH  = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const OUT_DIR               = path.join(ROOT, "powerbi/knowledge");

// ── CLI args ──────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const DRY_RUN  = args.includes("--dry-run");
const ONLY_IDX = args.indexOf("--only");
const ONLY_ID  = ONLY_IDX !== -1 ? args[ONLY_IDX + 1] : null;

// ── Validação de env ──────────────────────────────────────────────────────────

function validateEnv() {
  const missing = [];
  if (!SOURCE_ROOT)          missing.push("POWERBI_SOURCE_ROOT");
  if (!SERVICE_ACCOUNT_PATH) missing.push("FIREBASE_SERVICE_ACCOUNT_PATH");
  if (missing.length) {
    console.error(`\n❌ Variáveis ausentes no .env: ${missing.join(", ")}`);
    console.error("   Adicione as variáveis e tente novamente.\n");
    process.exit(1);
  }
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`\n❌ Arquivo de service account não encontrado: ${SERVICE_ACCOUNT_PATH}\n`);
    process.exit(1);
  }
}

// ── Firebase Admin (carregado dinamicamente para não quebrar build Vite) ───────

async function initFirebase() {
  // firebase-admin é ESM em v12+; usa createRequire para compatibilidade total
  const require = createRequire(import.meta.url);
  let admin;
  try {
    admin = (await import("firebase-admin")).default;
  } catch {
    console.error("\n❌ firebase-admin não instalado.");
    console.error("   Rode: npm install --save-dev firebase-admin\n");
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
}

// ── Normalização ──────────────────────────────────────────────────────────────

/** Remove acentos, caixa baixa, remove não-alfanuméricos. */
function normalize(str) {
  return (str ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Gera slug legível: "Ações de Conteúdo" → "acoes-de-conteudo". */
function toSlug(str) {
  return (str ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Scan de pastas PBIP ───────────────────────────────────────────────────────

/**
 * Percorre SOURCE_ROOT dois níveis (Setor → Projeto) e coleta pastas
 * que contenham um subdiretório *.SemanticModel.
 *
 * Estrutura esperada:
 *   SOURCE_ROOT/
 *     Comercial/
 *       Ações de Conteúdo/       ← projectName
 *         Ações de Conteúdo.SemanticModel/
 *         Ações de Conteúdo.Report/
 */
function scanPbipFolders(sourceRoot) {
  const folders = [];

  if (!fs.existsSync(sourceRoot)) {
    console.warn(`  ⚠️  Raiz não encontrada: ${sourceRoot}`);
    return folders;
  }

  let sectorEntries;
  try { sectorEntries = fs.readdirSync(sourceRoot); }
  catch (e) { console.warn(`  ⚠️  Não foi possível ler ${sourceRoot}: ${e.message}`); return folders; }

  for (const sectorName of sectorEntries) {
    const sectorPath = path.join(sourceRoot, sectorName);
    try { if (!fs.statSync(sectorPath).isDirectory()) continue; } catch { continue; }

    let projectEntries;
    try { projectEntries = fs.readdirSync(sectorPath); } catch { continue; }

    for (const projectName of projectEntries) {
      const projectPath = path.join(sectorPath, projectName);
      try { if (!fs.statSync(projectPath).isDirectory()) continue; } catch { continue; }

      let entries;
      try { entries = fs.readdirSync(projectPath); } catch { continue; }

      const smFolder = entries.find((e) => e.endsWith(".SemanticModel"));
      const rpFolder = entries.find((e) => e.endsWith(".Report"));

      if (!smFolder) continue;

      folders.push({
        projectName,
        projectPath,
        sectorName,
        semanticModelDir: path.join(projectPath, smFolder,  "definition"),
        reportDir:        rpFolder ? path.join(projectPath, rpFolder, "definition") : null,
      });
    }
  }

  return folders;
}

// ── Match ─────────────────────────────────────────────────────────────────────

/**
 * Tenta casar o titulo de um dashboard com uma pasta PBIP.
 * Estratégia em 3 níveis:
 *   1. Exact:      titulo === projectName
 *   2. Normalized: normalize(titulo) === normalize(projectName)
 *   3. Contains:   um contém o outro após normalização
 */
function findMatchingFolder(titulo, folders) {
  const exact = folders.find((f) => f.projectName === titulo);
  if (exact) return { folder: exact, matchType: "exact" };

  const normT = normalize(titulo);
  const norm  = folders.find((f) => normalize(f.projectName) === normT);
  if (norm) return { folder: norm, matchType: "normalized" };

  const contains = folders.find(
    (f) =>
      normalize(f.projectName).includes(normT) ||
      normT.includes(normalize(f.projectName))
  );
  if (contains) return { folder: contains, matchType: "contains" };

  return null;
}

// ── Leitura do Firestore ──────────────────────────────────────────────────────

/**
 * Retorna todos os dashboards (ou apenas onlyId) com seus metadados PBI.
 * Lê as coleções:
 *   dashboard/{id}          → titulo, descricao, sectorId, etc.
 *   dashboard_metadata/{id} → datasetId, workspaceId, tables, etc.
 */
async function readFirestoreDashboards(db, onlyId) {
  let docs;
  if (onlyId) {
    const snap = await db.collection("dashboard").doc(onlyId).get();
    docs = snap.exists ? [{ id: snap.id, ...snap.data() }] : [];
    if (!docs.length) {
      console.error(`\n❌ Dashboard não encontrado no Firestore: ${onlyId}\n`);
      process.exit(1);
    }
  } else {
    const snap = await db.collection("dashboard").get();
    docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Lê dashboard_metadata em paralelo
  const withMeta = await Promise.all(
    docs.map(async (dash) => {
      try {
        const metaSnap = await db.collection("dashboard_metadata").doc(dash.id).get();
        return { ...dash, _meta: metaSnap.exists ? metaSnap.data() : null };
      } catch {
        return { ...dash, _meta: null };
      }
    })
  );

  return withMeta;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n" + "═".repeat(62));
  console.log(" extract-portal-knowledge");
  if (DRY_RUN) console.log(" 🔍 MODO DRY-RUN — nenhum arquivo será escrito");
  if (ONLY_ID) console.log(` 🎯 Piloto: ${ONLY_ID}`);
  console.log("═".repeat(62) + "\n");

  validateEnv();

  // ── Firebase ────────────────────────────────────────────────────────────────
  console.log("🔥 Conectando ao Firestore...");
  const db = await initFirebase();

  // ── Leitura dos dashboards ──────────────────────────────────────────────────
  console.log("📋 Lendo dashboards...");
  const dashboards = await readFirestoreDashboards(db, ONLY_ID);
  console.log(`   ${dashboards.length} dashboard(s) encontrado(s)\n`);

  // ── Scan do servidor ────────────────────────────────────────────────────────
  console.log(`📁 Escaneando: ${SOURCE_ROOT}`);
  const pbipFolders = scanPbipFolders(SOURCE_ROOT);
  console.log(`   ${pbipFolders.length} pasta(s) PBIP encontrada(s):`);
  for (const f of pbipFolders) {
    console.log(`   ↳ [${f.sectorName}] ${f.projectName}`);
  }
  console.log();

  // ── Matching e extração ─────────────────────────────────────────────────────
  console.log("─".repeat(62));
  console.log(" Processando dashboards");
  console.log("─".repeat(62));

  const matched = [];
  const skipped = [];

  for (const dash of dashboards) {
    const titulo      = dash.titulo ?? "(sem título)";
    const dashboardId = dash.id;
    const datasetId   = dash._meta?.datasetId   ?? null;
    const workspaceId = dash._meta?.workspaceId ?? null;

    console.log(`\n  Dashboard : ${titulo}`);
    console.log(`  ID        : ${dashboardId}`);
    console.log(`  datasetId : ${datasetId ?? "(não cadastrado em dashboard_metadata)"}`);

    const match = findMatchingFolder(titulo, pbipFolders);

    if (!match) {
      console.log(`  ❌ Resultado : PBIP não encontrado`);
      skipped.push({ dashboardId, dashboardName: titulo, reason: "PBIP não encontrado" });
      continue;
    }

    const { folder, matchType } = match;
    console.log(`  ✅ Resultado : match [${matchType}]`);
    console.log(`  📂 Pasta    : ${folder.sectorName}/${folder.projectName}`);
    if (!folder.reportDir) {
      console.log(`  ⚠️  .Report  : não encontrado — páginas serão omitidas`);
    }

    if (DRY_RUN) {
      matched.push({ dashboardId, dashboardName: titulo, sourcePath: folder.projectPath, datasetId, workspaceId });
      continue;
    }

    // ── Extração ───────────────────────────────────────────────────────────────
    try {
      const knowledge = extractKnowledge(folder.semanticModelDir, folder.reportDir, titulo);

      // Enriquece com IDs do Power BI Service (úteis para o snapshot)
      knowledge.datasetId   = datasetId;
      knowledge.workspaceId = workspaceId;

      if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

      const outFile = path.join(OUT_DIR, `${dashboardId}.knowledge.json`);
      fs.writeFileSync(outFile, JSON.stringify(knowledge, null, 2), "utf8");

      const sizeKB = (fs.statSync(outFile).size / 1024).toFixed(1);
      const cols   = knowledge.tables.reduce((s, t) => s + t.columns.length, 0);
      console.log(`  💾 Arquivo  : ${dashboardId}.knowledge.json (${sizeKB} KB)`);
      console.log(`     Tabelas: ${knowledge.tables.length} | Colunas: ${cols} | Medidas: ${knowledge.measures.length} | Páginas: ${knowledge.pages.length}`);

      matched.push({
        dashboardId,
        dashboardName:    titulo,
        slug:             toSlug(titulo),
        knowledgeFile:    `${dashboardId}.knowledge.json`,
        sourcePath:       folder.projectPath,
        semanticModelPath: folder.semanticModelDir,
        reportPath:       folder.reportDir,
        datasetId,
        workspaceId,
        generatedAt:      knowledge.generatedAt,
      });
    } catch (err) {
      console.log(`  ❌ Erro na extração: ${err.message}`);
      skipped.push({ dashboardId, dashboardName: titulo, reason: err.message });
    }
  }

  // ── index.json ────────────────────────────────────────────────────────────────
  if (!DRY_RUN && matched.length > 0) {
    // Mescla com index.json existente para não apagar entradas de outras execuções
    const indexFile    = path.join(OUT_DIR, "index.json");
    const existingIndex = fs.existsSync(indexFile)
      ? JSON.parse(fs.readFileSync(indexFile, "utf8"))
      : { dashboards: [], skipped: [] };

    // Substitui entradas existentes pelo dashboardId e adiciona novas
    const existingMap = new Map(existingIndex.dashboards.map((d) => [d.dashboardId, d]));
    for (const entry of matched) existingMap.set(entry.dashboardId, entry);

    const newIndex = {
      generatedAt: new Date().toISOString(),
      dashboards:  [...existingMap.values()],
      skipped,
    };

    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(indexFile, JSON.stringify(newIndex, null, 2), "utf8");
    console.log(`\n📄 index.json atualizado — ${newIndex.dashboards.length} dashboard(s) total`);
  }

  // ── Resumo ────────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(62));
  if (DRY_RUN) {
    console.log(" 🔍 DRY-RUN concluído — nenhum arquivo foi escrito");
  } else {
    console.log(" ✅ Extração concluída");
  }
  console.log(`   Matches    : ${matched.length}`);
  console.log(`   Sem PBIP   : ${skipped.length}`);
  if (skipped.length > 0) {
    console.log("\n  Dashboards sem match:");
    for (const s of skipped) {
      console.log(`    ✗ ${s.dashboardName} (${s.dashboardId}) → ${s.reason}`);
    }
  }
  console.log("═".repeat(62) + "\n");
}

main().catch((err) => {
  console.error(`\n❌ Erro fatal: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
