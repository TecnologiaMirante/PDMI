<div align="center">
  <img src="./src/assets/PORTAL-DE-DADOS.png" alt="Portal PDMI Logo" width="300" />

  <br /> <br />

  <h1>📊 Portal PDMI — Dashboards, Analytics & IA</h1>

  <p>
    <strong>Hub corporativo para visualização de Dashboards Power BI, gestão avançada de acessos e assistente de BI com inteligência artificial.</strong>
  </p>

  <p>
    <a href="#-visão-geral">Visão Geral</a> •
    <a href="#-features-principais">Features</a> •
    <a href="#-tecnologias">Tecnologias</a> •
    <a href="#️-arquitetura">Arquitetura</a> •
    <a href="#-instalação-e-uso">Instalação</a> •
    <a href="#-changelog">Changelog</a>
  </p>
</div>

---

## 🔎 Visão Geral

O **Portal PDMI** é um hub central para consolidar painéis do **Power BI** e viabilizar inteligência de negócios dentro do Grupo Mirante. A plataforma entrega uma experiência premium com autenticação segura, gestão granular de permissões por usuário, controle por setores, auditoria de uso em tempo real e um **assistente de BI com IA** integrado diretamente aos dashboards.

O back-office exclusivo (Área do Admin) permite aos gestores visualizarem quem acessou, por quanto tempo, quais painéis foram lidos e onde está o engajamento da equipe — com exportação de relatórios em PDF e CSV. O sistema inclui um backend dedicado que conecta a plataforma ao **Claude (Anthropic)** e à **API do Power BI** para consultas dinâmicas.

---

## ✨ Features Principais

### Portal & Dashboards
- 🔐 **Autenticação Segura:** Google Sign-In via Firebase com restrição de domínio corporativo (`@mirante.com.br`).
- 👥 **Permissões por Papel:** Três níveis — `user`, `admin` e `superadmin`. Usuários veem apenas dashboards liberados; Admins gerenciam tudo; SuperAdmins promovem roles.
- ⚙️ **Gerenciador de Dashboards e Setores:** Cadastro de links Power BI, thumbnails (compressão automática client-side), setores, controle de acesso individual. Formulário validado com **React Hook Form + Zod**.
- 🔒 **Dashboards Ocultos:** Admin pode ocultar painéis sem remover os dados.
- 📺 **Modo Kiosk (Apresentação):** Rotação automática para TVs e salas, com double buffering para transições instantâneas, splash screen e organização via drag & drop.
- 🔔 **Notificações:** Alertas automáticos ao conceder acesso ou atualizar dashboards, com badge de não-lidas na Navbar.
- 🛡️ **Error Boundaries:** Proteção global contra crashes — tela de erro amigável em vez de página branca.
- 🦴 **Skeletons:** Animações profissionais substituem spinners, eliminando saltos de layout (CLS).
- 📄 **Paginação Inteligente:** Grid principal com 12 cards/página e navegação com reticências.
- 📱 **100% Responsivo + Dark Mode:** Layouts fluidos com Tailwind V4, do Ultrawide ao mobile.

### Analytics
- 📡 **Painel de Analytics Completo:** Sessões, visitas a dashboards, tempo total, média por sessão, taxa de engajamento, dashboards não acessados, usuários inativos.
- 📊 **Rankings:** Dashboards mais acessados, usuários mais ativos (ordenados por tempo), dashboards com mais tempo de leitura — com scroll para lista completa.
- 🎯 **Engajamento por Dashboard:** Gráfico dual mostrando % de usuários que visitaram vs % com permissão liberada.
- 📤 **Exportação:** Relatórios completos em **PDF** (layout profissional) e **CSV** (todos os dados tabulados).
- 📅 **Filtros Flexíveis:** Hoje, 7 dias, 30 dias, data única, intervalo personalizado, filtro por dashboard.

### Assistente de BI — Mara (IA)
- 🤖 **Chatbot integrado:** Widget flutuante disponível em qualquer dashboard, com identidade de analista sênior de BI da Mirante.
- ⚡ **Streaming em tempo real:** Respostas via **Server-Sent Events (SSE)** — o texto aparece palavra por palavra, sem esperar a resposta completa.
- 🧠 **Knowledge por Dashboard:** Cada dashboard tem um contexto estruturado (tabelas, colunas, medidas DAX, páginas, relacionamentos) carregado automaticamente — o modelo já sabe o que está no painel sem precisar perguntar.
- 🔍 **Consulta DAX Dinâmica (Tool Use):** Quando o snapshot não tem o recorte necessário, a Mara invoca a ferramenta `query_dataset` — o backend valida os parâmetros, gera DAX seguro por template e consulta o dataset do Power BI em tempo real.
- 📸 **Snapshot de Dados:** No carregamento de cada dashboard, o backend captura um snapshot dos dados via `executeQueries` e injeta no contexto da IA — a Mara responde com números reais sem precisar de query extra para perguntas comuns.
- 💾 **Prompt Cache:** System prompt com cache em múltiplos blocos (`ephemeral`) — persona, knowledge e snapshot separados para máxima reutilização de cache da Anthropic.
- 🔁 **Retry com Backoff:** Rate limit 429 tratado com retry exponencial automático (até 3 tentativas, limite 16s).

### Sistema de Knowledge
- 📂 **Extração automática do .pbip:** Script lê os arquivos TMDL (`.SemanticModel`) e as páginas do relatório (`.Report`) e gera um `.knowledge.json` estruturado por dashboard.
- ✅ **Auditoria:** Script detecta contagens suspeitas (colunas, medidas, tabelas) e interrompe o pipeline antes de publicar dados incorretos.
- ☁️ **Publicação no Firestore:** Knowledge publicado em `dashboard_knowledge/{dashboardId}` — atualizações não exigem commit, push ou redeploy do backend.
- 🔄 **Pipeline de sincronização:** Script PowerShell (`sync-and-publish-knowledge.ps1`) orquestra extração → auditoria → publicação com confirmação interativa antes de escrever em produção.
- ⏱️ **Cache TTL no backend:** Knowledge lido do Firestore fica em cache por 5 minutos (configurável via `KNOWLEDGE_TTL_MS`) para evitar leituras excessivas a cada requisição de chat.

---

## 🚀 Tecnologias

### Frontend
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)

- **Shadcn UI** (Radix, Lucide Icons, acessibilidade headless)
- **React Hook Form + Zod** — formulários validados com erros inline
- **date-fns** — manipulação de datas nos filtros de analytics
- **Sonner** — notificações toast

### Backend
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)

- **Anthropic SDK** (`@anthropic-ai/sdk`) — Claude Sonnet 4.6, streaming SSE, tool use
- **Firebase Admin SDK** — leitura de knowledge do Firestore no servidor
- **Power BI REST API** — `executeQueries` para snapshot e consultas DAX dinâmicas
- **dotenv** — gestão de variáveis de ambiente

---

## 🏗️ Arquitetura

```
📦 PDMI
 ┣ 📂 backend/                    # Servidor Node.js (ESM)
 ┃ ┣ 📜 server.js                 # /api/chat (streaming IA) + /api/snapshot
 ┃ ┣ 📜 _powerbi.js               # executeQueries, snapshot, DAX dinâmico
 ┃ ┣ 📜 _buildPrompt.js           # System prompt + knowledge context
 ┃ ┗ 📜 package.json
 ┣ 📂 scripts/                    # Automação de knowledge
 ┃ ┣ 📜 extract-portal-knowledge.js   # Lê .pbip → gera .knowledge.json
 ┃ ┣ 📜 audit-pbip-extraction.js      # Valida extração antes de publicar
 ┃ ┣ 📜 publish-knowledge-firestore.js # Publica no Firestore (--dry-run, --only)
 ┃ ┣ 📜 sync-and-publish-knowledge.ps1 # Pipeline completo com confirmação LIVE
 ┃ ┗ 📜 sync-and-publish-knowledge.bat # Lançador Windows
 ┣ 📂 powerbi/
 ┃ ┗ 📂 knowledge/                # .knowledge.json por dashboard + index.json
 ┣ 📂 firebaseClient/             # Funções Firestore/Auth do lado cliente
 ┣ 📂 src
 ┃ ┣ 📂 assets/                   # Logotipos, imagens, ícones
 ┃ ┣ 📂 components/
 ┃ ┃ ┣ 📂 admin/                  # Hub de componentes de administração
 ┃ ┃ ┃ ┗ 📂 analytics/            # Módulos atomizados de métricas e gráficos
 ┃ ┃ ┣ 📂 dashboard/              # Formulários e viewers Power BI
 ┃ ┃ ┣ 📂 ui/                     # Componentes atômicos (Shadcn)
 ┃ ┃ ┗ 📜 FloatingChatWidget.jsx  # Widget do assistente Mara (IA)
 ┃ ┣ 📂 context/                  # ContextAPI (Auth, Theme)
 ┃ ┣ 📂 hooks/                    # Custom Hooks
 ┃ ┣ 📂 pages/                    # Entrypoints do React Router
 ┃ ┗ 📜 main.jsx
 ┣ 📜 .env.example
 ┗ 📜 vite.config.js
```

### Fluxo do Assistente de BI

```
Usuário abre dashboard
       ↓
Frontend chama /api/snapshot (Power BI executeQueries)
       ↓
Snapshot injetado no system prompt como 3º bloco (cache ephemeral)
       ↓
Usuário envia pergunta → POST /api/chat (SSE stream)
       ↓
Claude responde com texto  ──── OU ────  Claude chama query_dataset
       ↓                                       ↓
Texto streamado ao frontend            Backend valida params
via SSE (palavra por palavra)          Gera DAX por template
                                       Consulta Power BI
                                       Resultado → 2ª chamada Claude
                                       Resposta streamada ao frontend
```

### Controle de Acesso

| Recurso | `user` | `admin` | `superadmin` |
|---|:---:|:---:|:---:|
| Ver dashboards liberados e visíveis | ✅ | ✅ | ✅ |
| Assistente de BI (Mara) | ✅ | ✅ | ✅ |
| Ver dashboards ocultos | ❌ | ✅ | ✅ |
| Modo Apresentação (Kiosk) | ✅* | ✅ | ✅ |
| Editar próprio perfil | ❌ | ✅ | ✅ |
| Acessar painel de admin | ❌ | ✅ | ✅ |
| Criar / Editar / Excluir dashboards | ❌ | ✅ | ✅ |
| Ver analytics completo | ❌ | ✅ | ✅ |
| Deletar usuários `user` | ❌ | ✅ | ✅ |
| Promover usuários a admin | ❌ | ❌ | ✅ |

> *Usuário comum vê apenas seus dashboards visíveis no Kiosk.

---

## 💻 Instalação e Uso

### Pré-requisitos
- **Node.js** v18+
- Conta no **Firebase** (Firestore + Authentication)
- Conta na **Anthropic** (API Key para o Claude)
- Acesso à **API do Power BI** (Azure App Registration com permissões `Dataset.Read.All`)

### 1. Clone e instale dependências

```bash
git clone https://github.com/SeuUsuario/PDMI.git
cd PDMI
npm install          # Frontend
cd backend && npm install   # Backend
```

### 2. Variáveis de Ambiente

Copie o arquivo base e preencha:
```bash
cp .env.example .env
```

**Variáveis do Frontend** (prefixo `VITE_`):
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_BACKEND_URL=http://localhost:3001   # URL do backend em dev
```

**Variáveis do Backend** (arquivo `.env` na raiz, lido pelo `backend/server.js`):
```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Power BI
POWERBI_CLIENT_ID=...
POWERBI_CLIENT_SECRET=...
POWERBI_TENANT_ID=...

# Firebase Admin (escolha uma estratégia)
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json   # dev local
# FIREBASE_SERVICE_ACCOUNT_BASE64=...                 # produção (Render)

# Servidor
PORT=3001
CORS_ORIGIN=http://localhost:5173   # em produção: URL do frontend no Render
KNOWLEDGE_TTL_MS=300000             # TTL do cache de knowledge (padrão: 5 min)
```

### 3. Rode em desenvolvimento

**Terminal 1 — Frontend:**
```bash
npm run dev
```

**Terminal 2 — Backend:**
```bash
cd backend && node server.js
```

> O frontend sobe em `http://localhost:5173` e o backend em `http://localhost:3001`.

### 4. Atualizar o Knowledge de um Dashboard

Sempre que o modelo de dados de um dashboard `.pbip` mudar:

```bat
scripts\sync-and-publish-knowledge.bat --dry-run   # simula sem escrever
scripts\sync-and-publish-knowledge.bat             # publica (pede confirmação)
scripts\sync-and-publish-knowledge.bat --only <dashboardId>  # só um
```

O pipeline faz: **extração** → **auditoria** → **publicação no Firestore**. O backend lê o knowledge atualizado em até 5 minutos (TTL do cache).

### 5. Deploy

- **Frontend:** qualquer plataforma SPA (Render, Vercel, Netlify). O arquivo `public/_redirects` garante que o React Router funcione com F5.
- **Backend:** Render (Web Service, `Root Directory = backend`, `Start Command = node server.js`). Configure as variáveis de ambiente no painel do Render, especialmente `FIREBASE_SERVICE_ACCOUNT_BASE64`.

Para gerar o base64 do serviceAccount:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\serviceAccount.json")) | Set-Clipboard
```

---

## 📋 Changelog

### v3.x — Maio 2026

| Feature | Descrição |
|---|---|
| 🤖 **Assistente Mara (IA)** | Chatbot de BI integrado com streaming SSE, identidade de analista sênior, respostas com dados reais do dashboard |
| 🔍 **Consulta DAX Dinâmica** | Tool Use do Claude (`query_dataset`) para consultar o Power BI quando o snapshot não tem o recorte pedido — DAX gerado por template seguro |
| 📸 **Snapshot de Dados** | Captura automática de dados do Power BI no carregamento do dashboard para contexto imediato da IA |
| 💾 **Prompt Cache Multi-bloco** | System prompt dividido em 3 blocos `ephemeral` (persona / knowledge / snapshot) para máxima reutilização de cache da Anthropic |
| ☁️ **Knowledge no Firestore** | Knowledge migrado de arquivos locais para `dashboard_knowledge/{dashboardId}` — atualizações sem redeploy |
| 🔄 **Pipeline de Sync** | Scripts `sync-and-publish-knowledge` com dry-run, confirmação LIVE, log automático em `scripts/logs/` |
| 📊 **Analytics: ordenação por tempo** | Ranking de usuários ordenado por tempo total (era por número de acessos) |
| 📜 **Analytics: lista completa com scroll** | Todos os rankings mostram lista completa com scroll, não apenas top 8 |
| 🎯 **Analytics: tooltip Engajamento** | Ícone `ⓘ` explica as duas barras do Engajamento por Dashboard |
| 🐛 **Fix: dados legacy no filtro de data** | Dashboard visits e "sem acesso no período" agora mostram dados corretos ao filtrar por data |
| 📅 **Fix: data de início da coleta** | Header de analytics exibe automaticamente quando a coleta de dados começou |
| 🌐 **Fix: SPA routing no Render** | `public/_redirects` resolve o 404 ao dar F5 em rotas internas |

### v2.x — Abril 2026

| Feature | Descrição |
|---|---|
| 🛡️ **Error Boundaries** | Proteção global contra crashes — tela de erro amigável em vez de página branca |
| ✅ **RHF + Zod** | Formulário de dashboard reescrito com validação robusta e erros inline |
| 📄 **Paginação** | Grid da Home com 12 cards por página e controles com reticências |
| 👥 **Permissões granulares** | User vê só dashboards visíveis; Admin deleta usuários; SuperAdmin promove roles |
| 🎬 **Kiosk para todos** | Modo Apresentação disponível para usuários comuns (filtrado por permissão) |
| 🚫 **Perfil somente leitura** | Usuários comuns não editam o próprio perfil — apenas admins |
| 📊 **Analytics enriquecido** | Taxa de engajamento, usuários inativos, dashboards nunca acessados, ranking por tempo, cobertura por dashboard |
| 🏗️ **Modularização de Analytics** | Refatoração do monolito em 7 sub-módulos com Custom Hook dedicado |

---

<div align="center">
  <sub>Construído com ❤️ pelo <strong>Grupo Mirante</strong> e pelo desenvolvedor <strong>VictorEmanuel08</strong>. <br /> Focado em excelência e performance para uso empresarial.</sub>
</div>
