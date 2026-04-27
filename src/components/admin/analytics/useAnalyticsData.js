import { useState, useEffect, useMemo } from "react";
import { getAllUserStats } from "@infra/firebase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useAnalyticsData(dashboards, users) {
  const [allStats, setAllStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [showActiveUsers, setShowActiveUsers] = useState(false);
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const getSessionStorage = (key, defaultVal) => {
    try {
      const val = sessionStorage.getItem(key);
      return val ? JSON.parse(val) : defaultVal;
    } catch {
      return defaultVal;
    }
  };

  const [dateFilter, setDateFilter] = useState(() =>
    getSessionStorage("pdmi_analytics_dateFilter", "all"),
  );
  const [customDate, setCustomDate] = useState(() => {
    const val = getSessionStorage("pdmi_analytics_customDate", undefined);
    return val ? new Date(val) : undefined;
  });
  const [customRange, setCustomRange] = useState(() => {
    const val = getSessionStorage("pdmi_analytics_customRange", {
      from: undefined,
      to: undefined,
    });
    return {
      from: val?.from ? new Date(val.from) : undefined,
      to: val?.to ? new Date(val.to) : undefined,
    };
  });
  const [selectedDashboards, setSelectedDashboards] = useState(() =>
    getSessionStorage("pdmi_analytics_selectedDashboards", null),
  );

  const [showNeverAccessed, setShowNeverAccessed] = useState(false);
  const [showInactiveAlert, setShowInactiveAlert] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(
      "pdmi_analytics_dateFilter",
      JSON.stringify(dateFilter),
    );
  }, [dateFilter]);

  useEffect(() => {
    sessionStorage.setItem(
      "pdmi_analytics_customDate",
      JSON.stringify(customDate),
    );
  }, [customDate]);

  useEffect(() => {
    sessionStorage.setItem(
      "pdmi_analytics_customRange",
      JSON.stringify(customRange),
    );
  }, [customRange]);

  useEffect(() => {
    sessionStorage.setItem(
      "pdmi_analytics_selectedDashboards",
      JSON.stringify(selectedDashboards),
    );
  }, [selectedDashboards]);

  const handleDateFilterChange = (val) => {
    setDateFilter(val);
    // Limpa o estado do calendário oposto ao que foi selecionado
    if (val !== "custom_date") setCustomDate(undefined);
    if (val !== "custom_range")
      setCustomRange({ from: undefined, to: undefined });
  };

  useEffect(() => {
    getAllUserStats()
      .then(setAllStats)
      .catch(() => setAllStats([]))
      .finally(() => setLoading(false));
  }, []);

  const { minDate, maxDate } = useMemo(() => {
    const now = new Date();
    if (dateFilter === "all") return { minDate: null, maxDate: null };

    if (dateFilter === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { minDate: start, maxDate: end };
    }
    if (dateFilter === "7days") {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { minDate: start, maxDate: null };
    }
    if (dateFilter === "30days") {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { minDate: start, maxDate: null };
    }
    if (dateFilter === "custom_date") {
      if (!customDate) return { minDate: null, maxDate: null };
      const start = new Date(customDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customDate);
      end.setHours(23, 59, 59, 999);
      return { minDate: start, maxDate: end };
    }
    if (dateFilter === "custom_range") {
      if (!customRange?.from || !customRange?.to)
        return { minDate: null, maxDate: null };
      const start = new Date(customRange.from);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customRange.to);
      end.setHours(23, 59, 59, 999);
      return { minDate: start, maxDate: end };
    }
    return { minDate: null, maxDate: null };
  }, [dateFilter, customDate, customRange]);

  const filteredStats = useMemo(() => {
    if (!minDate) return allStats;

    const isInRange = (dateStr) => {
      const d = new Date(dateStr + "T00:00:00");
      if (maxDate) return d >= minDate && d <= maxDate;
      return d >= minDate;
    };

    const isLegacyInRangeCheck = (dateStrOrMs) => {
      if (!dateStrOrMs) return false;
      let d;
      if (typeof dateStrOrMs === "number") d = new Date(dateStrOrMs);
      else if (dateStrOrMs.includes("T")) d = new Date(dateStrOrMs);
      else d = new Date(dateStrOrMs + "T00:00:00");

      if (isNaN(d.getTime())) return false;
      if (maxDate) return d >= minDate && d <= maxDate;
      return d >= minDate;
    };

    return allStats
      .map((s) => {
        const hasPlatformDaily =
          s.platform?.dailyAccesses &&
          Object.keys(s.platform.dailyAccesses).length > 0;

        const isUserLegacyInRange =
          !hasPlatformDaily &&
          isLegacyInRangeCheck(s.platform?.lastAccess || s.lastAccess);

        const filteredPlatformDaily = hasPlatformDaily
          ? Object.fromEntries(
              Object.entries(s.platform.dailyAccesses).filter(([date]) =>
                isInRange(date),
              ),
            )
          : {};

        const filteredPlatformAccesses = hasPlatformDaily
          ? Object.values(filteredPlatformDaily).reduce((acc, v) => acc + v, 0)
          : isUserLegacyInRange
            ? s.platform?.accessCount || 0
            : 0;

        const filteredPlatformTimeSeconds = hasPlatformDaily
          ? Object.values(
              Object.fromEntries(
                Object.entries(s.platform?.dailyTimeSeconds || {}).filter(
                  ([date]) => isInRange(date),
                ),
              ),
            ).reduce((acc, v) => acc + v, 0)
          : isUserLegacyInRange
            ? s.platform?.totalTimeSeconds || 0
            : 0;

        const filteredDashboards = {};
        Object.entries(s.dashboards || {}).forEach(([dashId, data]) => {
          const hasDashDaily =
            data.dailyAccesses && Object.keys(data.dailyAccesses).length > 0;

          if (hasDashDaily) {
            const filteredDaily = Object.fromEntries(
              Object.entries(data.dailyAccesses).filter(([date]) =>
                isInRange(date),
              ),
            );
            const filteredDailyTime = Object.fromEntries(
              Object.entries(data.dailyTimeSeconds || {}).filter(([date]) =>
                isInRange(date),
              ),
            );
            const filteredAccessCount = Object.values(filteredDaily).reduce(
              (acc, v) => acc + v,
              0,
            );
            const filteredTimeSeconds = Object.values(filteredDailyTime).reduce(
              (acc, v) => acc + v,
              0,
            );
            if (filteredAccessCount > 0) {
              filteredDashboards[dashId] = {
                ...data,
                accessCount: filteredAccessCount,
                totalTimeSeconds: filteredTimeSeconds,
                _legacy: false,
              };
            }
          } else {
            if (isUserLegacyInRange && data.accessCount > 0) {
              filteredDashboards[dashId] = {
                ...data,
                accessCount: data.accessCount || 0,
                totalTimeSeconds: data.totalTimeSeconds || 0,
                _legacy: true,
              };
            }
          }
        });

        if (
          filteredPlatformAccesses === 0 &&
          Object.keys(filteredDashboards).length === 0
        ) {
          return null;
        }

        return {
          ...s,
          platform: {
            ...s.platform,
            accessCount: filteredPlatformAccesses,
            totalTimeSeconds: filteredPlatformTimeSeconds,
            dailyAccesses: filteredPlatformDaily,
          },
          dashboards: filteredDashboards,
          _hasLegacyData: !hasPlatformDaily && isUserLegacyInRange,
        };
      })
      .filter(Boolean);
  }, [allStats, minDate, maxDate]);

  const hasLegacyDataInFilter = useMemo(
    () => minDate && filteredStats.some((s) => s._hasLegacyData),
    [filteredStats, minDate],
  );

  const isFilteringByDash = selectedDashboards !== null;
  const selectedDashboardSet = useMemo(
    () => (selectedDashboards ? new Set(selectedDashboards) : new Set()),
    [selectedDashboards],
  );

  const userMap = useMemo(() => {
    const m = {};
    users.forEach((u) => {
      m[u.id || u.uid] = u.display_name || u.email;
    });
    return m;
  }, [users]);

  const dashMap = useMemo(() => {
    const m = {};
    dashboards.forEach((d) => {
      m[d.id] = d.titulo;
    });
    return m;
  }, [dashboards]);

  // ── Totais gerais ──
  const platformTotals = useMemo(() => {
    let totalAccesses = 0,
      totalSeconds = 0,
      activeUsers = 0,
      totalDashAccesses = 0;
    filteredStats.forEach((s) => {
      const ac = s.platform?.accessCount || 0;
      totalAccesses += ac;
      totalSeconds += s.platform?.totalTimeSeconds || 0;
      if (ac > 0) activeUsers++;
      Object.entries(s.dashboards || {}).forEach(([dashId, d]) => {
        if (isFilteringByDash && !selectedDashboardSet.has(dashId)) return;
        totalDashAccesses += d.accessCount || 0;
      });
    });
    const avgSeconds =
      totalAccesses > 0 ? Math.round(totalSeconds / totalAccesses) : 0;
    const inactiveUsers = users.length - activeUsers;
    const engagementRate =
      users.length > 0 ? Math.round((activeUsers / users.length) * 100) : 0;
    return {
      totalAccesses,
      totalSeconds,
      activeUsers,
      totalDashAccesses,
      avgSeconds,
      inactiveUsers,
      engagementRate,
    };
  }, [filteredStats, users, isFilteringByDash, selectedDashboardSet]);

  // ── Dados diários para o gráfico (respeita o filtro de período) ──
  const dailyChartData = useMemo(() => {
    const aggMap = {};
    const sourceStats = minDate ? filteredStats : allStats;
    sourceStats.forEach((s) => {
      Object.entries(s.platform?.dailyAccesses || {}).forEach(
        ([date, count]) => {
          aggMap[date] = (aggMap[date] || 0) + count;
        },
      );
    });

    // Determina o intervalo de dias a exibir
    const endDate = maxDate ? new Date(maxDate) : new Date();
    endDate.setHours(0, 0, 0, 0);
    const startDate = minDate ? new Date(minDate) : new Date();
    startDate.setHours(0, 0, 0, 0);
    if (!minDate) startDate.setDate(startDate.getDate() - 29);

    const result = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dateStr = cur.toISOString().slice(0, 10);
      result.push({ date: dateStr, value: aggMap[dateStr] || 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [filteredStats, allStats, minDate, maxDate]);

  // ── Top dashboards por acesso ──
  const topDashboards = useMemo(() => {
    const map = {};
    filteredStats.forEach((s) => {
      Object.entries(s.dashboards || {}).forEach(([dashId, data]) => {
        if (isFilteringByDash && !selectedDashboardSet.has(dashId)) return;
        if (!map[dashId])
          map[dashId] = { accessCount: 0, totalTimeSeconds: 0, uniqueUsers: 0 };
        map[dashId].accessCount += data.accessCount || 0;
        map[dashId].totalTimeSeconds += data.totalTimeSeconds || 0;
        map[dashId].uniqueUsers += 1;
      });
    });
    return Object.entries(map)
      .map(([id, data]) => ({ id, titulo: dashMap[id] || id, ...data }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 8);
  }, [filteredStats, dashMap, isFilteringByDash, selectedDashboardSet]);

  // ── Top dashboards por tempo ──
  const topDashboardsByTime = useMemo(() => {
    const map = {};
    filteredStats.forEach((s) => {
      Object.entries(s.dashboards || {}).forEach(([dashId, data]) => {
        if (isFilteringByDash && !selectedDashboardSet.has(dashId)) return;
        if (!map[dashId])
          map[dashId] = { accessCount: 0, totalTimeSeconds: 0, uniqueUsers: 0 };
        map[dashId].accessCount += data.accessCount || 0;
        map[dashId].totalTimeSeconds += data.totalTimeSeconds || 0;
        map[dashId].uniqueUsers += 1;
      });
    });
    return Object.entries(map)
      .map(([id, data]) => ({ id, titulo: dashMap[id] || id, ...data }))
      .sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds)
      .slice(0, 8);
  }, [filteredStats, dashMap, isFilteringByDash, selectedDashboardSet]);

  // ── Top usuários ──
  const topUsers = useMemo(() => {
    return filteredStats
      .filter((s) => s.platform?.accessCount > 0)
      .map((s) => ({
        uid: s.uid,
        name: userMap[s.uid] || s.uid,
        accessCount: s.platform?.accessCount || 0,
        totalSeconds: s.platform?.totalTimeSeconds || 0,
        dashCount: Object.keys(s.dashboards || {}).length,
        lastAccess: s.platform?.lastAccess,
      }))
      .sort(
        (a, b) =>
          b.accessCount - a.accessCount || b.totalSeconds - a.totalSeconds,
      )
      .slice(0, 8);
  }, [filteredStats, userMap]);

  // ── Usuários inativos ──
  const inactiveUsersList = useMemo(() => {
    const activeUids = new Set(filteredStats.map((s) => s.uid));
    return users.filter((u) => !activeUids.has(u.id || u.uid));
  }, [filteredStats, users]);

  // ── Dashboards nunca acessados ──
  const neverAccessedDashboards = useMemo(() => {
    const accessedIds = new Set(
      filteredStats.flatMap((s) => Object.keys(s.dashboards || {})),
    );
    const pool = isFilteringByDash
      ? dashboards.filter((d) => selectedDashboardSet.has(d.id))
      : dashboards;
    return pool.filter((d) => !accessedIds.has(d.id));
  }, [filteredStats, dashboards, isFilteringByDash, selectedDashboardSet]);

  // ── Engajamento por dashboard ──
  const dashboardCoverage = useMemo(() => {
    const totalUsers = users.length || 1;
    const accessMap = {};
    filteredStats.forEach((s) => {
      Object.entries(s.dashboards || {}).forEach(([dashId, data]) => {
        if (isFilteringByDash && !selectedDashboardSet.has(dashId)) return;
        if (!accessMap[dashId])
          accessMap[dashId] = {
            visitors: 0,
            accessCount: 0,
            totalTimeSeconds: 0,
          };
        accessMap[dashId].visitors += 1;
        accessMap[dashId].accessCount += data.accessCount || 0;
        accessMap[dashId].totalTimeSeconds += data.totalTimeSeconds || 0;
      });
    });
    const pool = isFilteringByDash
      ? dashboards.filter((d) => selectedDashboardSet.has(d.id))
      : dashboards;
    return pool
      .map((d) => ({
        id: d.id,
        titulo: d.titulo,
        usersWithAccess: (d.users_acess || []).length,
        visitors: accessMap[d.id]?.visitors || 0,
        accessCount: accessMap[d.id]?.accessCount || 0,
        totalTimeSeconds: accessMap[d.id]?.totalTimeSeconds || 0,
        accessPct:
          (d.users_acess || []).length > 0
            ? ((accessMap[d.id]?.visitors || 0) /
                (d.users_acess || []).length) *
              100
            : 0,
        coveragePct: ((d.users_acess || []).length / totalUsers) * 100,
      }))
      .filter((d) => d.usersWithAccess > 0)
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);
  }, [
    filteredStats,
    dashboards,
    users,
    isFilteringByDash,
    selectedDashboardSet,
  ]);

  const maxDashAccess = topDashboards[0]?.accessCount || 1;
  const maxDashTime = topDashboardsByTime[0]?.totalTimeSeconds || 1;
  const maxUserAccess = topUsers[0]?.accessCount || 1;

  const showAlertsSection =
    neverAccessedDashboards.length > 0 || inactiveUsersList.length > 0;

  const periodLabel = useMemo(() => {
    switch (dateFilter) {
      case "all":
        return "Todo o período";
      case "today":
        return "Hoje";
      case "7days":
        return "Últimos 7 dias";
      case "30days":
        return "Últimos 30 dias";
      case "custom_date":
        return customDate
          ? `Data: ${format(customDate, "dd/MM/yyyy")}`
          : "Data Única";
      case "custom_range":
        return customRange?.from && customRange?.to
          ? `Período de ${format(customRange.from, "dd/MM/yyyy")} a ${format(customRange.to, "dd/MM/yyyy")}`
          : "Intervalo Customizado";
      default:
        return "";
    }
  }, [dateFilter, customDate, customRange]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportAnalyticsPDF({
        periodLabel,
        hasDateFilter: dateFilter !== "all",
        platformTotals,
        topDashboards,
        topUsers,
        dashboards,
        neverAccessedDashboards,
        inactiveUsersList,
        dailyChartData,
        dashboardCoverage,
      });
    } catch (e) {
      console.error("Erro ao exportar PDF:", e);
      toast.error("Erro ao gerar o PDF. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    setExportingCSV(true);
    try {
      exportAnalyticsCSV({
        periodLabel,
        hasDateFilter: dateFilter !== "all",
        platformTotals,
        topDashboards,
        topUsers,
        neverAccessedDashboards,
        inactiveUsersList,
        dashboardCoverage,
      });
    } catch (e) {
      console.error("Erro ao exportar CSV:", e);
      toast.error("Erro ao gerar o CSV. Tente novamente.");
    } finally {
      setExportingCSV(false);
    }
  };

  const noExportData = useMemo(() => {
    return (
      filteredStats.length === 0 ||
      (selectedDashboards !== null && selectedDashboards.length === 0)
    );
  }, [filteredStats, selectedDashboards]);

  const noExportDataTitle = useMemo(() => {
    if (!noExportData) return undefined;
    return selectedDashboards !== null && selectedDashboards.length === 0
      ? "Nenhum dashboard selecionado"
      : "Sem dados no período selecionado";
  }, [noExportData, selectedDashboards]);

  return {
    loading,
    allStats,
    dateFilter,
    setDateFilter,
    customDate,
    setCustomDate,
    customRange,
    setCustomRange,
    selectedDashboards,
    setSelectedDashboards,
    showNeverAccessed,
    setShowNeverAccessed,
    showInactiveAlert,
    setShowInactiveAlert,
    showActiveUsers,
    setShowActiveUsers,
    showInactiveUsers,
    setShowInactiveUsers,
    exporting,
    setExporting,
    exportingCSV,
    setExportingCSV,
    handleDateFilterChange,
    minDate,
    maxDate,
    periodLabel,
    filteredStats,
    isFilteringByDash,
    selectedDashboardSet,
    hasLegacyDataInFilter,
    platformTotals,
    topDashboards,
    topUsers,
    topDashboardsByTime,
    neverAccessedDashboards,
    inactiveUsersList,
    dashboardCoverage,
    dailyChartData,
    noExportData,
    noExportDataTitle,
    showAlertsSection,
    maxDashAccess,
    maxDashTime,
    maxUserAccess,
  };
}
