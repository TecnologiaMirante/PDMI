import { useState, useEffect, useRef } from "react";
import {
  ChevronRight,
  Edit,
  Trash2,
  Activity,
  Clock,
  CalendarClock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Search } from "lucide-react";
import { getUserStats } from "@infra/firebase";
import { loadAllStatsOnce, fmtPBIDate, fmtAdminTime } from "./adminUtils";

// ── Avatar de usuário ──────────────────────────────────────────
export function UserAvatar({ user, size = "sm" }) {
  const [imgError, setImgError] = useState(false);
  const dim = size === "md" ? "w-14 h-14 text-xl" : "w-8 h-8 text-xs";
  const src = user?.photo_url || user?.photoURL;
  const initials = user?.display_name
    ? user.display_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={user.display_name}
        referrerPolicy="no-referrer"
        className={`${dim} rounded-full object-cover border-2 border-border shrink-0`}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full bg-secondary flex items-center justify-center font-bold text-primary shrink-0`}
    >
      {initials}
    </div>
  );
}

// ── Item de lista de usuário ───────────────────────────────────
export function UserListItem({ user, selected, onClick, sectorName }) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3
        ${selected ? "border-primary bg-secondary shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/50"}`}
    >
      <UserAvatar user={user} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">
          {user.display_name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {sectorName || user.setor || "Sem setor"}
        </p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
    </div>
  );
}

// ── DashItem ───────────────────────────────────────────────────
export function DashItem({
  dash,
  selected,
  onClick,
  navigate,
  isAdmin,
  onDelete,
  sectorName,
}) {
  return (
    <div
      className={`p-3 rounded-xl border transition-all flex items-center gap-3 group
        ${selected ? "border-primary bg-secondary shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/50"}`}
    >
      <div
        onClick={onClick}
        className="flex-1 flex items-center gap-3 min-w-0 cursor-pointer"
      >
        {dash.thumb ? (
          <img
            src={dash.thumb}
            alt={dash.titulo}
            className="w-14 h-10 rounded object-cover border border-border shrink-0"
          />
        ) : (
          <div className="w-14 h-10 rounded bg-linear-to-br from-primary to-ring shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {dash.titulo}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {sectorName || dash.setor}
          </p>
        </div>
      </div>

      {isAdmin && (
        <TooltipProvider>
          <div
            className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => navigate(`/admin/dashboard/${dash.id}/edit`)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Edit className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Editar dashboard</p>
              </TooltipContent>
            </Tooltip>

            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Excluir dashboard</p>
                </TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir "{dash.titulo}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={() => onDelete(dash.id)}
                  >
                    Sim, excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TooltipProvider>
      )}

      {!isAdmin && (
        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
      )}
    </div>
  );
}

// ── PBIStatusInline ────────────────────────────────────────────
export function PBIStatusInline({ status }) {
  if (!status || status === null) return null;
  if (status === "loading")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <span className="w-2 h-2 rounded-full border border-muted-foreground/50 border-t-muted-foreground animate-spin" />
        Verificando
      </span>
    );
  if (status === "updated")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Atualizado
      </span>
    );
  if (status === "outdated")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 dark:text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-500" /> Desatualizado
      </span>
    );
  return null;
}

// ── DashHeader ─────────────────────────────────────────────────
export function DashHeader({ dash, compact = false, pbiStatus, sectorName }) {
  const [dashStats, setDashStats] = useState(null);

  useEffect(() => {
    if (!dash?.id || compact) return;
    loadAllStatsOnce()
      .then((allStats) => {
        let totalAccesses = 0,
          totalSeconds = 0;
        allStats.forEach((s) => {
          const d = s.dashboards?.[dash.id];
          if (d) {
            totalAccesses += d.accessCount || 0;
            totalSeconds += d.totalTimeSeconds || 0;
          }
        });
        setDashStats({ totalAccesses, totalSeconds });
      })
      .catch(() => {});
  }, [dash?.id, compact]);

  return (
    <div
      className={`border-b border-border flex gap-4 items-start shrink-0 ${compact ? "p-4" : "p-6"}`}
    >
      {dash.thumb ? (
        <img
          src={dash.thumb}
          alt={dash.titulo}
          className={`rounded-xl object-cover shadow-sm border border-border shrink-0 ${compact ? "w-16 h-12" : "w-40 h-28"}`}
        />
      ) : (
        <div
          className={`rounded-xl bg-linear-to-br from-primary to-ring shadow-sm shrink-0 ${compact ? "w-16 h-12" : "w-40 h-28"}`}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge variant="secondary">
            {sectorName || dash.setor || "Sem setor"}
          </Badge>
          <PBIStatusInline status={pbiStatus?.status} />
        </div>
        <h2
          className={`font-black text-foreground leading-tight ${compact ? "text-base" : "text-xl"}`}
        >
          {dash.titulo}
        </h2>
        {(!compact && dash.descricao) && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {dash.descricao}
          </p>
        )}
        {(pbiStatus?.lastRefresh || pbiStatus?.nextRefresh) && (
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
            {pbiStatus.lastRefresh && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <RefreshCw className="size-2.5 shrink-0" /> Última
                atualização: {fmtPBIDate(pbiStatus.lastRefresh)}
              </span>
            )}
            {pbiStatus.nextRefresh && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CalendarClock className="size-2.5 shrink-0" /> Próxima
                atualização: {fmtPBIDate(pbiStatus.nextRefresh)}
              </span>
            )}
          </div>
        )}
        {dashStats &&
          (dashStats.totalAccesses > 0 || dashStats.totalSeconds > 0) && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Activity className="size-2.5 shrink-0 text-primary" />{" "}
                {dashStats.totalAccesses} acessos
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="size-2.5 shrink-0 text-primary" />{" "}
                {fmtAdminTime(dashStats.totalSeconds)} de uso total
              </span>
            </div>
          )}
      </div>
    </div>
  );
}

// ── AdminStatCard ──────────────────────────────────────────────
export function AdminStatCard({ icon, label, value, small = false }) {
  return (
    <div className="flex items-center gap-2.5 bg-card border border-border p-2.5 rounded-xl shadow-sm">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground leading-none mb-0.5">
          {label}
        </span>
        <span
          className={`block font-bold text-foreground leading-tight ${small ? "text-xs" : "text-sm"}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────
export function EmptyState({ text, sub }) {
  return (
    <div className="flex-1 bg-card/50 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center">
      <svg
        className="text-muted w-14 h-14 mb-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
      </svg>
      <p className="text-muted-foreground font-medium">{text}</p>
      {sub && <p className="text-muted-foreground text-sm mt-1">{sub}</p>}
    </div>
  );
}

// ── UserStatsPopoverAdmin ──────────────────────────────────────
export function UserStatsPopoverAdmin({ uid, dashboardId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    getUserStats(uid)
      .then((stats) => setData(stats?.dashboards?.[dashboardId] || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [uid, dashboardId]);

  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const totalTime = data?.totalTimeSeconds ?? 0;
  const accessCount = data?.accessCount ?? 0;
  const avgMin = accessCount > 0 ? Math.round(totalTime / accessCount / 60) : 0;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-52 bg-card border border-border rounded-xl shadow-xl p-3 text-xs"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute -top-1.5 right-3 w-3 h-3 bg-card border-t border-l border-border rotate-45" />
      <div className="flex items-center justify-between mb-2.5">
        <p className="font-bold text-foreground text-[10px] uppercase tracking-wider">
          Acesso neste dashboard
        </p>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-2">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-muted-foreground italic text-center py-1">
          Nenhum acesso registrado.
        </p>
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-1">
            <div className="bg-muted/40 rounded-lg p-1.5 text-center">
              <span className="block text-sm font-black text-foreground">
                {accessCount}
              </span>
              <span className="text-[9px] text-muted-foreground">acessos</span>
            </div>
            <div className="bg-muted/40 rounded-lg p-1.5 text-center">
              <span className="block text-sm font-black text-foreground">
                {fmtAdminTime(totalTime)}
              </span>
              <span className="text-[9px] text-muted-foreground">tempo</span>
            </div>
          </div>
          {accessCount > 0 && (
            <div className="bg-primary/5 rounded-lg p-1.5 text-center border border-primary/15">
              <span className="block text-xs font-bold text-primary">
                {avgMin} min/sessão
              </span>
            </div>
          )}
          {data.lastAccess && (
            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
              Último acesso:{" "}
              <span className="font-semibold text-foreground">
                {new Date(
                  data.lastAccess?.toDate?.() || data.lastAccess,
                ).toLocaleDateString("pt-BR")}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── UserRow ────────────────────────────────────────────────────
export function UserRow({
  user: u,
  actionLabel,
  actionVariant,
  onAction,
  dashboardId,
  activeInfoUid,
  setActiveInfoUid,
}) {
  const uid = u.id || u.uid;
  const isOpen = !!dashboardId && activeInfoUid === uid;

  return (
    <div className="relative">
      <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-muted/30">
        <UserAvatar user={u} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {u.display_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
        </div>
        {dashboardId && (
          <button
            onClick={() => setActiveInfoUid?.(isOpen ? null : uid)}
            className={`cursor-pointer shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isOpen ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
            title="Ver estatísticas de acesso"
          >
            <svg
              width="10"
              height="10"
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
        )}
        <Button
          variant={actionVariant}
          size="sm"
          onClick={() => onAction(u)}
          className="shrink-0"
        >
          {actionLabel}
        </Button>
      </div>
      {isOpen && (
        <UserStatsPopoverAdmin
          uid={uid}
          dashboardId={dashboardId}
          onClose={() => setActiveInfoUid?.(null)}
        />
      )}
    </div>
  );
}

// ── AccessPanel ────────────────────────────────────────────────
export function AccessPanel({
  title,
  count,
  users,
  search,
  onSearch,
  actionLabel,
  actionVariant,
  onAction,
  emptyText,
  dashboardId,
}) {
  const [activeInfoUid, setActiveInfoUid] = useState(null);

  return (
    <div className="w-1/2 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-border shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground text-sm">{title}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar usuário..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {users.map((u) => (
          <UserRow
            key={u.id || u.uid}
            user={u}
            actionLabel={actionLabel}
            actionVariant={actionVariant}
            onAction={onAction}
            dashboardId={dashboardId}
            activeInfoUid={activeInfoUid}
            setActiveInfoUid={setActiveInfoUid}
          />
        ))}
        {users.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyText}
          </p>
        )}
      </div>
    </div>
  );
}

// ── MobileAccessTabs ───────────────────────────────────────────
export function MobileAccessTabs({
  withAccess,
  totalAccess,
  searchAccess,
  onSearchAccess,
  availableUsers,
  searchAdd,
  onSearchAdd,
  onAdd,
  onRemove,
  dashboardId,
}) {
  const [tab, setTab] = useState("access");
  const [activeInfoUid, setActiveInfoUid] = useState(null);
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex border-b border-border bg-card px-4">
        {[
          { key: "access", label: `Com Acesso (${totalAccess})` },
          { key: "add", label: "Adicionar" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar usuário..."
              value={tab === "access" ? searchAccess : searchAdd}
              onChange={(e) =>
                tab === "access"
                  ? onSearchAccess(e.target.value)
                  : onSearchAdd(e.target.value)
              }
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tab === "access" ? (
            <>
              {withAccess.map((u) => (
                <UserRow
                  key={u.id || u.uid}
                  user={u}
                  actionLabel="Remover"
                  actionVariant="destructive"
                  onAction={onRemove}
                  dashboardId={dashboardId}
                  activeInfoUid={activeInfoUid}
                  setActiveInfoUid={setActiveInfoUid}
                />
              ))}
              {withAccess.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {searchAccess
                    ? "Nenhum usuário encontrado."
                    : "Nenhum usuário com acesso."}
                </p>
              )}
            </>
          ) : (
            <>
              {availableUsers.map((u) => (
                <UserRow
                  key={u.id || u.uid}
                  user={u}
                  actionLabel="Adicionar"
                  actionVariant="secondary"
                  onAction={onAdd}
                  dashboardId={dashboardId}
                  activeInfoUid={activeInfoUid}
                  setActiveInfoUid={setActiveInfoUid}
                />
              ))}
              {availableUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {searchAdd
                    ? "Nenhum usuário encontrado."
                    : "Todos já têm acesso."}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ActiveUsersPopover ─────────────────────────────────────────
export function ActiveUsersPopover({ topUsers, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-2 z-50 w-72 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider">
          Usuários ativos
        </p>
        <button
          onClick={onClose}
          className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-border">
        {topUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 italic">
            Nenhum dado ainda.
          </p>
        ) : (
          topUsers.map((u, i) => (
            <div
              key={u.uid}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
            >
              <span
                className={`text-xs font-black w-4 text-right shrink-0 ${i === 0 ? "text-amber-500" : "text-muted-foreground"}`}
              >
                #{i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {u.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {u.accessCount} acessos · {fmtAdminTime(u.totalSeconds)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── InactiveUsersPopover ───────────────────────────────────────
export function InactiveUsersPopover({ inactiveUsers, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 z-50 w-72 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-destructive/10">
        <div className="flex flex-col">
          <p className="text-xs font-bold text-destructive uppercase tracking-wider leading-none">
            Usuários Inativos
          </p>
          <p className="text-[9px] text-muted-foreground mt-1 leading-tight">
            Usuários que nunca acessaram a plataforma (conforme período filtrado).
          </p>
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-border">
        {inactiveUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 italic">
            Nenhum usuário inativo.
          </p>
        ) : (
          inactiveUsers.map((u) => (
            <div
              key={u.id || u.uid}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {u.display_name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {u.email}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
