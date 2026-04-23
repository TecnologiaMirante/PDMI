import { fmtAdminTime } from '../adminUtils';

export function exportAnalyticsCSV({
  periodLabel,
  hasDateFilter,
  platformTotals,
  topDashboards,
  topUsers,
  neverAccessedDashboards,
  inactiveUsersList,
  dashboardCoverage,
}) {
  const rows = [];
  const now = new Date().toLocaleString("pt-BR");

  // Cabeçalho geral
  rows.push(["Relatório de Analytics — Portal de Dados Mirante"]);
  rows.push([`Período analisado: ${periodLabel}`]);
  rows.push([`Gerado em: ${now}`]);
  rows.push([]);

  // Totais
  rows.push(["== TOTAIS GERAIS =="]);
  rows.push(["Métrica", "Valor"]);
  rows.push(["Sessões na plataforma", platformTotals.totalAccesses]);
  rows.push(["Visitas a dashboards", platformTotals.totalDashAccesses]);
  rows.push(["Tempo total", fmtAdminTime(platformTotals.totalSeconds)]);
  rows.push(["Média por sessão", fmtAdminTime(platformTotals.avgSeconds)]);
  rows.push(["Usuários ativos", platformTotals.activeUsers]);
  rows.push(["Usuários inativos", platformTotals.inactiveUsers]);
  rows.push(["Taxa de engajamento", `${platformTotals.engagementRate}%`]);
  rows.push([]);

  // Top Dashboards por acesso
  rows.push(["== TOP DASHBOARDS (por número de acessos) =="]);
  rows.push(["#", "Título", "Acessos", "Visitantes únicos", "Tempo total"]);
  topDashboards.forEach((d, i) => {
    rows.push([
      i + 1,
      d.titulo,
      d.accessCount,
      d.uniqueUsers,
      fmtAdminTime(d.totalTimeSeconds),
    ]);
  });
  rows.push([]);

  // Top Usuários
  rows.push(["== TOP USUÁRIOS (por número de acessos) =="]);
  rows.push(["#", "Nome", "Sessões", "Dashboards visitados", "Tempo total"]);
  topUsers.forEach((u, i) => {
    rows.push([
      i + 1,
      u.name,
      u.accessCount,
      u.dashCount,
      fmtAdminTime(u.totalSeconds),
    ]);
  });
  rows.push([]);

  // Engajamento por Dashboard
  rows.push(["== ENGAJAMENTO POR DASHBOARD =="]);
  rows.push([
    "Título",
    "Usuários com acesso",
    "Visitantes reais",
    "% Visitaram",
    "Acessos totais",
    "Tempo total",
  ]);
  dashboardCoverage.forEach((d) => {
    rows.push([
      d.titulo,
      d.usersWithAccess,
      d.visitors,
      `${Math.round(d.accessPct)}%`,
      d.accessCount,
      fmtAdminTime(d.totalTimeSeconds),
    ]);
  });
  rows.push([]);

  // Dashboards nunca acessados
  rows.push([
    hasDateFilter
      ? "== DASHBOARDS NÃO ACESSADOS NO PERÍODO =="
      : "== DASHBOARDS NUNCA ACESSADOS ==",
  ]);
  rows.push(["Título", "Usuários com acesso liberado"]);
  neverAccessedDashboards.forEach((d) => {
    rows.push([d.titulo, (d.users_acess || []).length]);
  });
  rows.push([]);

  // Usuários inativos
  rows.push([
    hasDateFilter
      ? "== USUÁRIOS SEM ACESSO NO PERÍODO =="
      : "== USUÁRIOS SEM NENHUM ACESSO ==",
  ]);
  rows.push(["Nome", "E-mail"]);
  inactiveUsersList.forEach((u) => {
    rows.push([u.display_name || "—", u.email]);
  });

  // Serializar CSV
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(","),
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Analytics_PDMI_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}