import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./_buildPrompt.js";
import { getPBIToken, getDataSnapshot, formatSnapshot } from "./_powerbi.js";

// Carrega .env da raiz em dev local (Render injeta env vars diretamente em produção)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3001;

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

  const system = snapshotText
    ? [
        { type: "text", text: buildSystemPrompt(context), cache_control: { type: "ephemeral" } },
        { type: "text", text: snapshotText, cache_control: { type: "ephemeral" } },
      ]
    : buildSystemPrompt(context);

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
