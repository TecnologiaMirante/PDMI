import React from "react";
import {
  Download,
  FileText,
  Filter,
  CalendarIcon,
  LayoutDashboard,
  Clock,
  TrendingUp,
  Users,
  Award,
  Monitor,
  AlertTriangle,
  UserX,
  ChevronDown,
  ChevronUp,
  Percent,
  Timer,
  Activity,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { fmtAdminTime } from "./adminUtils";
import { ActiveUsersPopover, InactiveUsersPopover } from "./AdminShared";

import { exportAnalyticsCSV } from "./analytics/ExportCSV";
import { exportAnalyticsPDF } from "./analytics/ExportPDF";
import { DashboardMultiSelect } from "./analytics/DashboardMultiSelect";
import { LineChart } from "./analytics/LineChart";
import { StatCard } from "./analytics/StatCard";
import { CoverageDualBar } from "./analytics/CoverageDualBar";
import { useAnalyticsData } from "./analytics/useAnalyticsData";

export default function AnalyticsTab({ dashboards, users }) {
  const {
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
    maxUserTime,
    dataCollectionStart,
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
        dailyChartData,
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-foreground">
                Analytics da Plataforma
              </h2>
              {dateFilter !== "all" && (
                <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0">
                  Filtrado por data
                </span>
              )}
              {isFilteringByDash && (
                <span className="bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0">
                  {selectedDashboards?.length === 0
                    ? "Nenhum dashboard"
                    : `${selectedDashboards?.length} dashboard${selectedDashboards?.length > 1 ? "s" : ""}`}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
              {dateFilter !== "all" || isFilteringByDash
                ? `Exibindo dados de ${platformTotals.activeUsers} usuário${platformTotals.activeUsers !== 1 ? "s" : ""} em ${periodLabel.toLowerCase()}`
                : "Dados de uso globais coletados em tempo real"}
            </p>
            {dataCollectionStart && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Coleta iniciada em{" "}
                {new Date(dataCollectionStart + "T00:00:00").toLocaleDateString(
                  "pt-BR",
                  { day: "2-digit", month: "2-digit", year: "numeric" },
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleExportCSV}
              disabled={exportingCSV || noExportData}
              className="gap-2"
              variant="outline"
              size="sm"
              title={noExportDataTitle}
            >
              {exportingCSV ? (
                <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              <span className="hidden sm:inline">
                {exportingCSV ? "Gerando..." : "Exportar CSV"}
              </span>
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={exporting || noExportData}
              className="gap-2"
              variant="outline"
              size="sm"
              title={noExportDataTitle}
            >
              {exporting ? (
                <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <FileText className="size-3.5" />
              )}
              <span className="hidden sm:inline">
                {exporting ? "Gerando PDF..." : "Exportar PDF"}
              </span>
            </Button>
          </div>
        </div>

        {/* ── Toolbar de Filtros ── */}
        <div className="bg-card/50 border border-border p-2 rounded-xl shadow-sm flex flex-wrap items-center gap-2">
          <DashboardMultiSelect
            dashboards={dashboards}
            selected={selectedDashboards}
            onChange={setSelectedDashboards}
          />

          <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

          <Select value={dateFilter} onValueChange={handleDateFilterChange}>
            <SelectTrigger className="w-42 h-9 text-xs font-semibold bg-background">
              <Filter className="size-3.5 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="custom_date">Data Única</SelectItem>
              <SelectItem value="custom_range">Intervalo</SelectItem>
            </SelectContent>
          </Select>

          {dateFilter === "custom_date" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-45 justify-start text-left font-normal text-xs bg-background shrink-0",
                    !customDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {customDate
                      ? format(customDate, "PPP", { locale: ptBR })
                      : "Selecione a data"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customDate}
                  onSelect={setCustomDate}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          )}

          {dateFilter === "custom_range" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-65 justify-start text-left font-normal text-xs bg-background shrink-0",
                    !customRange?.from && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {customRange?.from
                      ? customRange.to
                        ? `${format(customRange.from, "PP", { locale: ptBR })} - ${format(customRange.to, "PP", { locale: ptBR })}`
                        : format(customRange.from, "PP", { locale: ptBR })
                      : "Escolha o período"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={customRange?.from}
                  selected={customRange}
                  onSelect={setCustomRange}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          )}

          {(dateFilter !== "all" || isFilteringByDash) && (
            <Button
              onClick={() => {
                handleDateFilterChange("all");
                setSelectedDashboards(null);
              }}
              variant="ghost"
              size="sm"
              className="h-9 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ml-auto shrink-0"
            >
              Limpar filtros
            </Button>
          )}
        </div>

        {/* ── Empty state: nenhum dashboard selecionado ── */}
        {selectedDashboards !== null && selectedDashboards.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 border border-dashed border-violet-500/30 rounded-2xl bg-violet-500/5">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <LayoutDashboard className="size-5 text-violet-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">
                Nenhum dashboard selecionado
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione pelo menos um dashboard para ver os dados.
              </p>
            </div>
            <button
              onClick={() => setSelectedDashboards(null)}
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-semibold mt-1"
            >
              Mostrar todos os dashboards
            </button>
          </div>
        )}

        {/* ── Empty state quando filtro de data não retorna dados ── */}
        {filteredStats.length === 0 && dateFilter !== "all" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 border border-dashed border-border rounded-2xl bg-muted/20">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <Filter className="size-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">
                Nenhum dado para este período
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Não há registros de acesso em{" "}
                <span className="font-medium text-primary">{periodLabel}</span>.
              </p>
            </div>
            <button
              onClick={() => handleDateFilterChange("all")}
              className="text-xs text-primary hover:underline font-semibold mt-1"
            >
              Limpar filtro de data
            </button>
          </div>
        )}

        {/* ── Cards de Totais: linha 1 ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Activity className="text-primary size-5" />}
            label="Sessões na plataforma"
            value={platformTotals.totalAccesses}
          />
          <StatCard
            icon={<LayoutDashboard className="text-primary size-5" />}
            label="Visitas a dashboards"
            value={platformTotals.totalDashAccesses}
            sub="cliques em painéis"
          />
          <StatCard
            icon={<Clock className="text-primary size-5" />}
            label="Tempo total"
            value={fmtAdminTime(platformTotals.totalSeconds)}
            sub={
              hasLegacyDataInFilter
                ? "⚠ estimado via tempo em dashboards"
                : undefined
            }
          />
          <StatCard
            icon={<TrendingUp className="text-primary size-5" />}
            label="Média por sessão"
            value={fmtAdminTime(platformTotals.avgSeconds)}
            sub={
              hasLegacyDataInFilter
                ? "⚠ baseado no tempo em dashboards"
                : undefined
            }
          />
        </div>

        {/* ── Cards de Totais: linha 2 ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Usuários Ativos com popover */}
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm relative">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="text-primary size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground leading-none mb-1">
                {minDate ? "Ativos no período" : "Usuários ativos"}
              </p>
              <p className="text-xl font-black text-foreground leading-none">
                {platformTotals.activeUsers}
              </p>
            </div>
            <button
              onClick={() => setShowActiveUsers((v) => !v)}
              className={`cursor-pointer shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                showActiveUsers
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
              title="Ver quem são os usuários ativos"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
            {showActiveUsers && (
              <ActiveUsersPopover
                topUsers={topUsers}
                onClose={() => setShowActiveUsers(false)}
              />
            )}
          </div>

          <StatCard
            icon={<Monitor className="text-primary size-5" />}
            label="Dashboards cadastrados"
            value={dashboards.length}
            sub={`${neverAccessedDashboards.length} ${minDate ? "sem acesso no período" : "nunca acessados"}`}
          />
          <StatCard
            icon={<Percent className="text-primary size-5" />}
            label="Taxa de engajamento"
            value={`${platformTotals.engagementRate}%`}
            sub={`${platformTotals.activeUsers} de ${users.length} usuários`}
            accent
          />
          <div className="bg-amber-50/30 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 shadow-sm relative dark:bg-amber-950/10">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <UserX className="text-amber-500 size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground leading-none mb-1">
                {minDate ? "Sem acesso no período" : "Usuários inativos"}
              </p>
              <p className="text-xl font-black text-foreground leading-none">
                {platformTotals.inactiveUsers}
              </p>
            </div>
            <button
              onClick={() => setShowInactiveUsers((v) => !v)}
              className={`cursor-pointer shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                showInactiveUsers
                  ? "border-amber-500 bg-amber-500/10 text-amber-500"
                  : "border-border text-muted-foreground hover:border-amber-500 hover:text-amber-500"
              }`}
              title="Ver quem são os usuários inativos"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
            {showInactiveUsers && (
              <InactiveUsersPopover
                inactiveUsers={inactiveUsersList}
                onClose={() => setShowInactiveUsers(false)}
              />
            )}
          </div>
        </div>

        {/* ── Gráfico de linha: Acessos ao longo do tempo ── */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h3 className="font-bold text-foreground">
              Atividade Diária na Plataforma
            </h3>
            <div className="ml-auto flex items-center gap-2">
              {minDate && hasLegacyDataInFilter && (
                <span
                  className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                  title="Dados de visitas a dashboards e tempo de sessão sem granularidade diária foram incluídos como totais históricos. Sessões na plataforma e o gráfico diário refletem o período selecionado com precisão."
                >
                  dados legados incluídos
                </span>
              )}
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {dateFilter === "all"
                  ? "últimos 30 dias"
                  : periodLabel.toLowerCase()}{" "}
                · passe o mouse para ver detalhes
              </span>
            </div>
          </div>
          <div className="px-5 py-4 relative">
            <LineChart data={dailyChartData} />
          </div>
        </div>

        {/* ── Alertas: dashboards sem acesso + usuários inativos (sincronizados) ── */}
        {showAlertsSection && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Dashboards nunca acessados */}
            <div
              className={`bg-amber-50/40 dark:bg-amber-950/10 border border-amber-500/30 rounded-2xl overflow-hidden flex flex-col ${showNeverAccessed ? "h-56" : ""}`}
            >
              <button
                className="w-full px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-amber-500/5 transition-colors shrink-0"
                onClick={() => setShowNeverAccessed((v) => !v)}
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                  <span className="text-sm font-bold text-foreground">
                    {neverAccessedDashboards.length} dashboard
                    {neverAccessedDashboards.length !== 1 ? "s" : ""}{" "}
                    {minDate
                      ? `sem acesso no período`
                      : `nunca acessado${neverAccessedDashboards.length !== 1 ? "s" : ""}`}
                  </span>
                </div>
                {showNeverAccessed ? (
                  <ChevronUp className="size-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                )}
              </button>
              {showNeverAccessed && (
                <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-1">
                  {neverAccessedDashboards.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 italic">
                      Nenhum.
                    </p>
                  ) : (
                    neverAccessedDashboards.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-2 text-sm py-1.5 border-t border-amber-500/10"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="text-foreground font-medium truncate">
                          {d.titulo}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                          {(d.users_acess || []).length} com acesso
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Usuários sem nenhum acesso */}
            <div
              className={`bg-muted/20 border border-border rounded-2xl overflow-hidden flex flex-col ${showInactiveAlert ? "h-56" : ""}`}
            >
              <button
                className="w-full px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors shrink-0"
                onClick={() => setShowInactiveAlert((v) => !v)}
              >
                <div className="flex items-center gap-2.5">
                  <UserX className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-bold text-foreground">
                    {inactiveUsersList.length} usuário
                    {inactiveUsersList.length !== 1 ? "s" : ""}{" "}
                    {minDate ? "sem acesso no período" : "sem nenhum acesso"}
                  </span>
                </div>
                {showInactiveAlert ? (
                  <ChevronUp className="size-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                )}
              </button>
              {showInactiveAlert && (
                <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-1">
                  {inactiveUsersList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 italic">
                      {minDate
                        ? "Todos os usuários acessaram neste período! 🎉"
                        : "Todos os usuários já acessaram a plataforma! 🎉"}
                    </p>
                  ) : (
                    inactiveUsersList.map((u) => (
                      <div
                        key={u.id || u.uid}
                        className="flex items-center gap-2 text-sm py-1.5 border-t border-border/50"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                        <span className="text-foreground truncate">
                          {u.display_name || u.email}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                          {u.display_name ? u.email : ""}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Grid principal: Top Acessos + Top Usuários ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Dashboards por acesso */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <h3 className="font-bold text-foreground">
                Dashboards mais acessados
              </h3>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-80">
              {topDashboards.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 italic">
                  Nenhum dado disponível.
                </p>
              ) : (
                topDashboards.map((d, i) => (
                  <div key={d.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-xs font-black w-5 text-right shrink-0 ${i === 0 ? "text-amber-500" : "text-muted-foreground"}`}
                        >
                          #{i + 1}
                        </span>
                        <span className="font-medium text-foreground truncate">
                          {d.titulo}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                        <span>{d.uniqueUsers} usuários</span>
                        <span className="font-bold text-foreground">
                          {d.accessCount} acessos
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${i === 0 ? "bg-primary" : "bg-primary/40"}`}
                        style={{
                          width: `${(d.accessCount / maxDashAccess) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Usuários mais ativos */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Award className="size-4 text-primary" />
              <h3 className="font-bold text-foreground">
                Usuários mais ativos
              </h3>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Explicar ordenação de usuários ativos"
                  >
                    <Info className="size-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3">
                  <p className="text-sm">
                    Ordenado por tempo total na plataforma. Em caso de empate,
                    desempate pelo número de dashboards visitados.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-80">
              {topUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 italic">
                  Nenhum dado disponível.
                </p>
              ) : (
                topUsers.map((u, i) => (
                  <div key={u.uid} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-xs font-black w-5 text-right shrink-0 ${i === 0 ? "text-amber-500" : "text-muted-foreground"}`}
                        >
                          #{i + 1}
                        </span>
                        <span className="font-medium text-foreground truncate">
                          {u.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                        <span>{u.dashCount} dashboards</span>
                        <span className="font-bold text-foreground">
                          {fmtAdminTime(u.totalSeconds)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${i === 0 ? "bg-emerald-500" : "bg-emerald-500/40"}`}
                        style={{
                          width: `${(u.totalSeconds / maxUserTime) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Top Dashboards por Tempo ── */}
        {topDashboardsByTime.length > 0 && (
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Timer className="size-4 text-primary" />
              <h3 className="font-bold text-foreground">
                Dashboards com mais tempo de leitura
              </h3>
              <span className="ml-auto text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                ranking por tempo total
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-80">
              {topDashboardsByTime.map((d, i) => (
                <div key={d.id} className="flex items-center gap-3">
                  <span
                    className={`text-xs font-black w-5 text-right shrink-0 ${i === 0 ? "text-amber-500" : "text-muted-foreground"}`}
                  >
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {d.titulo}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${i === 0 ? "bg-violet-500" : "bg-violet-500/40"}`}
                          style={{
                            width: `${(d.totalTimeSeconds / maxDashTime) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground shrink-0">
                        {fmtAdminTime(d.totalTimeSeconds)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {d.accessCount} ac.
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Engajamento por Dashboard ── */}
        {dashboardCoverage.length > 0 && (
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Percent className="size-4 text-primary" />
              <h3 className="font-bold text-foreground">
                Engajamento por Dashboard
              </h3>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Explicar métricas de engajamento"
                  >
                    <Info className="size-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3 space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    Como ler este gráfico
                  </p>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-primary">Visitaram %</span>
                      {" — "}de todos os usuários que têm permissão para acessar
                      este dashboard, quantos de fato o abriram no período.
                    </p>
                    <p>
                      <span className="font-medium text-foreground/70">Liberados %</span>
                      {" — "}quantos usuários da empresa têm permissão de acesso a
                      este dashboard (independente de terem acessado ou não).
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground border-t border-border pt-2">
                    Um dashboard com 80% liberados e 20% visitaram indica baixo
                    aproveitamento — muita gente tem acesso mas poucos abriram.
                  </p>
                </PopoverContent>
              </Popover>
              <span className="ml-auto text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                visitantes vs. liberados
              </span>
            </div>
            <div className="p-5 space-y-5">
              {dashboardCoverage.map((d) => (
                <CoverageDualBar
                  key={d.id}
                  title={d.titulo}
                  accessPct={d.accessPct}
                  coveragePct={d.coveragePct}
                  totalAccesses={d.accessCount}
                  totalTime={d.totalTimeSeconds}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
