import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildKnowledgeContext } from "./_buildPrompt.js";
import { getPBIToken, getDataSnapshot, formatSnapshot } from "./_powerbi.js";

// Carrega .env da raiz em dev local (Render injeta env vars diretamente em produção)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3001;

// ── Knowledge registry ────────────────────────────────────────────────────────
// Carrega knowledge por dashboardId via index.json.
// Fallback: acoes-de-conteudo.knowledge.json (compatibilidade com MVP).

const KNOWLEDGE_DIR    = path.join(__dirname, "../powerbi/knowledge");
const KNOWLEDGE_FALLBACK = path.join(KNOWLEDGE_DIR, "acoes-de-conteudo.knowledge.json");
const KNOWLEDGE_INDEX  = path.join(KNOWLEDGE_DIR, "index.json");
const knowledgeCache   = new Map();  // dashboardId | "_default" | "_index" → valor

/** Retorna o index.json parseado (leitura única, fica em cache). */
function loadIndex() {
  if (knowledgeCache.has("_index")) return knowledgeCache.get("_index");
  if (!fs.existsSync(KNOWLEDGE_INDEX)) {
    knowledgeCache.set("_index", null);
    return null;
  }
  try {
    const index = JSON.parse(fs.readFileSync(KNOWLEDGE_INDEX, "utf8"));
    knowledgeCache.set("_index", index);
    return index;
  } catch (err) {
    console.warn(`[knowledge] falha ao ler index.json: ${err.message}`);
    knowledgeCache.set("_index", null);
    return null;
  }
}

/** Lê e cacheia um arquivo .knowledge.json pelo caminho absoluto. */
function readKnowledgeFile(file, cacheKey) {
  if (!fs.existsSync(file)) {
    console.warn(`[knowledge] arquivo não encontrado: ${path.basename(file)}`);
    knowledgeCache.set(cacheKey, null);
    return null;
  }
  try {
    const knowledge = JSON.parse(fs.readFileSync(file, "utf8"));
    knowledgeCache.set(cacheKey, knowledge);
    return knowledge;
  } catch (err) {
    console.warn(`[knowledge] falha ao carregar ${path.basename(file)}: ${err.message}`);
    knowledgeCache.set(cacheKey, null);
    return null;
  }
}

function loadKnowledge(dashboardId = null) {
  const cacheKey = dashboardId ?? "_default";
  if (knowledgeCache.has(cacheKey)) return knowledgeCache.get(cacheKey);

  // ── Resolução via index.json ────────────────────────────────────────────────
  if (dashboardId) {
    const index = loadIndex();
    const entry = index?.dashboards?.find((d) => d.dashboardId === dashboardId);

    if (entry?.knowledgeFile) {
      const file = path.join(KNOWLEDGE_DIR, entry.knowledgeFile);
      const knowledge = readKnowledgeFile(file, cacheKey);
      if (knowledge) {
        console.log(`[knowledge] dashboardId=${dashboardId} file=${entry.knowledgeFile} (${knowledge.tables?.length ?? 0} tabelas, ${knowledge.measures?.length ?? 0} medidas, ${knowledge.pages?.length ?? 0} páginas)`);
        return knowledge;
      }
      // Arquivo listado no index mas ausente em disco → cai no fallback
      console.warn(`[knowledge] dashboardId=${dashboardId} → ${entry.knowledgeFile} não encontrado em disco, usando fallback`);
    } else {
      console.warn(`[knowledge] dashboardId=${dashboardId} não encontrado no index.json, usando fallback`);
    }
  }

  // ── Fallback: acoes-de-conteudo.knowledge.json ──────────────────────────────
  const knowledge = readKnowledgeFile(KNOWLEDGE_FALLBACK, cacheKey);
  if (knowledge) {
    console.log(`[knowledge] dashboardId=${dashboardId ?? "null"} file=acoes-de-conteudo.knowledge.json [fallback] (${knowledge.tables?.length ?? 0} tabelas, ${knowledge.measures?.length ?? 0} medidas, ${knowledge.pages?.length ?? 0} páginas)`);
  }
  return knowledge;
}

// CORS: em produção, configurar CORS_ORIGIN com a URL do frontend no Render
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

// ── GET /health ───────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// ── POST /api/snapshot ────────────────────────────────────────────────────────

app.post("/api/snapshot", async (req, res) => {
  const { datasetId, workspaceId = null, tables = [], modelSchema = {} } = req.body ?? {};

  if (!datasetId) {
    return res.status(200).type("text/plain").send("");
  }

  try {
    console.log(`[snapshot] dataset=${datasetId} tabelas=${tables.length} medidas=${modelSchema.measures?.length ?? 0}`);
    const token = await getPBIToken();
    const snapshot = await getDataSnapshot(token, datasetId, workspaceId, tables, modelSchema);
    const text = formatSnapshot(snapshot);
    console.log(`[snapshot] pronto: ${snapshot?.tableNames?.length ?? 0} tabelas, ${snapshot?.crossSnapshots?.length ?? 0} cruzamentos`);
    return res.status(200).type("text/plain").send(text);
  } catch (err) {
    console.warn("[snapshot] falhou:", err.message);
    return res.status(200).type("text/plain").send("");
  }
});

// ── POST /api/chat ────────────────────────────────────────────────────────────

async function retryStream(client, params, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    try {
      return await client.messages.create({ ...params, stream: true });
    } catch (err) {
      attempt++;
      if (err?.status !== 429 || attempt >= maxRetries) throw err;
      const delay = Math.min(1000 * 2 ** attempt, 16000);
      console.warn(`[chat] 429 rate limit — retry ${attempt}/${maxRetries} em ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

app.post("/api/chat", async (req, res) => {
  const { messages, context, snapshotText } = req.body ?? {};

  if (!messages?.length || !context) {
    return res.status(400).json({ error: "Missing messages or context" });
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 0,
    timeout: 55_000,
  });

  // Carrega o knowledge do dashboard.
  // context.dashboardId será usado no futuro quando o frontend começar a enviá-lo.
  // Por ora, loadKnowledge(null) retorna o único knowledge disponível.
  const knowledge     = loadKnowledge(context.dashboardId ?? null);
  const knowledgeText = buildKnowledgeContext(knowledge);

  // Monta blocos do system em ordem crescente de volatilidade:
  //   1. Persona + regras (quase nunca muda → cache mais duradouro)
  //   2. Estrutura do modelo / knowledge (muda só quando o PBIP muda)
  //   3. Snapshot de dados (muda a cada refresh do Power BI)
  // Cada bloco com cache_control:ephemeral → Anthropic reutiliza cache enquanto o conteúdo não mudar.
  const systemBlocks = [
    { type: "text", text: buildSystemPrompt(context), cache_control: { type: "ephemeral" } },
  ];
  if (knowledgeText) {
    systemBlocks.push({ type: "text", text: knowledgeText, cache_control: { type: "ephemeral" } });
  }
  if (snapshotText) {
    systemBlocks.push({ type: "text", text: snapshotText, cache_control: { type: "ephemeral" } });
  }
  // Se só há um bloco, envia como string (evita overhead de array com 1 item)
  const system = systemBlocks.length === 1 ? systemBlocks[0].text : systemBlocks;

  console.log(`[chat] system blocks: ${systemBlocks.length} (knowledge: ${!!knowledgeText}, snapshot: ${!!snapshotText})`);

  // Tenta criar o stream antes de enviar headers SSE.
  // Se falhar aqui, ainda podemos retornar um HTTP error normal.
  let stream;
  try {
    stream = await retryStream(client, {
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
      messages,
    });
  } catch (err) {
    const code = err?.status === 429 ? "rate_limit" : "generic";
    console.error(`[chat] falhou antes de iniciar stream: ${err?.status} ${err.message}`);
    return res.status(err?.status ?? 500).json({ error: code });
  }

  req.socket?.setNoDelay(true);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
        res.write(`data: ${JSON.stringify(event.delta.text)}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
  } catch (err) {
    const code = err?.status === 429 ? "rate_limit" : "generic";
    console.error(`[chat] erro durante stream:`, err.message);
    res.write(`data: [ERROR:${code}]\n\n`);
  } finally {
    res.end();
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[backend] rodando em http://localhost:${PORT}`);
});
