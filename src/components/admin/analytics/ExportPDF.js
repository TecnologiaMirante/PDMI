import { fmtAdminTime } from "../adminUtils";

export async function exportAnalyticsPDF({
  periodLabel,
  hasDateFilter,
  platformTotals,
  topDashboards,
  topUsers,
  dashboards,
  neverAccessedDashboards,
  inactiveUsersList,
  dailyChartData,
  dashboardCoverage,
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210;
  const M = 12;
  const CW = W - 2 * M;

  const C = {
    tealDark: [0, 96, 100],
    teal: [0, 131, 143],
    tealLight: [0, 172, 193],
    tealPale: [224, 247, 250],
    white: [255, 255, 255],
    dark: [15, 23, 42],
    gray: [100, 116, 139],
    light: [248, 250, 252],
    border: [226, 232, 240],
    amber: [245, 158, 11],
    amberLight: [254, 243, 199],
    green: [16, 185, 129],
    greenLight: [209, 250, 229],
    red: [239, 68, 68],
    redLight: [254, 226, 226],
    violet: [139, 92, 246],
    violetLight: [237, 233, 254],
  };

  const setFill = (rgb) => doc.setFillColor(...rgb);
  const setColor = (rgb) => doc.setTextColor(...rgb);
  const setDraw = (rgb) => doc.setDrawColor(...rgb);

  let y = 0;
  let pageNum = 1;

  const drawFooter = () => {
    setFill(C.tealDark);
    doc.rect(0, 283, W, 14, "F");
    setFill(C.teal);
    doc.rect(0, 283, W, 1.5, "F");
    setColor(C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("PORTAL DE DADOS MIRANTE", M, 289);
    doc.setFont("helvetica", "normal");
    doc.text(
      "  ·  Relatório de Analytics  ·  Confidencial",
      M + doc.getTextWidth("PORTAL DE DADOS MIRANTE"),
      289,
    );
    doc.text(`Pág. ${pageNum}`, W - M, 289, { align: "right" });
    setColor([150, 220, 226]);
    doc.setFontSize(6);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, M, 293.5);
  };

  const addPage = () => {
    drawFooter();
    doc.addPage();
    pageNum++;
    y = M + 2;
  };

  const checkPageBreak = (needed) => {
    if (y + needed > 279) addPage();
  };

  // ── HEADER ──────────────────────────────────────────────────────
  setFill(C.tealDark);
  doc.rect(0, 0, W, 38, "F");
  setFill(C.teal);
  doc.rect(0, 34, W, 4, "F");

  setColor(C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PORTAL DE DADOS MIRANTE", M, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor([200, 238, 241]);
  doc.text("Relatório de Analytics — Uso da Plataforma", M, 23);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setColor([160, 218, 223]);
  doc.text(
    `Período: ${periodLabel}  ·  Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    M,
    31,
  );

  y = 48;

  // ── KPI CARDS (2 × 4) ───────────────────────────────────────────
  const kpiRows = [
    [
      {
        label: "Sessões na Plataforma",
        value: String(platformTotals.totalAccesses),
        accent: C.teal,
        bg: C.tealPale,
      },
      {
        label: "Visitas a Dashboards",
        value: String(platformTotals.totalDashAccesses),
        accent: C.teal,
        bg: C.tealPale,
      },
      {
        label: "Tempo Total",
        value: fmtAdminTime(platformTotals.totalSeconds),
        accent: C.violet,
        bg: C.violetLight,
      },
      {
        label: "Média por Sessão",
        value: fmtAdminTime(platformTotals.avgSeconds),
        accent: C.violet,
        bg: C.violetLight,
      },
    ],
    [
      {
        label: "Usuários Ativos",
        value: String(platformTotals.activeUsers),
        accent: C.green,
        bg: C.greenLight,
      },
      {
        label: "Dashboards",
        value: String(dashboards.length),
        accent: C.teal,
        bg: C.tealPale,
      },
      {
        label: "Taxa de Engajamento",
        value: `${platformTotals.engagementRate}%`,
        accent: C.green,
        bg: C.greenLight,
      },
      {
        label: "Usuários Inativos",
        value: String(platformTotals.inactiveUsers),
        accent: C.amber,
        bg: C.amberLight,
      },
    ],
  ];

  const cardW = (CW - 9) / 4;
  kpiRows.forEach((row, ri) => {
    const ry = y + ri * 27;
    row.forEach((card, ci) => {
      const cx = M + ci * (cardW + 3);
      const ch = 23;
      setFill(card.bg);
      setDraw(C.border);
      doc.setLineWidth(0.25);
      doc.roundedRect(cx, ry, cardW, ch, 2, 2, "FD");
      setFill(card.accent);
      doc.roundedRect(cx, ry, 3.5, ch, 1.5, 1.5, "F");
      doc.rect(cx + 2, ry, 1.5, ch, "F");
      setColor(C.gray);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.text(card.label.toUpperCase(), cx + 6, ry + 7);
      setColor(C.dark);
      doc.setFont("helvetica", "bold");
      const vLen = card.value.length;
      doc.setFontSize(vLen > 8 ? 11 : vLen > 5 ? 13 : 15);
      doc.text(card.value, cx + 6, ry + 17);
    });
  });
  y += 62;

  // ── MINI BAR CHART ───────────────────────────────────────────────
  if (dailyChartData.some((d) => d.value > 0)) {
    checkPageBreak(55);
    const chartTitle = `Atividade Diária na Plataforma — ${
      periodLabel === "Todo o período" ? "Últimos 30 dias" : periodLabel
    }`;
    setFill(C.teal);
    doc.roundedRect(M, y, 4, 10, 1, 1, "F");
    doc.rect(M + 2, y, 2, 10, "F");
    setColor(C.dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(chartTitle, M + 8, y + 7);
    setDraw(C.border);
    doc.setLineWidth(0.3);
    doc.line(
      M + 8 + doc.getTextWidth(chartTitle) + 3,
      y + 5.5,
      M + CW,
      y + 5.5,
    );
    y += 14;

    const chartX = M;
    const chartH = 32;
    const chartW = CW;
    const values = dailyChartData.map((d) => d.value);
    const maxVal = Math.max(...values, 1);
    const barW = chartW / values.length - 0.5;

    setFill(C.light);
    setDraw(C.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(chartX, y, chartW, chartH + 8, 2, 2, "FD");

    [0.25, 0.5, 0.75].forEach((frac) => {
      const lineY = y + chartH - frac * chartH + 2;
      setDraw([215, 225, 235]);
      doc.setLineWidth(0.15);
      doc.line(chartX + 3, lineY, chartX + chartW - 3, lineY);
    });

    values.forEach((v, i) => {
      const bx = chartX + 2 + i * (chartW / values.length);
      const barH = (v / maxVal) * (chartH - 6);
      const by = y + chartH - barH + 2;
      const isMax = v === maxVal;
      if (barH > 0) {
        setFill(isMax ? C.tealDark : C.teal);
        if (barH < 1.5) doc.rect(bx, by, barW, Math.max(barH, 0.5), "F");
        else doc.roundedRect(bx, by, barW, barH, 0.5, 0.5, "F");
      }
      // Valor acima da barra para barras significativas (>= 30% do máx) ou máximo
      if (v > 0 && (isMax || v >= maxVal * 0.45)) {
        setColor(isMax ? C.tealDark : C.gray);
        doc.setFont("helvetica", isMax ? "bold" : "normal");
        doc.setFontSize(5);
        doc.text(String(v), bx + barW / 2, Math.max(by - 1, y + 4), {
          align: "center",
        });
      }
    });

    setColor(C.gray);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(
      dailyChartData[0]?.date?.slice(5) || "",
      chartX + 3,
      y + chartH + 6,
    );
    doc.text(
      dailyChartData[14]?.date?.slice(5) || "",
      chartX + chartW / 2,
      y + chartH + 6,
      { align: "center" },
    );
    doc.text(
      dailyChartData[dailyChartData.length - 1]?.date?.slice(5) || "",
      chartX + chartW - 3,
      y + chartH + 6,
      { align: "right" },
    );

    y += chartH + 14;
  }

  // ── HELPER ───────────────────────────────────────────────────────
  const drawSectionHeader = (title, accentColor) => {
    checkPageBreak(18);
    setFill(accentColor);
    doc.roundedRect(M, y, 4, 10, 1, 1, "F");
    doc.rect(M + 2, y, 2, 10, "F");
    setColor(C.dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(title, M + 8, y + 7);
    setDraw(C.border);
    doc.setLineWidth(0.3);
    doc.line(M + 8 + doc.getTextWidth(title) + 3, y + 5.5, M + CW, y + 5.5);
    y += 14;
  };

  const drawTableHeaderRow = (cols) => {
    setFill(C.tealDark);
    doc.rect(M, y, CW, 7.5, "F");
    setColor(C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    cols.forEach((col) =>
      doc.text(col.label, col.x, y + 5.2, { align: col.align || "left" }),
    );
    y += 7.5;
  };

  // ── TOP DASHBOARDS ───────────────────────────────────────────────
  drawSectionHeader("Top Dashboards por Número de Acessos", C.teal);
  drawTableHeaderRow([
    { label: "#", x: M + 6, align: "center" },
    { label: "DASHBOARD", x: M + 14 },
    { label: "USUÁRIOS", x: M + CW - 56, align: "right" },
    { label: "ACESSOS", x: M + CW - 30, align: "right" },
    { label: "TEMPO", x: M + CW - 3, align: "right" },
  ]);

  const maxDash = topDashboards[0]?.accessCount || 1;
  topDashboards.slice(0, 10).forEach((d, i) => {
    checkPageBreak(9.5);
    const rankColors = [
      [245, 158, 11],
      [148, 163, 184],
      [180, 120, 50],
    ];
    const isFirst = i === 0;
    const truncTitle =
      d.titulo.length > 44 ? d.titulo.slice(0, 42) + "…" : d.titulo;

    setFill(i % 2 === 0 ? C.white : C.light);
    doc.rect(M, y, CW, 9, "F");
    setDraw(C.border);
    doc.setLineWidth(0.15);
    doc.rect(M, y, CW, 9, "D");

    // Rank badge
    if (i < 3) {
      setFill(rankColors[i]);
      doc.roundedRect(M + 1.5, y + 2, 8, 5, 1, 1, "F");
      setColor(C.white);
    } else {
      setColor(C.gray);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(`#${i + 1}`, M + 5.5, y + 6, { align: "center" });

    setColor(C.dark);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(truncTitle, M + 14, y + 6);

    // Progress bar
    const barX = M + 80;
    const barW = 22;
    const filled = (d.accessCount / maxDash) * barW;
    setFill(C.border);
    doc.roundedRect(barX, y + 3.5, barW, 2, 1, 1, "F");
    setFill(isFirst ? C.tealDark : C.teal);
    if (filled > 0) doc.roundedRect(barX, y + 3.5, filled, 2, 1, 1, "F");

    setColor(C.gray);
    doc.setFontSize(7);
    doc.text(`${d.uniqueUsers} us.`, M + CW - 56, y + 6, { align: "right" });
    setColor(C.dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`${d.accessCount}`, M + CW - 30, y + 6, { align: "right" });
    setColor(C.gray);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(fmtAdminTime(d.totalTimeSeconds || 0), M + CW - 3, y + 6, {
      align: "right",
    });
    y += 9;
  });
  y += 8;

  // ── TOP USUÁRIOS ─────────────────────────────────────────────────
  drawSectionHeader("Usuários Mais Ativos", C.green);
  drawTableHeaderRow([
    { label: "#", x: M + 6, align: "center" },
    { label: "USUÁRIO", x: M + 14 },
    { label: "DASHBOARDS", x: M + CW - 60, align: "right" },
    { label: "SESSÕES", x: M + CW - 33, align: "right" },
    { label: "TEMPO", x: M + CW - 3, align: "right" },
  ]);

  const maxUser = topUsers[0]?.accessCount || 1;
  topUsers.slice(0, 10).forEach((u, i) => {
    checkPageBreak(9.5);
    const rankColors = [
      [245, 158, 11],
      [148, 163, 184],
      [180, 120, 50],
    ];
    const isFirst = i === 0;
    const truncName = u.name.length > 44 ? u.name.slice(0, 42) + "…" : u.name;

    setFill(i % 2 === 0 ? C.white : C.light);
    doc.rect(M, y, CW, 9, "F");
    setDraw(C.border);
    doc.setLineWidth(0.15);
    doc.rect(M, y, CW, 9, "D");

    if (i < 3) {
      setFill(rankColors[i]);
      doc.roundedRect(M + 1.5, y + 2, 8, 5, 1, 1, "F");
      setColor(C.white);
    } else {
      setColor(C.gray);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(`#${i + 1}`, M + 5.5, y + 6, { align: "center" });

    setColor(C.dark);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(truncName, M + 14, y + 6);

    const barX = M + 80;
    const barW = 22;
    const filled = (u.accessCount / maxUser) * barW;
    setFill(C.border);
    doc.roundedRect(barX, y + 3.5, barW, 2, 1, 1, "F");
    setFill(isFirst ? [5, 150, 105] : C.green);
    if (filled > 0) doc.roundedRect(barX, y + 3.5, filled, 2, 1, 1, "F");

    setColor(C.gray);
    doc.setFontSize(7);
    doc.text(`${u.dashCount} dash.`, M + CW - 60, y + 6, { align: "right" });
    setColor(C.dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`${u.accessCount}`, M + CW - 33, y + 6, { align: "right" });
    setColor(C.gray);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(fmtAdminTime(u.totalSeconds), M + CW - 3, y + 6, {
      align: "right",
    });
    y += 9;
  });
  y += 8;

  // ── ENGAJAMENTO POR DASHBOARD ────────────────────────────────────
  if (dashboardCoverage.length > 0) {
    drawSectionHeader("Engajamento por Dashboard", C.teal);
    drawTableHeaderRow([
      { label: "DASHBOARD", x: M + 5 },
      { label: "LIBERADOS", x: M + CW - 68, align: "right" },
      { label: "VISITARAM", x: M + CW - 48, align: "right" },
      { label: "ENGAJ.", x: M + CW - 24, align: "right" },
      { label: "ACESSOS", x: M + CW - 3, align: "right" },
    ]);

    dashboardCoverage.forEach((d, i) => {
      checkPageBreak(9.5);
      const pct = Math.round(d.accessPct);
      const truncTitle =
        d.titulo.length > 36 ? d.titulo.slice(0, 34) + "…" : d.titulo;
      const barColor = pct >= 75 ? C.green : pct >= 40 ? C.teal : C.amber;
      const textColor = pct >= 75 ? C.green : pct >= 40 ? C.teal : C.amber;

      setFill(i % 2 === 0 ? C.white : C.light);
      doc.rect(M, y, CW, 9, "F");
      setDraw(C.border);
      doc.setLineWidth(0.15);
      doc.rect(M, y, CW, 9, "D");

      setColor(C.dark);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(truncTitle, M + 5, y + 6);

      const barX = M + 98;
      const barW = 18;
      const filled = (pct / 100) * barW;
      setFill(C.border);
      doc.roundedRect(barX, y + 3.5, barW, 2, 1, 1, "F");
      setFill(barColor);
      if (filled > 0) doc.roundedRect(barX, y + 3.5, filled, 2, 1, 1, "F");

      setColor(C.gray);
      doc.setFontSize(7);
      doc.text(`${d.usersWithAccess}`, M + CW - 68, y + 6, { align: "right" });
      doc.text(`${d.visitors}`, M + CW - 48, y + 6, { align: "right" });
      setColor(textColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(`${pct}%`, M + CW - 24, y + 6, { align: "right" });
      setColor(C.dark);
      doc.setFontSize(7.5);
      doc.text(`${d.accessCount}`, M + CW - 3, y + 6, { align: "right" });
      y += 9;
    });
    y += 8;
  }

  // ── DASHBOARDS NUNCA ACESSADOS ───────────────────────────────────
  if (neverAccessedDashboards.length > 0) {
    drawSectionHeader(
      hasDateFilter
        ? "Dashboards Não Acessados no Período"
        : "Dashboards Nunca Acessados",
      C.amber,
    );

    setFill(C.amberLight);
    doc.rect(M, y, CW, 7, "F");
    setColor([146, 64, 14]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text("DASHBOARD", M + 5, y + 5);
    doc.text("USUÁRIOS COM ACESSO", M + CW - 3, y + 5, { align: "right" });
    y += 7;

    neverAccessedDashboards.forEach((d, i) => {
      checkPageBreak(8);
      setFill(i % 2 === 0 ? C.white : [255, 251, 235]);
      doc.rect(M, y, CW, 7.5, "F");
      setDraw([253, 230, 138]);
      doc.setLineWidth(0.15);
      doc.rect(M, y, CW, 7.5, "D");
      setColor(C.dark);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        d.titulo.length > 55 ? d.titulo.slice(0, 53) + "…" : d.titulo,
        M + 5,
        y + 5.5,
      );
      setColor(C.gray);
      doc.setFontSize(7);
      doc.text(
        `${(d.users_acess || []).length} liberados`,
        M + CW - 3,
        y + 5.5,
        { align: "right" },
      );
      y += 7.5;
    });
    y += 8;
  }

  // ── USUÁRIOS INATIVOS ────────────────────────────────────────────
  if (inactiveUsersList.length > 0) {
    drawSectionHeader("Usuários Sem Nenhum Acesso no Período", C.red);

    setFill(C.redLight);
    doc.rect(M, y, CW, 7, "F");
    setColor([153, 27, 27]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text("NOME", M + 5, y + 5);
    doc.text("E-MAIL", M + CW - 3, y + 5, { align: "right" });
    y += 7;

    inactiveUsersList.forEach((u, i) => {
      checkPageBreak(8);
      setFill(i % 2 === 0 ? C.white : [255, 241, 242]);
      doc.rect(M, y, CW, 7.5, "F");
      setDraw([254, 202, 202]);
      doc.setLineWidth(0.15);
      doc.rect(M, y, CW, 7.5, "D");
      setColor(C.dark);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(u.display_name || "Sem Nome", M + 5, y + 5.5);
      setColor(C.gray);
      doc.setFontSize(7);
      doc.text(u.email || "", M + CW - 3, y + 5.5, { align: "right" });
      y += 7.5;
    });
    y += 8;
  }

  drawFooter();
  doc.save(`Analytics_PDMI_${new Date().toISOString().slice(0, 10)}.pdf`);
}
