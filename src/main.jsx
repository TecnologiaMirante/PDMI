import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import { App } from "./App.jsx";
import "./index.css";

const REQUIRED_ENV_VARS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const missing = REQUIRED_ENV_VARS.filter((key) => !import.meta.env[key]);

if (missing.length > 0) {
  document.getElementById("root").innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f1117;font-family:sans-serif;padding:2rem;">
      <div style="background:#1a1a2e;border:1px solid #ef4444;border-radius:16px;padding:2rem;max-width:480px;width:100%;">
        <h1 style="color:#ef4444;font-size:1.2rem;font-weight:700;margin:0 0 0.5rem;">Configuração incompleta</h1>
        <p style="color:#94a3b8;font-size:0.875rem;margin:0 0 1rem;">
          As seguintes variáveis de ambiente estão faltando no arquivo <code style="color:#f8fafc;background:#0f1117;padding:2px 6px;border-radius:4px;">.env</code>:
        </p>
        <ul style="margin:0;padding:0 0 0 1.25rem;color:#fbbf24;font-size:0.875rem;line-height:2;">
          ${missing.map((v) => `<li><code>${v}</code></li>`).join("")}
        </ul>
        <p style="color:#94a3b8;font-size:0.8rem;margin:1rem 0 0;">
          Crie ou corrija o arquivo <code style="color:#f8fafc;background:#0f1117;padding:2px 6px;border-radius:4px;">.env</code> baseado no <code style="color:#f8fafc;background:#0f1117;padding:2px 6px;border-radius:4px;">.env.example</code> e reinicie o servidor.
        </p>
      </div>
    </div>
  `;
} else {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App />
      <Toaster position="top-right" richColors />
    </StrictMode>
  );
}
