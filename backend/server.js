import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore }                  from "firebase-admin/firestore";
import { buildSystemPrompt, buildKnowledgeContext } from "./_buildPrompt.js";
import { getPBIToken, getDataSnapshot, formatSnapshot, executeDynamicQuery } from "./_powerbi.js";

// Carrega .env da raiz em dev local (Render injeta env vars diretamente em produção)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3001;

// ── Firebase Admin ────────────────────────────────────────────────────────────
// Três estratégias de credencial (ordem de prioridade):
//   1. FIREBASE_SERVICE_ACCOUNT_BASE64  — base64 do JSON (ideal para Render)
//   2. FIREBASE_SERVICE_ACCOUNT         — JSON em string
//   3. FIREBASE_SERVICE_ACCOUNT_PATH    — caminho para arquivo (dev local)
// Se nenhuma funcionar, db=null e o backend usa apenas arquivos locais.
// NUNCA loga private_key — apenas project_id (inofensivo).

let db = null;

(function initFirebase() {
  if (getApps().length > 0) { db = getFirestore(); return; }

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

  console.log("[firebase] nenhuma credencial configurada — Firestore desabilitado, usando arquivos locais");
})();

// ── Knowledge registry ────────────────────────────────────────────────────────
// Fonte primária: Firestore `dashboard_knowledge/{dashboardId}`.
// Fallback:  index.json  →  <id>.knowledge.json  →  acoes-de-conteudo.knowledge.json
// TTL cache: 5 min (override via KNOWLEDGE_TTL_MS env var).

const KNOWLEDGE_DIR      = path.join(__dirname, "../powerbi/knowledge");
const KNOWLEDGE_FALLBACK = path.join(KNOWLEDGE_DIR, "acoes-de-conteudo.knowledge.json");
const KNOWLEDGE_INDEX    = path.join(KNOWLEDGE_DIR, "index.json");

const KNOWLEDGE_TTL_MS = Number(process.env.KNOWLEDGE_TTL_MS ?? 5 * 60 * 1000); // 5 min
const knowledgeCache   = new Map(); // cacheKey → { data, loadedAt }

let _indexData = undefined; // lazy-loaded uma vez (index.json é estático entre deploys)

function loadIndex() {
  if (_indexData !== undefined) return _indexData;
  if (!fs.existsSync(KNOWLEDGE_INDEX)) { _indexData = null; return null; }
  try {
    _indexData = JSON.parse(fs.readFileSync(KNOWLEDGE_INDEX, "utf8"));
    return _indexData;
  } catch (err) {
    console.warn(`[knowledge] falha ao ler index.json: ${err.message}`);
    _indexData = null;
    return null;
  }
}

function readKnowledgeFile(file) {
  if (!fs.existsSync(file)) {
    console.warn(`[knowledge] arquivo não encontrado: ${path.basename(file)}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.warn(`[knowledge] falha ao carregar ${path.basename(file)}: ${err.message}`);
    return null;
  }
}

/** Fallback: carrega knowledge dos arquivos locais (index.json → arquivo → acoes-de-conteudo). */
function loadKnowledgeLocal(dashboardId) {
  if (dashboardId) {
    const index = loadIndex();
    const entry = index?.dashboards?.find((d) => d.dashboardId === dashboardId);
    if (entry?.knowledgeFile) {
      const file = path.join(KNOWLEDGE_DIR, entry.knowledgeFile);
      const knowledge = readKnowledgeFile(file);
      if (knowledge) {
        console.log(`[knowledge] dashboardId=${dashboardId} source=local file=${entry.knowledgeFile} (${knowledge.tables?.length ?? 0} tabelas, ${knowledge.measures?.length ?? 0} medidas, ${knowledge.pages?.length ?? 0} páginas)`);
        return knowledge;
      }
      console.warn(`[knowledge] dashboardId=${dashboardId} → ${entry.knowledgeFile} ausente em disco, usando fallback`);
    } else {
      console.warn(`[knowledge] dashboardId=${dashboardId} não encontrado no index.json, usando fallback`);
    }
  }
  const knowledge = readKnowledgeFile(KNOWLEDGE_FALLBACK);
  if (knowledge) {
    console.log(`[knowledge] dashboardId=${dashboardId ?? "null"} source=local [fallback] (${knowledge.tables?.length ?? 0} tabelas, ${knowledge.measures?.length ?? 0} medidas, ${knowledge.pages?.length ?? 0} páginas)`);
  }
  return knowledge;
}

/** Carrega knowledge: Firestore → TTL cache → arquivos locais. */
async function loadKnowledge(dashboardId = null) {
  const cacheKey = dashboardId ?? "_default";

  // TTL cache
  const cached = knowledgeCache.get(cacheKey);
  if (cached && Date.now() - cached.loadedAt < KNOWLEDGE_TTL_MS) return cached.data;

  // Firestore (apenas se configurado e dashboardId disponível)
  if (db && dashboardId) {
    try {
      const snap = await db.collection("dashboard_knowledge").doc(dashboardId).get();
      if (snap.exists) {
        const knowledge = snap.data()?.knowledge ?? null;
        knowledgeCache.set(cacheKey, { data: knowledge, loadedAt: Date.now() });
        if (knowledge) {
          console.log(`[knowledge] dashboardId=${dashboardId} source=firestore (${knowledge.tables?.length ?? 0} tabelas, ${knowledge.measures?.length ?? 0} medidas, ${knowledge.pages?.length ?? 0} páginas)`);
        } else {
          console.warn(`[knowledge] dashboardId=${dashboardId} Firestore: documento existe mas knowledge=null`);
        }
        return knowledge;
      }
      console.warn(`[knowledge] dashboardId=${dashboardId} não encontrado no Firestore — usando arquivos locais`);
    } catch (err) {
      console.warn(`[knowledge] Firestore erro para ${dashboardId}: ${err.message} — usando arquivos locais`);
    }
  }

  // Fallback: arquivos locais
  const knowledge = loadKnowledgeLocal(dashboardId);
  knowledgeCache.set(cacheKey, { data: knowledge, loadedAt: Date.now() });
  return knowledge;
}

// CORS: em produção, configurar CORS_ORIGIN com a URL do frontend no Render
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

// ── Ferramentas disponíveis para o Claude (tool_use) ─────────────────────────
const TOOLS = [
  {
    name: "query_dataset",
    description:
      "Consulta o dataset do Power BI quando o snapshot não contém o recorte necessário " +
      "para responder à pergunta do usuário. Use SOMENTE quando os dados exigidos não estão " +
      "no snapshot. IMPORTANTE: ao decidir usar esta ferramenta, não escreva nenhum texto " +
      "antes da chamada — invoque a ferramenta diretamente.",
    input_schema: {
      type: "object",
      properties: {
        table:        { type: "string",  description: "Nome exato da tabela no modelo (ex: fatAConteudo)" },
        dimension:    { type: "string",  description: "Coluna de agrupamento (ex: Produto, Vendedor, Programa)" },
        metric:       { type: "string",  description: "Coluna numérica a agregar (ex: Líquido Faturado)" },
        aggregation:  { type: "string",  enum: ["SUM", "COUNT", "AVG", "MAX", "MIN"], description: "Função de agregação (padrão: SUM)" },
        date_column:  { type: "string",  description: "Coluna de data para aplicar filtro de período (ex: Exibição)" },
        year:         { type: "integer", description: "Ano para filtrar (ex: 2025)" },
        month:        { type: "integer", description: "Mês para filtrar, 1–12 (opcional — omitir para ano inteiro)" },
        top_n:        { type: "integer", description: "Quantidade de resultados a retornar, máximo 50 (padrão: 10)" },
      },
      required: ["table", "dimension", "metric"],
    },
  },
];

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

  // Carrega o knowledge do dashboard (Firestore → cache TTL → arquivos locais).
  const knowledge     = await loadKnowledge(context.dashboardId ?? null);
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
      tools: TOOLS,
      tool_choice: { type: "auto" },
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
    // Rastreia blocos por index: text (streamed direto) e tool_use (acumulado)
    const contentBlocks = new Map(); // index → { type, text?, id?, name?, jsonBuffer? }

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        const { index, content_block: block } = event;
        if (block.type === "text") {
          contentBlocks.set(index, { type: "text", text: "" });
        } else if (block.type === "tool_use") {
          contentBlocks.set(index, { type: "tool_use", id: block.id, name: block.name, jsonBuffer: "" });
        }
      }
      else if (event.type === "content_block_delta") {
        const block = contentBlocks.get(event.index);
        if (!block) continue;
        if (event.delta.type === "text_delta" && block.type === "text") {
          block.text += event.delta.text;
          res.write(`data: ${JSON.stringify(event.delta.text)}\n\n`); // streaming normal
        } else if (event.delta.type === "input_json_delta" && block.type === "tool_use") {
          block.jsonBuffer += event.delta.partial_json;               // acumula params
        }
      }
      // content_block_stop e message_delta não precisam de ação explícita aqui
    }

    // ── Verifica se houve tool_use após o stream terminar ─────────────────────
    const toolBlock = [...contentBlocks.values()].find((b) => b.type === "tool_use");

    // Caso 1: resposta normal — streaming já concluído acima
    if (!toolBlock) {
      res.write("data: [DONE]\n\n");
      return;
    }

    // Caso 2: tool_use detectado — parse do JSON acumulado (feito só agora, nunca no meio)
    console.log(`[tool_use] solicitado — dashboard=${context.dashboardId} dataset=${context.metadata?.datasetId ?? "n/a"}`);

    let params;
    try {
      params = JSON.parse(toolBlock.jsonBuffer || "{}");
    } catch (parseErr) {
      console.error(`[tool_use] JSON inválido nos params: ${toolBlock.jsonBuffer}`);
      res.write(`data: [ERROR:generic]\n\n`);
      return;
    }
    console.log(`[tool_use] params recebidos: ${JSON.stringify(params)}`);

    // Executa a query dinâmica no dataset do dashboard atual
    const datasetId   = context.metadata?.datasetId   ?? null;
    const workspaceId = context.metadata?.workspaceId ?? null;

    let toolResultContent;
    let toolIsError = false;

    if (!datasetId) {
      console.warn(`[tool_use] datasetId ausente — dashboard=${context.dashboardId}`);
      toolResultContent = "Erro: datasetId não disponível para este dashboard.";
      toolIsError = true;
    } else {
      const pbiToken = await getPBIToken();
      const result   = await executeDynamicQuery(pbiToken, datasetId, workspaceId, params, knowledge);
      if (result.error) {
        console.warn(`[tool_use] erro na query: ${result.error}`);
        toolResultContent = `Erro ao consultar: ${result.error}`;
        toolIsError = true;
      } else {
        toolResultContent = JSON.stringify(result.rows);
      }
    }

    // Reconstrói o conteúdo do assistente para a 2ª chamada
    // (obrigatório pela API: a mensagem que gerou o tool_use deve estar no histórico)
    const assistantContent = [...contentBlocks.values()].map((b) =>
      b.type === "text"
        ? { type: "text", text: b.text }
        : { type: "tool_use", id: b.id, name: b.name, input: params }
    );

    const toolResult = {
      type: "tool_result",
      tool_use_id: toolBlock.id,
      content: toolResultContent,
      ...(toolIsError ? { is_error: true } : {}),
    };

    const messagesWithTool = [
      ...messages,
      { role: "assistant", content: assistantContent },
      { role: "user",      content: [toolResult] },
    ];

    // 2ª chamada: streaming normal com o resultado da query
    const stream2 = await retryStream(client, {
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
      messages: messagesWithTool,
      tools: TOOLS,
    });

    for await (const event of stream2) {
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
