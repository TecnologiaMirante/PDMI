import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronDown,
  Users,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Pencil,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/ThemeToggle";
import FloatingChatWidget from "@/components/FloatingChatWidget";
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
import {
  getDashboard,
  getUsers,
  deleteDashboard,
  getSectors,
  getUserStats,
} from "@infra/firebase";
import { useAuth } from "@/context/AuthContext";
import { usePowerBIStatuses } from "@/hooks/usePowerBIStatuses";
import { Skeleton } from "@/components/ui/Skeleton";

// ── Avatar de usuário ──────────────────────────────────────────
function UserAvatar({ user, size = "sm" }) {
  const [imgError, setImgError] = useState(false);
  const dim = size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
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

// ── Formata data para pt-BR ────────────────────────────────────
function fmtDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("pt-BR");
}

// ── Formata segundos em horas/minutos legível ──────────────────
function fmtTime(seconds) {
  if (!seconds) return "0 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

// ── Pílula de status Power BI (inline, sem datas) ─────────────
function PBIStatusPill({ pbiStatus }) {
  if (!pbiStatus) return null;
  const { status } = pbiStatus;
  if (!status) return null;

  if (status === "loading")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <RefreshCw className="size-3 animate-spin" />
        Verificando...
      </span>
    );
  if (status === "updated")
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="size-3" />
        Atualizado
      </span>
    );
  if (status === "outdated")
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
        <XCircle className="size-3" />
        Desatualizado
      </span>
    );
  if (status === "unknown")
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
        <HelpCircle className="size-3" />
        Sem atualização
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
        <AlertCircle className="size-3" />
        Indisponível
      </span>
    );
  return null;
}

// ── Popover de stats por usuário ───────────────────────────────
function UserStatsPopover({ uid, dashboardId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    getUserStats(uid)
      .then((stats) => setData(stats?.dashboards?.[dashboardId] || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [uid, dashboardId]);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [onClose]);

  const totalTime = data?.totalTimeSeconds ?? 0;
  const accessCount = data?.accessCount ?? 0;
  const avgMin = accessCount > 0 ? Math.round(totalTime / accessCount / 60) : 0;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 z-50 w-56 bg-card border border-border rounded-2xl shadow-xl p-4 text-xs"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Setinha */}
      <div className="absolute -top-1.5 right-4 w-3 h-3 bg-card border-t border-l border-border rotate-45" />

      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-foreground text-[11px] uppercase tracking-wider">
          Atividade neste dashboard
        </p>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <XCircle className="size-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-3">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-muted-foreground italic text-center py-2">
          Nenhum acesso registrado ainda.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-muted/40 rounded-lg p-2 text-center">
              <span className="block text-base font-black text-foreground">
                {accessCount}
              </span>
              <span className="text-[10px] text-muted-foreground">acessos</span>
            </div>
            <div className="bg-muted/40 rounded-lg p-2 text-center">
              <span className="block text-base font-black text-foreground">
                {fmtTime(totalTime)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                tempo total
              </span>
            </div>
          </div>
          {accessCount > 0 && (
            <div className="bg-primary/5 rounded-lg p-2 text-center border border-primary/15">
              <span className="block text-sm font-bold text-primary">
                {avgMin} min/sessão
              </span>
              <span className="text-[10px] text-muted-foreground">
                média por acesso
              </span>
            </div>
          )}
          {data.lastAccess && (
            <div className="pt-1.5 border-t border-border">
              <span className="text-muted-foreground block mb-0.5">
                Último acesso
              </span>
              <span className="font-semibold text-foreground">
                {fmtDate(data.lastAccess?.toDate?.() || data.lastAccess)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────
export default function DashboardDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAdmin } = useAuth();

  const containerRef = useRef(null);
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [sectorName, setSectorName] = useState("");
  const [activeInfoUid, setActiveInfoUid] = useState(null);
  const [isAccessOpen, setIsAccessOpen] = useState(window.innerWidth > 1024);

  const dashboardsForPBI = useMemo(
    () => (dashboard ? [dashboard] : []),
    [dashboard],
  );
  // Agora pbiStatuses retorna o objeto e não string
  const pbiStatuses = usePowerBIStatuses(dashboardsForPBI);
  const pbiStatus = dashboard ? pbiStatuses[dashboard.titulo] : undefined;

  // Carrega dashboard + usuários com acesso
  useEffect(() => {
    async function load() {
      try {
        const [dash, allUsers, sectorsData] = await Promise.all([
          getDashboard(id),
          getUsers().catch(() => []), // graceful: ignora erro de permissão
          getSectors().catch(() => []),
        ]);

        if (!dash) {
          toast.error("Dashboard não encontrado.");
          navigate("/home");
          return;
        }

        const sectorId = dash.sectorId || dash.setor;
        const foundSector = sectorsData.find((s) => s.id === sectorId);
        setSectorName(foundSector ? foundSector.name : sectorId);

        setDashboard(dash);
        const accessSet = new Set(dash.users_acess || []);
        setUsers(allUsers.filter((u) => accessSet.has(u.id || u.uid)));
      } catch {
        toast.error("Erro ao carregar dashboard.");
        navigate("/home");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate]);

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <nav className="h-14.25 border-b border-border bg-card flex items-center px-4 md:px-6 gap-4">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="flex-1 h-6 max-w-50" />
        </nav>
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          <aside className="w-full lg:w-72 border-b lg:border-r border-border p-4 space-y-6">
            <Skeleton className="w-full aspect-video rounded-xl" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="space-y-3 pt-6">
              <Skeleton className="h-4 w-1/2" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="flex-1 h-4" />
                </div>
              ))}
            </div>
          </aside>
          <main className="flex-1 bg-muted/20 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-muted-foreground text-xs font-medium animate-pulse">
                Iniciando relatório...
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const embedLink = dashboard.link;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:h-screen lg:overflow-hidden">
      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 flex items-center gap-3 px-4 md:px-6 py-2.5 shadow-sm bg-card border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/home")}
          className="gap-1 text-primary shrink-0"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Voltar</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hidden lg:flex"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? "Recolher Menu" : "Expandir Menu"}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="size-5" />
          ) : (
            <PanelLeftOpen className="size-5" />
          )}
        </Button>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <Badge variant="secondary" className="shrink-0 hidden sm:inline-flex">
            {sectorName || "Sem setor"}
          </Badge>
          <h1 className="text-sm font-bold text-foreground truncate">
            {dashboard.titulo}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <TooltipProvider>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/admin/dashboard/${id}/edit`)}
                      className="gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                      <span className="hidden sm:inline">Editar</span>
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
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                          <span className="hidden sm:inline">Excluir</span>
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Excluir dashboard</p>
                    </TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Excluir "{dashboard.titulo}"?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O dashboard será
                        permanentemente removido.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={async () => {
                          await deleteDashboard(id);
                          toast.success("Dashboard excluído.");
                          navigate("/home");
                        }}
                      >
                        Sim, excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TooltipProvider>
          )}
          <ThemeToggle variant="page" />
        </div>
      </nav>

      {/* ── Corpo principal ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
        {/* Painel lateral de informações */}
        <aside
          className={`shrink-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-border bg-card transition-all duration-300 ease-in-out ${
            isSidebarOpen ? "lg:w-72" : "lg:w-0"
          }`}
        >
          <div className="w-full lg:w-72 h-full overflow-y-auto">
            {/* Thumbnail */}
            {dashboard.thumb && (
              <div className="p-3 border-b border-border">
                <img
                  src={dashboard.thumb}
                  alt={dashboard.titulo}
                  className="w-full rounded-xl object-cover max-h-40 border border-border shadow-sm"
                />
              </div>
            )}

            {/* Info do dashboard */}
            <div className="p-3 border-b border-border space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{sectorName || "Sem setor"}</Badge>
                <PBIStatusPill pbiStatus={pbiStatus} />
              </div>
              <h2 className="text-lg font-black text-foreground leading-snug">
                {dashboard.titulo}
              </h2>
              {dashboard.descricao ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {dashboard.descricao}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">
                  Sem descrição.
                </p>
              )}
              {/* Datas de refresh — linha dedicada abaixo da descrição */}
              {pbiStatus &&
                (pbiStatus.lastRefresh || pbiStatus.nextRefresh) && (
                  <div className="pt-1 flex flex-col gap-0.5">
                    {pbiStatus.lastRefresh && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="size-2.5 shrink-0" />
                        Última atualização: {fmtDate(pbiStatus.lastRefresh)}
                      </span>
                    )}
                    {pbiStatus.nextRefresh && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="size-2.5 shrink-0" />
                        Próxima atualização: {fmtDate(pbiStatus.nextRefresh)}
                      </span>
                    )}
                  </div>
                )}
            </div>

            {/* Usuários com acesso */}
            <div className="p-3">
              {/* Desktop Header: Sempre visível e estático */}
              <div className="hidden lg:flex items-center gap-2 mb-3">
                <Users className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Acesso ({users.length}{" "}
                  {users.length === 1 ? "usuário" : "usuários"})
                </h3>
              </div>

              {/* Mobile Header: Toggle interativo */}
              <button
                type="button"
                onClick={() => setIsAccessOpen(!isAccessOpen)}
                className="lg:hidden w-full flex items-center justify-between group mb-3 py-1 select-none cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Acesso ({users.length}{" "}
                    {users.length === 1 ? "usuário" : "usuários"})
                  </h3>
                </div>
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform duration-200 ${
                    isAccessOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div className={isAccessOpen ? "block" : "hidden lg:block"}>
                {users.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {users.map((u) => {
                      const uid = u.id || u.uid;
                      const isOpen = activeInfoUid === uid;
                      return (
                        <div key={uid} className="relative">
                          <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <UserAvatar user={u} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {u.display_name}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {u.email}
                              </p>
                            </div>
                            {/* Botão ⓘ */}
                            <button
                              onClick={() =>
                                setActiveInfoUid(isOpen ? null : uid)
                              }
                              className="cursor-pointer shrink-0 w-5 h-5 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
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
                          </div>

                          {/* Popover de stats */}
                          {isOpen && (
                            <UserStatsPopover
                              uid={uid}
                              dashboardId={id}
                              onClose={() => setActiveInfoUid(null)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    {isAdmin
                      ? "Nenhum usuário com acesso registrado."
                      : "Você tem acesso a este dashboard."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Área do embed ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {embedLink ? (
            <div
              ref={containerRef}
              className="w-full h-100 md:h-150 lg:h-full lg:flex-1 relative bg-muted/20"
            >
              {/* Overlay de loading do iframe */}
              {iframeLoading && !iframeError && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-muted/20 backdrop-blur-[2px]">
                  <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-muted-foreground text-xs font-medium animate-pulse">
                    Carregando relatório...
                  </p>
                </div>
              )}

              {/* Iframe Power BI */}
              {!iframeError ? (
                <iframe
                  src={embedLink}
                  title={dashboard.titulo}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="fullscreen"
                  onLoad={() => setIframeLoading(false)}
                  onError={() => {
                    setIframeError(true);
                    setIframeLoading(false);
                  }}
                  style={{
                    background: "transparent",
                  }}
                />
              ) : (
                /* Fallback se iframe falhar */
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                  <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="size-7 text-destructive" />
                  </div>
                  <div className="text-center max-w-xs">
                    <p className="text-foreground font-semibold mb-1">
                      Não foi possível carregar o relatório
                    </p>
                    <p className="text-muted-foreground text-sm">
                      O link pode não estar disponível para embed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Sem link configurado */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <div className="text-center max-w-xs">
                <p className="text-foreground font-semibold">
                  Dashboard sem link configurado
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  Este dashboard ainda não possui um link de acesso.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <FloatingChatWidget
        dashboardId={id}
        dashboard={dashboard}
        sectorName={sectorName}
        pbiStatus={pbiStatus}
      />
    </div>
  );
}
