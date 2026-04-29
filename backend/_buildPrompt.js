// ── buildKnowledgeContext ─────────────────────────────────────────────────────
// Converte um knowledge.json (gerado por scripts/extract-knowledge.js) em texto
// estruturado para o system prompt do Claude.
//
// Futuro: quando houver múltiplos dashboards, esta função receberá o knowledge
// correto já selecionado por dashboardId em server.js — nenhuma mudança necessária aqui.

export function buildKnowledgeContext(knowledge) {
  if (!knowledge) return null;

  const lines = [];
  lines.push("--- ESTRUTURA DO MODELO DE DADOS ---");
  lines.push(`Dashboard: ${knowledge.dashboardName}`);
  lines.push("INSTRUÇÃO: Quando o usuário pedir a lista de colunas, apresente todos os nomes explicitamente — nunca resuma nem agrupe.");

  if (knowledge.dataSource) {
    const ds = knowledge.dataSource;
    const note = ds.notes ? ` (${ds.notes})` : "";
    lines.push(`Fonte: ${ds.type}${note}`);
  }

  // ── Tabelas e colunas ───────────────────────────────────────────────────────
  for (const table of knowledge.tables ?? []) {
    lines.push(`\nTABELA: ${table.name}`);

    const dateCols    = [];
    const dimCols     = [];
    const moneyCols   = [];
    const pctCols     = [];
    const numericCols = [];

    for (const col of table.columns ?? []) {
      if (col.dataType === "dateTime" || col.dataType === "date") {
        dateCols.push(col);
      } else if (col.dataType === "string") {
        dimCols.push(col);
      } else {
        const fmt = col.formatString ?? "";
        if (fmt.includes("R$"))     moneyCols.push(col);
        else if (fmt.includes("%")) pctCols.push(col);
        else                        numericCols.push(col);
      }
    }

    // Totais pré-calculados — enviados explicitamente para evitar erro de contagem do modelo
    const totalGeral = dateCols.length + dimCols.length + moneyCols.length + pctCols.length + numericCols.length;
    lines.push(`  Totais: data=${dateCols.length} | dimensões=${dimCols.length} | monetárias=${moneyCols.length} | percentuais=${pctCols.length} | numéricas=${numericCols.length} | TOTAL GERAL=${totalGeral}`);
    lines.push("  INSTRUÇÃO: Não recalcule totais manualmente; use os totais fornecidos acima.");

    if (dateCols.length) {
      lines.push(`  [DATA — ${dateCols.length} coluna(s)]`);
      for (const col of dateCols) {
        lines.push(`    ${col.name} (${col.dataType}) — suporta filtros por período (time intelligence)`);
      }
    }
    if (dimCols.length) {
      lines.push(`  [DIMENSÕES — texto — ${dimCols.length} colunas]`);
      for (const col of dimCols) {
        lines.push(`    ${col.name} (string)`);
      }
    }
    if (moneyCols.length) {
      lines.push(`  [VALORES MONETÁRIOS — R$ — ${moneyCols.length} colunas]`);
      for (const col of moneyCols) {
        lines.push(`    ${col.name} (double, R$)`);
      }
    }
    if (pctCols.length) {
      lines.push(`  [PERCENTUAIS — ${pctCols.length} coluna(s)]`);
      for (const col of pctCols) {
        lines.push(`    ${col.name} (double, %)`);
      }
    }
    if (numericCols.length) {
      lines.push(`  [NUMÉRICOS — ${numericCols.length} colunas]`);
      for (const col of numericCols) {
        lines.push(`    ${col.name} (double)`);
      }
    }
  }

  // ── Medidas DAX ─────────────────────────────────────────────────────────────
  if (knowledge.measures?.length) {
    lines.push("\nMEDIDAS DAX:");
    for (const m of knowledge.measures) {
      const fmt = m.formatString ? `  →  formato: ${m.formatString}` : "";
      lines.push(`  [${m.name}] = ${m.expression}${fmt}`);
    }
  }

  // ── Relacionamentos ─────────────────────────────────────────────────────────
  if (knowledge.relationships?.length) {
    lines.push("\nRELACIONAMENTOS:");
    for (const r of knowledge.relationships) {
      // Oculta IDs de tabelas de sistema (muito verboso) mas informa a semântica
      const toLabel = r.toTable.startsWith("LocalDateTable_")
        ? "tabela de datas interna (time intelligence)"
        : `${r.toTable}[${r.toColumn}]`;
      lines.push(`  ${r.fromTable}[${r.fromColumn}] → ${toLabel}`);
    }
  }

  // ── Páginas ─────────────────────────────────────────────────────────────────
  const allPages     = knowledge.pages ?? [];
  const visiblePages = allPages.filter((p) => !p.hidden);
  const hiddenPages  = allPages.filter((p) =>  p.hidden);

  if (allPages.length) {
    lines.push("\nPÁGINAS DO RELATÓRIO:");
    lines.push(`  Totais: total=${allPages.length} | visíveis=${visiblePages.length} | ocultas=${hiddenPages.length}`);
    lines.push("  INSTRUÇÃO: Não recalcule totais de páginas; use os totais fornecidos acima. Liste todas as páginas abaixo sem omitir nenhuma.");
    for (const p of allPages) {
      const vis = p.hidden ? "[oculta]" : "[visível]";
      lines.push(`  ${String(p.order).padStart(2)}. ${p.name} ${vis}`);
    }
  }

  lines.push("\n--- FIM DA ESTRUTURA ---");
  return lines.join("\n");
}

// ── buildSystemPrompt ─────────────────────────────────────────────────────────

export function buildSystemPrompt({
  titulo,
  descricao,
  sectorName,
  pbiStatus,
  metadata,
}) {
  const statusLabel = {
    updated: "Atualizado",
    outdated: "Desatualizado",
    unknown: "Sem informação",
    error: "Indisponível",
  };

  let prompt = `Você é Mara, Analista Sênior de BI, Marketing e Comercial da Mirante Tecnologia.

IDENTIDADE E MISSÃO:
Você é uma analista experiente que domina tanto o lado técnico (Power BI, DAX, modelagem) quanto o lado de negócio (marketing digital, comercial, vendas e mídia). Quando um usuário pergunta sobre os dados de um dashboard, você age como um analista que JÁ tem os dados na mão e entrega a resposta diretamente — nunca instrui o usuário a fazer a análise.

EXPERTISE TÉCNICA (Power BI):
- DAX: CALCULATE, FILTER, ALL, ALLEXCEPT, RELATED, RELATEDTABLE, RANKX, TOPN, DATEADD, SAMEPERIODLASTYEAR, TOTALYTD, iteradores (SUMX, AVERAGEX, MAXX), variáveis, funções de contexto
- Modelagem: star schema, relacionamentos, cardinalidade, direção de filtro, tabelas de datas, hierarquias
- Power Query/M: transformações, merge, append, colunas personalizadas, tipos
- Performance: VertiPaq, evitar FILTER em grandes tabelas, variáveis DAX, agregações, otimização de medidas

EXPERTISE DE NEGÓCIO — MARKETING DIGITAL E MÍDIA:
- Métricas de mídia: Impressions, Clicks, CTR (Click-Through Rate), CPM (Custo por Mil), CPC (Custo por Click), Viewable Impressions, Viewability Rate, Reach, Frequency, Share of Voice
- Métricas de performance: Conversões, CPL (Custo por Lead), CPA (Custo por Aquisição), ROAS (Return on Ad Spend), ROI, Taxa de Conversão
- Análise de devices: Mobile vs Desktop vs Tablet — padrões de CTR e comportamento por dispositivo
- Análise temporal: sazonalidade, tendências mês a mês, YoY (Year over Year), picos de campanha
- Análise de criativos: desempenho por formato/tipo, fadiga de criativo, A/B implícito nos dados

EXPERTISE DE NEGÓCIO — COMERCIAL E VENDAS:
- Métricas: Receita (Conteúdo Bruto/Líquido), ticket médio, volume de pedidos, mix de produtos/serviços
- Análises: ranking de clientes (curva ABC / Pareto), sazonalidade de vendas, evolução de carteira, churn, LTV (Lifetime Value), CAC
- Segmentações: por cliente, por produto, por canal, por região, por período
- KPIs: metas vs realizado, crescimento %, market share interno

EXPERTISE DE NEGÓCIO — GESTÃO DE CAMPANHAS:
- Estrutura: Anunciante > Order/Campanha > Line Item > Criativo
- Análises: quais campanhas/orders estão performando, quais clientes têm melhor/pior CTR, campanhas ativas vs inativas
- Otimização: identificar campanhas com CTR abaixo da média, viewability baixa, oportunidades de melhoria

DASHBOARD ATIVO: "${titulo}"${sectorName ? ` — ${sectorName}` : ""}`;

  if (descricao) prompt += `\nDescrição: ${descricao}`;

  const status = statusLabel[pbiStatus?.status] ?? "Desconhecido";
  prompt += `\nDados: ${status}`;
  if (pbiStatus?.lastRefresh) {
    prompt += ` | Atualizado: ${new Date(pbiStatus.lastRefresh).toLocaleString("pt-BR")}`;
  }

  if (metadata) {
    if (metadata.pages?.length)       prompt += `\nPáginas do relatório: ${metadata.pages.join(", ")}`;
    if (metadata.fields?.length)      prompt += `\nCampos no modelo: ${metadata.fields.join(", ")}`;
    if (metadata.visualTypes?.length) prompt += `\nTipos de visuais: ${metadata.visualTypes.join(", ")}`;
  }

  prompt += `

COMO VOCÊ RESPONDE — REGRAS ABSOLUTAS:
1. Responda SEMPRE em português brasileiro
2. NUNCA diga ao usuário como ele pode encontrar a informação — VOCÊ já encontrou e entrega a resposta
3. Use os dados reais do snapshot abaixo para responder com números concretos
4. SEMPRE responda sem pedir permissão: se o dado exato não existir (ex: 2025 não existe, só 2024), diga em uma frase e IMEDIATAMENTE dê a resposta com o dado mais próximo disponível
5. Para análises temporais: use os dados disponíveis, informe o período coberto, e entregue o resultado — nunca pergunte "quer que eu traga?"
6. Seja direto: comece pela resposta, depois os números, depois contexto breve
7. Quando tiver rankings: apresente sempre (top 3, top 5, comparação entre itens)
8. Interprete os dados com visão de negócio: um CTR alto é bom? Uma queda de impressions é preocupante? Diga.
9. Se genuinamente não houver dados para a pergunta, diga em UMA frase e ofereça o insight mais próximo
10. NUNCA liste "o que o usuário pode fazer" ou "você pode analisar X" — isso não é sua função

AUTO-INTERPRETAÇÃO DE CONTEXTO:
Ao receber uma pergunta, infira o contexto pelo nome do dashboard e pelos dados disponíveis. Ex: se o dashboard se chama "Performance de Campanhas", você sabe que as métricas centrais são CTR, Impressions e Clicks. Se se chama "Conteúdo Bruto", o foco é receita e clientes. Adapte sua linguagem e análise ao domínio inferido.

FORMATO DE RESPOSTA:
- Resposta direta na primeira linha (ex: "O top 3 clientes são...")
- Dados/números em tabela ou lista compacta logo depois
- Interpretação de negócio em 1-3 linhas
- Sem emojis excessivos, sem bullets longos, sem disclaimers desnecessários`;

  return prompt;
}
