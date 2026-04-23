import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Trash2, Monitor, Clock, LayoutDashboard, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getUserStats } from "@infra/firebase";
import { TYPE_LABELS, fmtAdminTime } from "./adminUtils";
import { UserAvatar, AdminStatCard } from "./AdminShared";

function DashAccessRow({ dash, hasAccess, onToggle, sectorName, dashStats }) {
  const accessCount = dashStats?.accessCount || 0;
  const timeSeconds = dashStats?.totalTimeSeconds || 0;
  const lastAccess = dashStats?.lastAccess;

  const fmtDate = (ts) => {
    if (!ts) return null;
    const d = ts?.toDate?.() ?? (ts instanceof Date ? ts : new Date(ts));
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-xl border transition-colors
      ${hasAccess ? "border-primary/30 bg-secondary/50" : "border-border bg-card"}`}
    >
      {/* Linha principal: thumb + título + botão */}
      <div className="flex items-center gap-3">
        {dash.thumb ? (
          <img
            src={dash.thumb}
            alt={dash.titulo}
            className="w-14 h-10 rounded-lg object-cover border border-border shrink-0"
          />
        ) : (
          <div className="w-14 h-10 rounded-lg bg-linear-to-br from-primary to-ring shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{dash.titulo}</p>
          <p className="text-xs text-muted-foreground">{sectorName || dash.setor}</p>
        </div>
        <Button
          variant={hasAccess ? "destructive" : "default"}
          size="sm"
          onClick={onToggle}
          className="shrink-0 min-w-25"
        >
          {hasAccess ? "Remover acesso" : "Dar acesso"}
        </Button>
      </div>

      {/* Linha de stats: só aparece se o usuário TEM acesso e JÁ acessou */}
      {hasAccess && (
        <div className="flex items-center gap-3 px-1 pt-1 border-t border-border/40">
          {accessCount > 0 ? (
            <>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                <span className="font-semibold text-foreground">{accessCount}</span> acesso{accessCount !== 1 ? "s" : ""}
              </span>
              <span className="w-px h-3 bg-border" />
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span className="font-semibold text-foreground">{fmtAdminTime(timeSeconds)}</span>
              </span>
              {lastAccess && (
                <>
                  <span className="w-px h-3 bg-border" />
                  <span className="text-[11px] text-muted-foreground">
                    Último: <span className="font-semibold text-foreground">{fmtDate(lastAccess)}</span>
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground/60 italic">
              Acesso liberado, mas ainda não visitou
            </span>
          )}
        </div>
      )}
    </div>
  );
}


export default function UserDetailPanel({
  user,
  dashboards,
  sectors,
  sectorEdit,
  onSectorChange,
  onSaveSetor,
  savingSetor,
  typeUserEdit,
  onTypeUserChange,
  onSaveTypeUser,
  savingType,
  isSuperAdmin,
  isAdmin,
  onToggleDash,
  onDeleteUser,
}) {
  const uid = user.id || user.uid;
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (uid) {
      getUserStats(uid).then(setStats).catch(console.error);
    }
  }, [uid]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header do usuário */}
      <div className="p-6 border-b border-border flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <UserAvatar user={user} size="md" />
          <div className="min-w-0">
            <h2 className="text-lg font-black text-foreground truncate">
              {user.display_name}
            </h2>
            <p className="text-sm text-muted-foreground truncate">
              {user.email}
            </p>
            {user.typeUser && (
              <Badge
                variant={user.typeUser === "admin" ? "default" : "secondary"}
                className="mt-1"
              >
                {TYPE_LABELS[user.typeUser] ?? user.typeUser}
              </Badge>
            )}
          </div>
        </div>
        {(isSuperAdmin || (isAdmin && user.typeUser === "user")) && (
          <TooltipProvider>
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      <span className="hidden sm:inline">Deletar</span>
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Deletar usuário</p>
                </TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Deletar "{user.display_name}"?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O usuário será
                    permanentemente removido.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={onDeleteUser}
                  >
                    Sim, deletar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TooltipProvider>
        )}
      </div>

      {/* Estatísticas de Acesso */}
      <div className="px-6 py-4 border-b border-border shrink-0 bg-muted/10">
        <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase block mb-3">
          Métricas de Plataforma
        </label>
        <div className="grid grid-cols-2 gap-2">
          <AdminStatCard
            icon={<Monitor className="text-primary size-4" />}
            label="Acessos"
            value={stats?.platform?.accessCount ?? 0}
          />
          <AdminStatCard
            icon={<Clock className="text-primary size-4" />}
            label="Tempo Online"
            value={fmtAdminTime(stats?.platform?.totalTimeSeconds)}
          />
          <AdminStatCard
            icon={<LayoutDashboard className="text-primary size-4" />}
            label="Dashboards visitados"
            value={Object.keys(stats?.dashboards ?? {}).length}
          />
          <AdminStatCard
            icon={<CalendarClock className="text-primary size-4" />}
            label="Último acesso"
            value={
              stats?.platform?.lastAccess
                ? new Date(
                    stats.platform.lastAccess?.toDate?.() ||
                      stats.platform.lastAccess,
                  ).toLocaleDateString("pt-BR")
                : "—"
            }
            small
          />
        </div>
      </div>

      {/* Editar setor */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase block mb-2">
          Setor
        </label>
        <div className="flex gap-2">
          <Select value={sectorEdit} onValueChange={onSectorChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecionar setor..." />
            </SelectTrigger>
            <SelectContent>
              {sectors.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={onSaveSetor}
            disabled={
              savingSetor || sectorEdit === (user.sectorId || user.setor || "")
            }
            size="sm"
            className="gap-1.5 shrink-0"
          >
            <Save className="size-3.5" />
            {savingSetor ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Editar tipo de usuário (apenas para SuperAdmin) */}
      {isSuperAdmin && (
        <div className="px-6 py-4 border-b border-border shrink-0">
          <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase block mb-2">
            Tipo de Usuário
          </label>
          <div className="flex gap-2">
            <Select value={typeUserEdit} onValueChange={onTypeUserChange}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">SuperAdmin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={onSaveTypeUser}
              disabled={
                savingType || typeUserEdit === (user.typeUser || "user")
              }
              size="sm"
              className="gap-1.5 shrink-0"
            >
              <Save className="size-3.5" />
              {savingType ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}

      {/* Lista de dashboards com acesso */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-bold text-foreground">
            Acesso aos Dashboards
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (
              {
                dashboards.filter((d) => (d.users_acess || []).includes(uid))
                  .length
              }
              /{dashboards.length} liberados)
            </span>
          </h3>
        </div>

        <div className="p-4 flex flex-col gap-2">
          {dashboards.map((dash) => {
            const hasAccess = (dash.users_acess || []).includes(uid);
            return (
              <DashAccessRow
                key={dash.id}
                dash={dash}
                sectorName={
                  sectors.find(
                    (s) => s.id === dash.sectorId || s.id === dash.setor,
                  )?.name
                }
                hasAccess={hasAccess}
                onToggle={() => onToggleDash(dash)}
                dashStats={stats?.dashboards?.[dash.id] ?? null}
              />
            );
          })}
          {dashboards.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum dashboard cadastrado.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
