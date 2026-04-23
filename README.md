<div align="center">
  <img src="./src/assets/PORTAL-DE-DADOS.png" alt="Portal PDMI Logo" width="300" />
  
  <br /> <br />

  <h1>📊 Portal PDMI — Dashboards & Analytics</h1>

  <p>
    <strong>Um sistema moderno, limpo e responsivo para visualização estruturada de Dashboards e gestão avançada de acessos corporativos.</strong>
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

O **Portal PDMI** atua como um hub central para consolidar painéis do **Power BI** e viabilizar inteligência de negócios. Desenvolvido para entregar uma experiência premium (UX/UI), a plataforma conta com autenticação segura, gestão minuciosa de liberações de usuários, controle por setores, auditoria de uso das sessões em tempo real, além de um design *Mobile-First*.

Seu back-office exclusivo (Área do Admin) permite aos gestores visualizarem quem e há quanto tempo consumiu relatórios vitais para as decisões da empresa.

---

## ✨ Features Principais

- 🔐 **Autenticação Segura:** Conexão nativa com provedores via Firebase (Google SignIn). Restrição automática de domínio corporativo (`@mirante.com.br`).
- 👥 **Sistema de Permissões por Tipo de Usuário:** Três níveis — `user`, `admin` e `superadmin`. Usuários comuns veem apenas dashboards liberados e visíveis; Admins gerenciam tudo; SuperAdmins elevam outros usuários.
- ⚙️ **Gerenciador de Dashboards e Setores:** Cadastre links do Power BI, thumbnails (com compressão automática), setores e controle de acessos individuais. Formulário validado com **React Hook Form + Zod**.
- 🔒 **Dashboards Ocultos:** Admin pode ocultar dashboards da visualização de usuários comuns. O toggle "Ver dashboards ocultos" é exclusivo do admin.
- 📺 **Modo Kiosk (Apresentação):** Rotação automática de dashboards para TVs e salas de monitoramento, com **Double Buffering (preload)** para transições instantâneas, Splash Screen cinemático e organização via **Drag n Drop**. Disponível para todos os usuários (cada um vê apenas seus dashboards visíveis).
- 📡 **Analytics Avançado & Engajamento:** Painel completo com métricas de uso, taxa de engajamento, usuários inativos, dashboards nunca acessados, ranking por tempo de leitura, cobertura por dashboard e exportação em **PDF** com layout profissional.
- 🔔 **Sistema de Notificações:** Notificações automáticas ao conceder acesso ou atualizar dashboards, com badge de não-lidas na Navbar.
- 🛡️ **Error Boundaries:** Proteção global contra crashes de componentes — em vez de tela branca, o usuário vê uma mensagem de erro amigável com opção de "Tentar novamente".
- 🦴 **Experiência Visual Fluída:** Skeletons animados profissionais substituem spinners de carregamento, reduzindo a percepção de espera e eliminando saltos de layout (CLS).
- 🖼️ **Otimização de Mídia:** Motor interno de compressão de imagens (Client-side) que garante que thumbnails pesadas sejam otimizadas antes do upload para o Firebase.
- 📄 **Paginação Inteligente:** Grid principal com paginação (12 cards/página) e controles com reticências para navegação eficiente em grandes volumes.
- 📱 **100% Responsivo e Tema Escuro (Dark Mode):** Layouts fluidos usando Tailwind V4 para acomodar a leitura de dados desde telas Ultrawide a dispositivos móveis.

---

## 🚀 Tecnologias

Este projeto utiliza ferramentas do ecossistema de alta performance do mundo React:

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)

* Componentes baseados no conceito **Shadcn UI** (Radix, Lucide Icons, Headless e Acessibilidade).
* Formulários gerenciados com **React Hook Form** e validação de schema via **Zod**.

---

## 🏗️ Arquitetura

Nossa estrutura de pastas evita *spaghetti code* através de módulos atômicos que focam na responsabilidade única.


```bash
📦 PDMI
 ┣ 📂 firebaseClient/   # Funções de interação direta com o Banco (Firestore/Auth)
 ┣ 📂 src
 ┃ ┣ 📂 assets/         # Recursos de Mídia, Logotipos, Imagens
 ┃ ┣ 📂 components/     # UI Reutilizáveis (Botões, Modais, Navbars)
 ┃ ┃ ┣ 📂 admin/        # 🛠️ Hub de Componentes de Administração
 ┃ ┃ ┃ ┣ 📂 analytics/  # 📊 Módulos atomizados de processamento e gráficos
 ┃ ┃ ┣ 📂 dashboard/    # 📈 Estruturas referentes ao form e viewers de PowerBI
 ┃ ┃ ┗ 📂 ui/           # 🧩 Atômicos universais importados via biblioteca base
 ┃ ┣ 📂 context/        # 🌐 ContextAPI (Estado Global de Auth e Theme)
 ┃ ┣ 📂 hooks/          # 🎣 Custom Hooks (Sessões, Notificações, PBI Status)
 ┃ ┣ 📂 pages/          # 📄 Entrypoints do React Router
 ┃ ┗ 📜 main.jsx        
 ┣ 📜 .env.example      # Definição e gabarito de Variáveis de Ambiente
 ┗ 📜 vite.config.js    
```

### Controle de Acesso

| Recurso | `user` | `admin` | `superadmin` |
|---|:---:|:---:|:---:|
| Ver dashboards liberados e visíveis | ✅ | ✅ | ✅ |
| Ver dashboards ocultos | ❌ | ✅ | ✅ |
| Modo Apresentação (Kiosk) | ✅* | ✅ | ✅ |
| Editar próprio perfil | ❌ | ✅ | ✅ |
| Acessar painel de admin | ❌ | ✅ | ✅ |
| Criar / Editar / Excluir dashboards | ❌ | ✅ | ✅ |
| Deletar usuários `user` | ❌ | ✅ | ✅ |
| Promover usuários a admin | ❌ | ❌ | ✅ |

> *Usuário comum vê apenas seus dashboards visíveis no Kiosk.

---

## 💻 Instalação e Uso

### Pré-requisitos
- **Node.js** (v18+)
- Conta no **Firebase** e no **Power BI Embedded** (opcional, para tokens dinâmicos).

### Passo a passo

1. **Faça o clone no seu repositório local:**
   ```bash
   git clone https://github.com/SeuUsuario/PDMI.git
   cd PDMI
   ```

2. **Instale os pacotes npm do projeto:**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente:**
   Copie o nosso arquivo base para não ter suas chaves rastreadas:
   ```bash
   cp .env.example .env
   ```
   Edite o seu arquivo `.env` gerado e insira o respectivo `API_KEY` e propriedades providas pelo console do Firebase.

4. **Start no servidor rodando Vite:**
   ```bash
   npm run dev
   ```

> [!NOTE] 
> O servidor Vite deverá iniciar na porta padrão [http://localhost:5173](http://localhost:5173). Ao fazer o deploy (via Vercel, Netlify ou afins), lembre-se de transcrever suas chaves de ambiente para a plataforma de hospedagem.

---

## 📋 Changelog

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
| 🏗️ **Modularização de Analytics** | Refatoração do monolito (>2500 linhas) em 7 sub-módulos para máxima manutenibilidade e performance via Custom Hooks |
| 🔧 **Bug fix: Reúso de código** | Corrigido bug onde "Marcar todos" referenciava variável fora de escopo |

---

<div align="center">
  <sub>Construído com ❤️ pelo <strong>Grupo Mirante</strong> e pelo desenvolvedor <strong>VictorEmanuel08</strong>. <br /> Focado em excelência e perfomance para uso empresarial. Mantenha os padrões e codifique forte!</sub>
</div>
