import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  LayoutDashboard,
  Users,
  Building,
  BarChart2,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { getDashboards, getUsers, getSectors } from "@infra/firebase";
import { useAuth } from "@/context/AuthContext";

// Importações dos novos componentes
import DashboardsTab from "@/components/admin/DashboardsTab";
import UsersTab from "@/components/admin/UsersTab";
import SectorsTab from "@/components/admin/SectorsTab";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import NotificationsTab from "@/components/admin/NotificationsTab";
import { SkeletonCard, SkeletonRow } from "@/components/ui/Skeleton";

// ══════════════════════════════════════════════════════════════
// PAGE PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboards");

  // Dados compartilhados entre as duas abas
  const [dashboards, setDashboards] = useState([]);
  const [users, setUsers] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    async function fetchData() {
      try {
        const [dashData, usersData, sectorsData] = await Promise.all([
          getDashboards(),
          getUsers(),
          getSectors().catch(() => []),
        ]);
        setDashboards(
          [...dashData].sort((a, b) =>
            (a.titulo || "").localeCompare(b.titulo || ""),
          ),
        );
        setUsers(
          [...usersData].sort((a, b) =>
            (a.display_name || "").localeCompare(b.display_name || ""),
          ),
        );
        setSectors(sectorsData);
      } catch {
        toast.error("Erro ao carregar dados de administração.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-xl text-foreground font-semibold">
          Acesso bloqueado.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center gap-4 px-4 md:px-6 py-4 shadow-nav" style={{ background: "linear-gradient(90deg, #006064 0%, #00838F 50%, #006064 100%)" }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/home")}
          className="gap-1 text-white/90 hover:text-white hover:bg-white/10"
        >
          <ChevronLeft className="size-4" />
          Voltar
        </Button>
        <h1 className="text-lg font-bold text-white hidden md:block">
          Painel de Administração
        </h1>

        {/* Abas */}
        <div className="flex gap-1 ml-auto items-center">
          <ThemeToggle variant="navbar" />
          <TabButton
            active={activeTab === "dashboards"}
            onClick={() => setActiveTab("dashboards")}
            icon={<LayoutDashboard className="size-4" />}
            label="Dashboards"
          />
          <TabButton
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
            icon={<Users className="size-4" />}
            label="Usuários"
          />
          <TabButton
            active={activeTab === "sectors"}
            onClick={() => setActiveTab("sectors")}
            icon={<Building className="size-4" />}
            label="Setores"
          />
          <TabButton
            active={activeTab === "analytics"}
            onClick={() => setActiveTab("analytics")}
            icon={<BarChart2 className="size-4" />}
            label="Analytics"
          />
          <TabButton
            active={activeTab === "notifications"}
            onClick={() => setActiveTab("notifications")}
            icon={<Bell className="size-4" />}
            label="Notificações"
          />
        </div>
      </nav>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex-1 p-6 space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-muted/30 animate-pulse border border-border"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              {[...Array(6)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
            <div className="lg:col-span-2">
              <SkeletonCard className="h-100" />
            </div>
          </div>
        </div>
      ) : activeTab === "dashboards" ? (
        <DashboardsTab
          dashboards={dashboards}
          setDashboards={setDashboards}
          users={users}
          sectors={sectors}
          navigate={navigate}
          isAdmin={isAdmin}
        />
      ) : activeTab === "users" ? (
        <UsersTab
          users={users}
          setUsers={setUsers}
          dashboards={dashboards}
          setDashboards={setDashboards}
          sectors={sectors}
          isSuperAdmin={isSuperAdmin}
          isAdmin={isAdmin}
        />
      ) : activeTab === "sectors" ? (
        <SectorsTab
          sectors={sectors}
          setSectors={setSectors}
          dashboards={dashboards}
          users={users}
        />
      ) : activeTab === "analytics" ? (
        <AnalyticsTab dashboards={dashboards} users={users} />
      ) : (
        <NotificationsTab />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`cursor-pointer flex items-center gap-2 font-semibold transition-colors
        ${active
          ? "bg-white/20 text-white hover:bg-white/25"
          : "text-white/70 hover:text-white hover:bg-white/10"}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
