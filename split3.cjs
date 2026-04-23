const fs = require('fs');
const content = fs.readFileSync('src/components/admin/AnalyticsTab.jsx', 'utf8');

const loadingIndex = content.indexOf('if (loading) {');
const endIndex = content.lastIndexOf('}');
const renderBody = content.substring(loadingIndex, endIndex);

fs.writeFileSync('src/components/admin/AnalyticsTab.jsx', `import React from 'react';
import { Download, FileText, Filter, CalendarIcon, LayoutDashboard, Clock, TrendingUp, Users, Award, Monitor, AlertTriangle, UserX, ChevronDown, ChevronUp, Percent, Timer, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { fmtAdminTime } from "./adminUtils";
import { ActiveUsersPopover, InactiveUsersPopover } from "./AdminShared";

import { exportAnalyticsCSV } from './analytics/ExportCSV';
import { exportAnalyticsPDF } from './analytics/ExportPDF';
import { DashboardMultiSelect } from './analytics/DashboardMultiSelect';
import { LineChart } from './analytics/LineChart';
import { StatCard } from './analytics/StatCard';
import { CoverageDualBar } from './analytics/CoverageDualBar';
import { useAnalyticsData } from './analytics/useAnalyticsData';

export default function AnalyticsTab({ dashboards, users }) {
  const {
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
  } = useAnalyticsData(dashboards, users);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportAnalyticsPDF({
        periodLabel,
        hasDateFilter: dateFilter !== "all",
        platformTotals,
        dashboards,
        topDashboards,
        topUsers,
        neverAccessedDashboards,
        inactiveUsersList,
        dashboardCoverage,
        dailyChartData
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

  ${renderBody}
}
`);

console.log("AnalyticsTab cleanly rebuilt");
