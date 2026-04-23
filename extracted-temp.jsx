function DashboardMultiSelect({ dashboards, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = dashboards.filter((d) =>
    d.titulo?.toLowerCase().includes(search.toLowerCase()),
  );

  const allSelected = selected === null;
  const noneSelected = selected !== null && selected.length === 0;

  const toggle = (id) => {
    if (selected === null) {
      onChange(dashboards.filter((d) => d.id !== id).map((d) => d.id));
    } else if (selected.includes(id)) {
      const next = selected.filter((x) => x !== id);
      onChange(next);
    } else {
      const next = [...selected, id];
      onChange(next.length === dashboards.length ? null : next);
    }
  };

  const isChecked = (id) =>
    allSelected || (selected !== null && selected.includes(id));
  const checkedCount = allSelected
    ? dashboards.length
    : (selected?.length ?? 0);

  const label = allSelected
    ? "Todos os dashboards"
    : noneSelected
      ? "Nenhum selecionado"
      : `${selected.length} dashboard${selected.length > 1 ? "s" : ""}`;

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 h-9 text-xs font-semibold ${!allSelected ? "border-primary/60 bg-primary/5 text-primary" : ""}`}
          >
            <LayoutDashboard className="size-3.5 shrink-0" />
            <span className="max-w-36 truncate">{label}</span>
            <ChevronDown
              className={`size-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end">
          <div className="p-2 border-b border-border">
            <input
              type="text"
              placeholder="Buscar dashboard..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
            <button
              className="text-xs text-primary hover:underline font-medium"
              onClick={() => onChange(null)}
            >
              Marcar todos
            </button>
            <span className="text-xs text-muted-foreground">
              {checkedCount}/{dashboards.length}
            </span>
            <button
              className="text-xs text-muted-foreground hover:text-destructive hover:underline font-medium"
              onClick={() => onChange([])}
            >
              Desmarcar todos
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((d) => (
              <button
                key={d.id}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/60 transition-colors text-left"
                onClick={() => toggle(d.id)}
              >
                <div
                  className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                    isChecked(d.id)
                      ? "bg-primary border-primary"
                      : "border-border bg-background"
                  }`}
                >
                  {isChecked(d.id) && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path
                        d="M1 3.5L3.2 6L8 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span className="truncate text-foreground">{d.titulo}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-4 italic">
                Nenhum encontrado
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {/* BotÃ£o Ã— rÃ¡pido para limpar o filtro de dashboard */}
      {!allSelected && (
        <button
          onClick={() => onChange(null)}
          className="h-9 w-7 flex items-center justify-center rounded-md border border-primary/40 bg-primary/5 text-primary hover:bg-primary/15 transition-colors shrink-0"
          title="Mostrar todos os dashboards"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1 1L9 9M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// â”€â”€ GrÃ¡fico SVG de linha â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LineChart({ data }) {
  const [hovered, setHovered] = useState(null);

  const W = 500;
  const H = 130;
  const PAD = { top: 16, right: 20, bottom: 28, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const yTicks = [0, Math.ceil(maxVal / 2), maxVal];

  const xScale = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * innerW;
  const yScale = (v) => PAD.top + (1 - v / maxVal) * innerH;

  const pts = data.map((d, i) => [xScale(i), yScale(d.value)]);
  const linePath = pts
    .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
    .join(" ");
  const areaPath =
    `M ${pts[0][0]} ${yScale(0)} ` +
    pts.map((p) => `L ${p[0]} ${p[1]}`).join(" ") +
    ` L ${pts[pts.length - 1][0]} ${yScale(0)} Z`;

  const xLabelIndexes = new Set([0, data.length - 1]);
  for (let i = 7; i < data.length - 7; i += 7) xLabelIndexes.add(i);

  const maxIdx = data.reduce(
    (mi, d, i) => (d.value > data[mi].value ? i : mi),
    0,
  );
  const hasData = data.some((d) => d.value > 0);

  const hov = hovered !== null ? data[hovered] : null;
  const hovX = hovered !== null ? xScale(hovered) : 0;
  const hovY = hovered !== null ? yScale(data[hovered].value) : 0;
  const tipW = 64;
  const tipH = 30;
  const tipX = Math.min(
    Math.max(hovX - tipW / 2, PAD.left),
    W - PAD.right - tipW,
  );
  const tipY = hovY - tipH - 6 < PAD.top ? hovY + 8 : hovY - tipH - 6;

  return (
    <div className="w-full relative">
      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-xs text-muted-foreground/50 italic">
            Os dados comeÃ§arÃ£o a aparecer a partir dos prÃ³ximos acessos
          </p>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: "130px" }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid horizontal */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={yScale(tick) + 3.5}
              textAnchor="end"
              fontSize="9"
              fill="currentColor"
              fillOpacity="0.4"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Baseline */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={yScale(0)}
          y2={yScale(0)}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1"
        />

        {/* Ãrea */}
        {hasData && <path d={areaPath} fill="url(#chartGrad)" />}

        {/* Linha */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={hasData ? 1 : 0.2}
        />

        {/* Label do pico (mÃ¡ximo) */}
        {hasData && data[maxIdx].value > 0 && hovered !== maxIdx && (
          <g>
            <rect
              x={Math.min(
                Math.max(xScale(maxIdx) - 20, PAD.left),
                W - PAD.right - 40,
              )}
              y={yScale(data[maxIdx].value) - 20}
              width={40}
              height={16}
              rx={4}
              fill="var(--primary)"
              fillOpacity="0.15"
            />
            <text
              x={Math.min(
                Math.max(xScale(maxIdx), PAD.left + 20),
                W - PAD.right - 20,
              )}
              y={yScale(data[maxIdx].value) - 8}
              textAnchor="middle"
              fontSize="9"
              fill="var(--primary)"
              fontWeight="bold"
            >
              {data[maxIdx].value}
            </text>
          </g>
        )}

        {/* Pontos */}
        {data.map((d, i) =>
          d.value > 0 ? (
            <circle
              key={i}
              cx={xScale(i)}
              cy={yScale(d.value)}
              r={hovered === i ? 5 : 3}
              fill="var(--primary)"
              stroke="white"
              strokeWidth="1.5"
              style={{ transition: "r 0.1s" }}
            />
          ) : null,
        )}

        {/* Crosshair no hover */}
        {hovered !== null && hov && hov.value > 0 && (
          <line
            x1={hovX}
            x2={hovX}
            y1={PAD.top}
            y2={yScale(0)}
            stroke="var(--primary)"
            strokeOpacity="0.2"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        )}

        {/* Tooltip SVG */}
        {hovered !== null && hov && hov.value > 0 && (
          <g transform={`translate(${tipX},${tipY})`}>
            <rect
              width={tipW}
              height={tipH}
              rx={5}
              fill="#0f172a"
              opacity="0.88"
            />
            <text
              x={tipW / 2}
              y={13}
              textAnchor="middle"
              fontSize="11"
              fill="white"
              fontWeight="bold"
            >
              {hov.value}
            </text>
            <text
              x={tipW / 2}
              y={24}
              textAnchor="middle"
              fontSize="8"
              fill="#94a3b8"
            >
              {hov.date?.slice(5)}
            </text>
          </g>
        )}

        {/* Ãreas de hover invisÃ­veis */}
        {data.map((_, i) => {
          const step = innerW / Math.max(data.length - 1, 1);
          return (
            <rect
              key={`hit-${i}`}
              x={xScale(i) - step / 2}
              y={PAD.top}
              width={step}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "crosshair" }}
            />
          );
        })}

        {/* Labels X */}
        {[...xLabelIndexes].map((i) => (
          <text
            key={i}
            x={xScale(i)}
            y={H - 4}
            textAnchor="middle"
            fontSize="8.5"
            fill="currentColor"
            fillOpacity="0.45"
          >
            {data[i]?.date?.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  );
}

// â”€â”€ Card de stat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCard({
  icon,
  label,
  value,
  sub,
  accent = false,
  warning = false,
}) {
  return (
    <div
      className={`bg-card border rounded-2xl p-4 flex items-center gap-3 shadow-sm ${
        warning
          ? "border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10"
          : accent
            ? "border-primary/30 bg-primary/5"
            : "border-border"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          warning ? "bg-amber-500/10" : "bg-primary/10"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground leading-none mb-1">
          {label}
        </p>
        <p className="text-xl font-black text-foreground leading-none">
          {value}
        </p>
        {sub && (
          <p className="text-[9px] text-muted-foreground/60 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

// â”€â”€ Barra dupla de engajamento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CoverageDualBar({
  title,
  accessPct,
  coveragePct,
  totalAccesses,
  totalTime,
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span
          className="font-medium text-foreground truncate max-w-[55%]"
          title={title}
        >
          {title}
        </span>
        <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
          <span>{totalAccesses} acessos</span>
          <span className="font-semibold text-foreground">
            {fmtAdminTime(totalTime)}
          </span>
        </div>
      </div>
      <div
        className="flex items-center gap-1.5"
        title={`${Math.round(accessPct)}% dos usuÃ¡rios que POSSUEM PERMISSÃƒO abriram este dashboard.`}
      >
        <span className="text-[9px] text-primary/70 w-15 shrink-0 text-right uppercase tracking-tighter">
          visitaram
        </span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${accessPct}%` }}
          />
        </div>
        <span className="text-[9px] font-semibold text-primary w-8">
          {Math.round(accessPct)}%
        </span>
      </div>
      <div
        className="flex items-center gap-1.5"
        title={`${Math.round(coveragePct)}% de todos os usuÃ¡rios da empresa podem acessar este dashboard.`}
      >
        <span className="text-[9px] text-muted-foreground w-[60px] shrink-0 text-right uppercase tracking-tighter">
          liberados
        </span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/25 rounded-full transition-all"
            style={{ width: `${coveragePct}%` }}
          />
        </div>
        <span className="text-[9px] font-semibold text-muted-foreground w-8">
          {Math.round(coveragePct)}%
        </span>
      </div>
    </div>
  );
}

// â”€â”€ Componente principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function AnalyticsTab({ dashboards, users }) {
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
    // Limpa o estado do calendÃ¡rio oposto ao que foi selecionado
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

  // â”€â”€ Totais gerais â”€â”€
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

  // â”€â”€ Dados diÃ¡rios para o grÃ¡fico (respeita o filtro de perÃ­odo) â”€â”€
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

  // â”€â”€ Top dashboards por acesso â”€â”€
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

  // â”€â”€ Top dashboards por tempo â”€â”€
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

  // â”€â”€ Top usuÃ¡rios â”€â”€
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
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 8);
  }, [filteredStats, userMap]);

  // â”€â”€ UsuÃ¡rios inativos â”€â”€
  const inactiveUsersList = useMemo(() => {
    const activeUids = new Set(filteredStats.map((s) => s.uid));
    return users.filter((u) => !activeUids.has(u.id || u.uid));
  }, [filteredStats, users]);

  // â”€â”€ Dashboards nunca acessados â”€â”€
  const neverAccessedDashboards = useMemo(() => {
    const accessedIds = new Set(
      filteredStats.flatMap((s) => Object.keys(s.dashboards || {})),
    );
    const pool = isFilteringByDash
      ? dashboards.filter((d) => selectedDashboardSet.has(d.id))
      : dashboards;
    return pool.filter((d) => !accessedIds.has(d.id));
  }, [filteredStats, dashboards, isFilteringByDash, selectedDashboardSet]);

  // â”€â”€ Engajamento por dashboard â”€â”€
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
        return "Todo o perÃ­odo";
      case "today":
        return "Hoje";
      case "7days":
        return "Ãšltimos 7 dias";
      case "30days":
        return "Ãšltimos 30 dias";
      case "custom_date":
        return customDate
          ? `Data: ${format(customDate, "dd/MM/yyyy")}`
          : "Data Ãšnica";
      case "custom_range":
        return customRange?.from && customRange?.to
          ? `PerÃ­odo de ${format(customRange.from, "dd/MM/yyyy")} a ${format(customRange.to, "dd/MM/yyyy")}`
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
      : "Sem dados no perÃ­odo selecionado";
  }, [noExportData, selectedDashboards]);

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
        {/* â”€â”€ Header â”€â”€ */}
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
                ? `Exibindo dados de ${platformTotals.activeUsers} usuÃ¡rio${platformTotals.activeUsers !== 1 ? "s" : ""} em ${periodLabel.toLowerCase()}`
                : "Dados de uso globais coletados em tempo real"}
            </p>
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

        {/* â”€â”€ Toolbar de Filtros â”€â”€ */}
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
              <SelectValue placeholder="PerÃ­odo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o perÃ­odo</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7days">Ãšltimos 7 dias</SelectItem>
              <SelectItem value="30days">Ãšltimos 30 dias</SelectItem>
              <SelectItem value="custom_date">Data Ãšnica</SelectItem>
              <SelectItem value="custom_range">Intervalo</SelectItem>
            </SelectContent>
          </Select>

          {dateFilter === "custom_date" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-[180px] justify-start text-left font-normal text-xs bg-background shrink-0",
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
                    "h-9 w-[260px] justify-start text-left font-normal text-xs bg-background shrink-0",
                    !customRange?.from && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {customRange?.from
                      ? customRange.to
                        ? `${format(customRange.from, "PP", { locale: ptBR })} - ${format(customRange.to, "PP", { locale: ptBR })}`
                        : format(customRange.from, "PP", { locale: ptBR })
                      : "Escolha o perÃ­odo"}
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

        {/* â”€â”€ Empty state: nenhum dashboard selecionado â”€â”€ */}
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

        {/* â”€â”€ Empty state quando filtro de data nÃ£o retorna dados â”€â”€ */}
        {filteredStats.length === 0 && dateFilter !== "all" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 border border-dashed border-border rounded-2xl bg-muted/20">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <Filter className="size-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">
                Nenhum dado para este perÃ­odo
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                NÃ£o hÃ¡ registros de acesso em{" "}
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

        {/* â”€â”€ Cards de Totais: linha 1 â”€â”€ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Activity className="text-primary size-5" />}
            label="SessÃµes na plataforma"
            value={platformTotals.totalAccesses}
          />
          <StatCard
            icon={<LayoutDashboard className="text-primary size-5" />}
            label="Visitas a dashboards"
            value={platformTotals.totalDashAccesses}
            sub="cliques em painÃ©is"
          />
          <StatCard
            icon={<Clock className="text-primary size-5" />}
            label="Tempo total"
            value={fmtAdminTime(platformTotals.totalSeconds)}
            sub={
              hasLegacyDataInFilter
                ? "\u26a0 dados legados sem tempo granular"
                : undefined
            }
          />
          <StatCard
            icon={<TrendingUp className="text-primary size-5" />}
            label="MÃ©dia por sessÃ£o"
            value={fmtAdminTime(platformTotals.avgSeconds)}
            sub={
              hasLegacyDataInFilter
                ? "\u26a0 tempo pode estar subestimado"
                : undefined
            }
          />
        </div>

        {/* â”€â”€ Cards de Totais: linha 2 â”€â”€ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* UsuÃ¡rios Ativos com popover */}
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm relative">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="text-primary size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground leading-none mb-1">
                {minDate ? "Ativos no perÃ­odo" : "UsuÃ¡rios ativos"}
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
              title="Ver quem sÃ£o os usuÃ¡rios ativos"
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
            sub={`${neverAccessedDashboards.length} ${minDate ? "sem acesso no perÃ­odo" : "nunca acessados"}`}
          />
          <StatCard
            icon={<Percent className="text-primary size-5" />}
            label="Taxa de engajamento"
            value={`${platformTotals.engagementRate}%`}
            sub={`${platformTotals.activeUsers} de ${users.length} usuÃ¡rios`}
            accent
          />
          <div className="bg-amber-50/30 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 shadow-sm relative dark:bg-amber-950/10">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <UserX className="text-amber-500 size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground leading-none mb-1">
                {minDate ? "Sem acesso no perÃ­odo" : "UsuÃ¡rios inativos"}
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
              title="Ver quem sÃ£o os usuÃ¡rios inativos"
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

        {/* â”€â”€ GrÃ¡fico de linha: Acessos ao longo do tempo â”€â”€ */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h3 className="font-bold text-foreground">
              Atividade DiÃ¡ria na Plataforma
            </h3>
            <div className="ml-auto flex items-center gap-2">
              {minDate && hasLegacyDataInFilter && (
                <span
                  className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                  title="Alguns registros histÃ³ricos nÃ£o possuem granularidade diÃ¡ria. Acessos aparecem, mas tempo foi zerado para nÃ£o inflar o perÃ­odo filtrado."
                >
                  dados legados incluÃ­dos
                </span>
              )}
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {dateFilter === "all"
                  ? "Ãºltimos 30 dias"
                  : periodLabel.toLowerCase()}{" "}
                Â· passe o mouse para ver detalhes
              </span>
            </div>
          </div>
          <div className="px-5 py-4 relative">
            <LineChart data={dailyChartData} />
          </div>
        </div>

        {/* â”€â”€ Alertas: dashboards sem acesso + usuÃ¡rios inativos (sincronizados) â”€â”€ */}
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
                      ? `sem acesso no perÃ­odo`
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

            {/* UsuÃ¡rios sem nenhum acesso */}
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
                    {inactiveUsersList.length} usuÃ¡rio
                    {inactiveUsersList.length !== 1 ? "s" : ""}{" "}
                    {minDate ? "sem acesso no perÃ­odo" : "sem nenhum acesso"}
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
                        ? "Todos os usuÃ¡rios acessaram neste perÃ­odo! ðŸŽ‰"
                        : "Todos os usuÃ¡rios jÃ¡ acessaram a plataforma! ðŸŽ‰"}
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

        {/* â”€â”€ Grid principal: Top Acessos + Top UsuÃ¡rios â”€â”€ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Dashboards por acesso */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <h3 className="font-bold text-foreground">
                Dashboards mais acessados
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {topDashboards.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 italic">
                  Nenhum dado disponÃ­vel.
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
                        <span>{d.uniqueUsers} usuÃ¡rios</span>
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

          {/* Top UsuÃ¡rios mais ativos */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Award className="size-4 text-primary" />
              <h3 className="font-bold text-foreground">
                UsuÃ¡rios mais ativos
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {topUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 italic">
                  Nenhum dado disponÃ­vel.
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
                          width: `${(u.accessCount / maxUserAccess) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* â”€â”€ Top Dashboards por Tempo â”€â”€ */}
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
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
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

        {/* â”€â”€ Engajamento por Dashboard â”€â”€ */}
        {dashboardCoverage.length > 0 && (
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Percent className="size-4 text-primary" />
              <h3 className="font-bold text-foreground">
                Engajamento por Dashboard
              </h3>
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
