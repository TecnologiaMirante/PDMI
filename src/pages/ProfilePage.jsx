import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Clock,
  Monitor,
  LayoutDashboard,
  CalendarClock,
  Save,
  X,
} from "lucide-react";
import { Skeleton, SkeletonStatCard } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { getUserStats, getSectors, updateUser } from "@infra/firebase";
import { toast } from "sonner";
import portalLogo from "@/assets/PORTAL-DE-DADOS.png";

// ── Helpers ────────────────────────────────────────────────────
function fmtTime(seconds) {
  if (!seconds) return "0 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

// ── Componentes auxiliares ─────────────────────────────────────
function UserAvatar({ user, size = "lg" }) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = size === "lg" ? "w-24 h-24" : "w-10 h-10";
  const textClass = size === "lg" ? "text-3xl" : "text-sm";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  if (user?.picture && !imgError) {
    return (
      <img
        src={user.picture}
        alt={user.name}
        className={`${sizeClass} rounded-full object-cover border-4 border-primary/20 shadow-lg`}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full bg-secondary border-4 border-primary/20 shadow-lg flex items-center justify-center ${textClass} font-bold text-primary`}
    >
      {initials}
    </div>
  );
}

function StatCard({ icon, label, value, small = false }) {
  return (
    <div className="flex items-center gap-3 bg-muted/30 border border-border p-3 rounded-xl">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground leading-none mb-1">
          {label}
        </span>
        <span
          className={`block font-bold text-foreground leading-tight ${small ? "text-sm" : "text-base"}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
        {label}
      </label>
      <div className="px-4 py-3 rounded-xl border border-transparent bg-muted/20">
        <span className="text-foreground text-sm">{value || "—"}</span>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function ProfilePage() {
  const { user, userProfile, logout, isAdmin, refreshProfile } = useAuth();
  // Apenas admins podem editar o perfil
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [editing, setEditing] = useState(false);
  const [sectorId, setSectorId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const uid = user?.uid || user?.id;
        if (uid) {
          const [statsData, sectorsData] = await Promise.all([
            getUserStats(uid),
            getSectors(),
          ]);
          setStats(statsData);
          setSectors(sectorsData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // Inicializa o campo de edição com o valor atual
  useEffect(() => {
    if (userProfile)
      setSectorId(userProfile.sectorId || userProfile.setor || "");
  }, [userProfile]);

  const currentSectorName =
    sectors.find((s) => s.id === (userProfile?.sectorId || userProfile?.setor))
      ?.name ||
    userProfile?.sectorId ||
    userProfile?.setor ||
    "Não definido";

  const handleSave = async () => {
    if (!sectorId) {
      toast.error("Setor é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      const uid = user?.uid || user?.id;
      await updateUser(uid, { sectorId });
      await refreshProfile();
      toast.success("Perfil atualizado!");
      setEditing(false);
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSectorId(userProfile?.sectorId || userProfile?.setor || "");
    setEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 shadow-nav"
        style={{
          background:
            "linear-gradient(90deg, #006064 0%, #00838F 50%, #006064 100%)",
        }}
      >
        <div className="grid grid-cols-3 items-center px-4 h-16">
          <div className="flex items-center justify-start gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/home")}
              className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5 font-medium shrink-0"
            >
              <ChevronLeft className="size-4" /> <span className="hidden md:inline">Voltar</span>
            </Button>
            <ThemeToggle variant="navbar" />
          </div>
          
          <div className="flex justify-center">
            <img
              src={portalLogo}
              alt="Portal de Dados Mirante"
              className="h-7 md:h-8 w-auto select-none"
              draggable={false}
            />
          </div>
          
          <div className="flex items-center justify-end gap-2">
            {/* Filler for right column */}
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-start pt-12 px-4 pb-12">
        <div className="w-full max-w-3xl flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full md:w-52 shrink-0">
            <Card className="py-0 gap-0 overflow-hidden">
              {[
                {
                  label: "Dashboards",
                  action: () => navigate("/home"),
                  id: "nav-home",
                },
                ...(isAdmin
                  ? [
                      {
                        label: "Administração",
                        action: () => navigate("/admin"),
                        id: "nav-admin",
                      },
                    ]
                  : []),
                {
                  label: "Meu Perfil",
                  action: () => {},
                  id: "nav-profile",
                  active: true,
                },
                {
                  label: "Log Out",
                  action: handleLogout,
                  id: "nav-logout",
                  danger: true,
                },
              ].map((item) => (
                <Button
                  key={item.id}
                  id={item.id}
                  variant="ghost"
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 h-auto text-sm font-medium
                    transition-colors duration-150 justify-start rounded-none border-b border-border last:border-0
                    ${
                      item.active
                        ? "bg-secondary text-primary hover:bg-secondary"
                        : item.danger
                          ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                          : "text-foreground hover:bg-muted/50"
                    }`}
                >
                  {item.label}
                </Button>
              ))}
            </Card>
          </aside>

          {/* Card principal */}
          <Card className="flex-1 p-8 items-center gap-0">
            <CardContent className="flex flex-col items-center w-full px-0">
              <UserAvatar user={user} size="lg" />
              <h1 className="mt-5 text-2xl font-bold text-foreground">
                {user?.name}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {user?.email}
              </p>

              {/* Métricas */}
              <div className="w-full grid grid-cols-2 gap-3 mt-6 mb-1">
                {loading ? (
                  <>
                    <SkeletonStatCard />
                    <SkeletonStatCard />
                    <SkeletonStatCard />
                    <SkeletonStatCard />
                  </>
                ) : (
                  <>
                    <StatCard
                      icon={<Monitor className="text-primary size-4" />}
                      label="Acessos à plataforma"
                      value={stats?.platform?.accessCount ?? 0}
                    />
                    <StatCard
                      icon={<Clock className="text-primary size-4" />}
                      label="Tempo na plataforma"
                      value={fmtTime(stats?.platform?.totalTimeSeconds)}
                    />
                    <StatCard
                      icon={<LayoutDashboard className="text-primary size-4" />}
                      label="Dashboards visitados"
                      value={Object.keys(stats?.dashboards ?? {}).length}
                    />
                    <StatCard
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
                  </>
                )}
              </div>

              <div className="w-full h-px bg-border my-6" />

              {/* Campos do perfil */}
              <div className="w-full space-y-4">
                {loading ? (
                  <>
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                  </>
                ) : (
                  <>
                    <ReadOnlyField label="Nome completo" value={user?.name} />
                    <ReadOnlyField label="E-mail" value={user?.email} />

                    {/* Setor — editável apenas por admin */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                        Setor
                      </label>
                      {isAdmin && editing ? (
                        <Select value={sectorId} onValueChange={setSectorId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione seu setor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {sectors.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="px-4 py-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                          <span className="text-foreground text-sm">
                            {currentSectorName}
                          </span>
                          {/* Ícone de lápis apenas para admin (indica que é editável) */}
                          {isAdmin && (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-muted-foreground"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Botões de ação */}
              <div className="w-full flex gap-3 mt-8">
                {isAdmin && editing ? (
                  <>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 gap-1.5"
                    >
                      <Save className="size-4" />
                      {saving ? "Salvando..." : "Salvar alterações"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={saving}
                      className="gap-1.5"
                    >
                      <X className="size-4" /> Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    {isAdmin && (
                      <Button
                        onClick={() => setEditing(true)}
                        className="flex-1"
                      >
                        Editar Perfil
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      className={isAdmin ? "flex-1" : "w-full"}
                      asChild
                    >
                      <a href="mailto:suporte@mirante.com.br">Suporte</a>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
