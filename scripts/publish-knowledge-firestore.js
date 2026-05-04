#!/usr/bin/env node
/**
 * publish-knowledge-firestore.js
 *
 * Lê powerbi/knowledge/index.json + cada .knowledge.json e publica
 * no Firestore em dashboard_knowledge/{dashboardId}.
 *
 * Uso (na raiz do projeto):
 *   node scripts/publish-knowledge-firestore.js
 *   node scripts/publish-knowledge-firestore.js --dry-run
 *   node scripts/publish-knowledge-firestore.js --only <dashboardId>
 *   node scripts/publish-knowledge-firestore.js --dry-run --only <dashboardId>
 *
 * Credenciais (mesma ordem do backend):
 *   FIREBASE_SERVICE_ACCOUNT_BASE64  — base64 do JSON de service account
 *   FIREBASE_SERVICE_ACCOUNT         — JSON em string
 *   FIREBASE_SERVICE_ACCOUNT_PATH    — caminho para arquivo .json (dev local)
 *
 * NUNCA loga private_key — apenas project_id.
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, "..");

// Carrega .env da raiz (dev local)
loadEnv({ path: path.join(ROOT, ".env") });

// ── CLI args ──────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ONLY_IDX = args.indexOf("--only");
const ONLY_ID  = ONLY_IDX !== -1 ? args[ONLY_IDX + 1] : null;

// ── Firebase Admin init ───────────────────────────────────────────────────────

let db = null;

async function initFirebase() {
  // firebase-admin pode estar em node_modules da raiz (devDependency) ou instalado globalmente
  let firebaseAdmin;
  try {
    firebaseAdmin = await import("firebase-admin/app");
  } catch {
    console.error("❌ firebase-admin não encontrado. Instale com: npm install -D firebase-admin");
    process.exit(1);
  }
  const { initializeApp, getApps, cert } = firebaseAdmin;
  const { getFirestore } = await import("firebase-admin/firestore");

  if (getApps().length > 0) { db = getFirestore(); return; }

  // Strategy 1: base64
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    try {
      const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      initializeApp({ credential: cert(sa) });
      db = getFirestore();
      console.log(`[firebase] ✓ init via BASE64 — project: ${sa.project_id}`);
      return;
    } catch (err) {
      console.warn(`[firebase] falha via BASE64: ${err.message}`);
    }
  }

  // Strategy 2: JSON string
  const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (jsonStr) {
    try {
      const sa = JSON.parse(jsonStr);
      initializeApp({ credential: cert(sa) });
      db = getFirestore();
      console.log(`[firebase] ✓ init via FIREBASE_SERVICE_ACCOUNT — project: ${sa.project_id}`);
      return;
    } catch (err) {
      console.warn(`[firebase] falha via FIREBASE_SERVICE_ACCOUNT: ${err.message}`);
    }
  }

  // Strategy 3: file path
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (filePath) {
    try {
      const sa = JSON.parse(fs.readFileSync(filePath, "utf8"));
      initializeApp({ credential: cert(sa) });
      db = getFirestore();
      console.log(`[firebase] ✓ init via PATH=${filePath} — project: ${sa.project_id}`);
      return;
    } catch (err) {
      console.warn(`[firebase] falha via FIREBASE_SERVICE_ACCOUNT_PATH: ${err.message}`);
    }
  }

  console.error("❌ Nenhuma credencial Firebase encontrada.");
  console.error("   Configure uma das variáveis: FIREBASE_SERVICE_ACCOUNT_BASE64 | FIREBASE_SERVICE_ACCOUNT | FIREBASE_SERVICE_ACCOUNT_PATH");
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadIndex() {
  const file = path.join(ROOT, "powerbi/knowledge/index.json");
  if (!fs.existsSync(file)) {
    console.error(`❌ index.json não encontrado: ${file}`);
    console.error("   Rode primeiro: node scripts/extract-portal-knowledge.js");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadKnowledgeFile(knowledgeDir, knowledgeFile) {
  const file = path.join(knowledgeDir, knowledgeFile);
  if (!fs.existsSync(file)) {
    console.warn(`  ⚠️  arquivo não encontrado: ${knowledgeFile}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.warn(`  ⚠️  falha ao parsear ${knowledgeFile}: ${err.message}`);
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await initFirebase();

  const index        = loadIndex();
  const knowledgeDir = path.join(ROOT, "powerbi/knowledge");
  let   dashboards   = index.dashboards ?? [];

  if (ONLY_ID) {
    dashboards = dashboards.filter((d) => d.dashboardId === ONLY_ID);
    if (!dashboards.length) {
      console.error(`❌ dashboardId não encontrado no index.json: ${ONLY_ID}`);
      process.exit(1);
    }
  }

  const mode = DRY_RUN ? "[DRY-RUN]" : "[LIVE]";
  console.log("\n" + "═".repeat(72));
  console.log(` publish-knowledge-firestore  ${mode}  —  ${dashboards.length} dashboard(s)${ONLY_ID ? `  [only: ${ONLY_ID}]` : ""}`);
  console.log("═".repeat(72) + "\n");

  let ok = 0, skipped = 0, errors = 0;
  const col = path.basename(ROOT); // coleção Firestore

  for (const entry of dashboards) {
    const { dashboardId, dashboardName, knowledgeFile, sourcePath, generatedAt } = entry;

    if (!knowledgeFile) {
      console.warn(`  [SKIP] ${dashboardName} — knowledgeFile ausente no index.json`);
      skipped++;
      continue;
    }

    const knowledge = loadKnowledgeFile(knowledgeDir, knowledgeFile);
    if (!knowledge) {
      console.warn(`  [SKIP] ${dashboardName} — arquivo não carregado`);
      skipped++;
      continue;
    }

    // Monta o payload
    const tablesCount  = knowledge.tables?.length ?? 0;
    const columnsCount = (knowledge.tables ?? []).reduce((s, t) => s + (t.columns?.length ?? 0), 0);
    const measuresCount = knowledge.measures?.length ?? 0;
    const pagesCount   = knowledge.pages?.length ?? 0;

    const payload = {
      dashboardId,
      dashboardName,
      version:      generatedAt ?? new Date().toISOString(),
      sourcePath:   sourcePath ?? null,
      tablesCount,
      columnsCount,
      measuresCount,
      pagesCount,
      knowledge,
      updatedAt:    new Date().toISOString(),
    };

    const label = `${dashboardName} (${dashboardId})`;
    const stats = `tabs=${tablesCount} cols=${columnsCount} meds=${measuresCount} pgs=${pagesCount}`;

    if (DRY_RUN) {
      console.log(`  [DRY]  ${label}  —  ${stats}`);
      ok++;
      continue;
    }

    try {
      await db.collection("dashboard_knowledge").doc(dashboardId).set(payload);
      console.log(`  ✅  ${label}  —  ${stats}`);
      ok++;
    } catch (err) {
      console.error(`  ❌  ${label}  —  erro: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nResultado: ${ok} publicado(s) · ${skipped} ignorado(s) · ${errors} erro(s)`);
  if (DRY_RUN) console.log("(dry-run — nenhuma escrita realizada)\n");
  console.log("═".repeat(72) + "\n");

  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error("❌ Erro inesperado:", err.message);
  process.exit(1);
});
