const fs = require('fs');
const content = fs.readFileSync('src/components/admin/AnalyticsTab.jsx', 'utf8');

const startIndex = content.indexOf('export default function AnalyticsTab({');
const functionBodyStart = content.indexOf('{', startIndex) + 1;
const loadingReturnIndex = content.indexOf('if (loading) {', functionBodyStart);

let hookBody = content.substring(functionBodyStart, loadingReturnIndex);

fs.writeFileSync('src/components/admin/analytics/useAnalyticsData.js', `import { useState, useEffect, useMemo } from 'react';
import { getAllUserStats } from '../../../services/analyticsService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function useAnalyticsData(dashboards, users) {
${hookBody}
  return {
    loading,
    allStats,
    dateFilter, setDateFilter,
    customDate, setCustomDate,
    customRange, setCustomRange,
    selectedDashboards, setSelectedDashboards,
    showNeverAccessed, setShowNeverAccessed,
    showInactiveAlert, setShowInactiveAlert,
    showActiveUsers, setShowActiveUsers,
    showInactiveUsers, setShowInactiveUsers,
    exporting, setExporting,
    exportingCSV, setExportingCSV,
    handleDateFilterChange,
    minDate, maxDate, periodLabel,
    filteredStats,
    isFilteringByDash, selectedDashboardSet,
    hasLegacyDataInFilter,
    platformTotals,
    topDashboards, topUsers, topDashboardsByTime,
    neverAccessedDashboards, inactiveUsersList,
    dashboardCoverage,
    dailyChartData,
    noExportData, noExportDataTitle
  };
}
`);

console.log("Hook extracted");
