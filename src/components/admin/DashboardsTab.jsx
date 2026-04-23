import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addUserToDashboard,
  removeUserFromDashboard,
  deleteDashboard,
} from "@infra/firebase";
import { usePowerBIStatuses } from "@/hooks/usePowerBIStatuses";
import {
  EmptyState,
  DashHeader,
  AccessPanel,
  MobileAccessTabs,
  DashItem,
} from "./AdminShared";

// ── Hook de navegação mobile ───────────────────────────────────
function useMobileView() {
  const [mobileView, setMobileView] = useState("list");
  return {
    mobileView,
    goToDetail: () => setMobileView("detail"),
    goToList: () => setMobileView("list"),
  };
}

function DashList({ dashboards, sectors, selectedId, onSelect, navigate, isAdmin, onDelete }) {
  return (
    <div className="w-80 bg-card rounded-2xl border border-border shadow-card flex flex-col overflow-hidden shrink-0">
      <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
        <h2 className="font-bold text-foreground">
          Dashboards ({dashboards.length})
        </h2>
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => navigate("/admin/dashboard/create")}
            className="gap-1"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Novo</span>
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {dashboards.map((dash) => (
          <DashItem
            key={dash.id}
            dash={dash}
            selected={selectedId === dash.id}
            onClick={() => onSelect(dash)}
            navigate={navigate}
            isAdmin={isAdmin}
            onDelete={onDelete}
            sectorName={
              sectors?.find((s) => s.id === dash.sectorId || s.id === dash.setor)?.name
            }
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardsTab({
  dashboards,
  setDashboards,
  users,
  sectors,
  navigate,
  isAdmin,
}) {
  const { mobileView, goToDetail, goToList } = useMobileView();
  const [selectedDash, setSelectedDash] = useState(null);
  const [searchAccess, setSearchAccess] = useState("");
  const [searchAdd, setSearchAdd] = useState("");

  const pbiStatuses = usePowerBIStatuses(dashboards);

  const handleSelectDash = (dash) => {
    setSelectedDash(dash);
    setSearchAccess("");
    setSearchAdd("");
    goToDetail();
  };

  const handleAddAccess = async (uid) => {
    try {
      await addUserToDashboard(selectedDash.id, uid);
      const updated = {
        ...selectedDash,
        users_acess: [...(selectedDash.users_acess || []), uid],
      };
      setSelectedDash(updated);
      setDashboards((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d)),
      );
      toast.success("Acesso concedido.");
    } catch {
      toast.error("Erro ao conceder acesso.");
    }
  };

  const handleRemoveAccess = async (uid) => {
    try {
      await removeUserFromDashboard(selectedDash.id, uid);
      const updated = {
        ...selectedDash,
        users_acess: (selectedDash.users_acess || []).filter((u) => u !== uid),
      };
      setSelectedDash(updated);
      setDashboards((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d)),
      );
      toast.success("Acesso removido.");
    } catch {
      toast.error("Erro ao remover acesso.");
    }
  };

  const handleDeleteDash = async (dashId) => {
    try {
      await deleteDashboard(dashId);
      setDashboards((prev) => prev.filter((d) => d.id !== dashId));
      if (selectedDash?.id === dashId) setSelectedDash(null);
      toast.success("Dashboard deletado com sucesso.");
    } catch {
      toast.error("Erro ao deletar dashboard.");
    }
  };

  const withAccess = useMemo(() => {
    if (!selectedDash) return [];
    const set = new Set(selectedDash.users_acess || []);
    return users.filter((u) => set.has(u.id || u.uid));
  }, [selectedDash, users]);

  const filteredWithAccess = useMemo(() => {
    if (!searchAccess) return withAccess;
    const q = searchAccess.toLowerCase();
    return withAccess.filter(
      (u) =>
        u.display_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q),
    );
  }, [searchAccess, withAccess]);

  const availableUsers = useMemo(() => {
    if (!selectedDash) return [];
    const set = new Set(selectedDash.users_acess || []);
    return users.filter((u) => {
      if (set.has(u.id || u.uid)) return false;
      if (!searchAdd) return true;
      const q = searchAdd.toLowerCase();
      return (
        u.display_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });
  }, [searchAdd, selectedDash, users]);

  return (
    <>
      {/* Desktop */}
      <div
        className="hidden md:flex flex-1 gap-6 p-6 overflow-hidden"
        style={{ maxHeight: "calc(100vh - 72px)" }}
      >
        <DashList
          dashboards={dashboards}
          sectors={sectors}
          selectedId={selectedDash?.id}
          onSelect={handleSelectDash}
          navigate={navigate}
          isAdmin={isAdmin}
          onDelete={handleDeleteDash}
        />
        {selectedDash ? (
          <div className="flex-1 bg-card rounded-2xl border border-border shadow-card flex flex-col overflow-hidden min-w-0">
            <DashHeader
              dash={selectedDash}
              sectorName={
                sectors.find(
                  (s) =>
                    s.id === selectedDash.sectorId ||
                    s.id === selectedDash.setor,
                )?.name
              }
              pbiStatus={pbiStatuses[selectedDash.titulo]}
            />
            <div className="flex flex-1 overflow-hidden">
              <AccessPanel
                title="Com Acesso"
                count={withAccess.length}
                users={filteredWithAccess}
                search={searchAccess}
                onSearch={setSearchAccess}
                actionLabel="Remover"
                actionVariant="destructive"
                onAction={(u) => handleRemoveAccess(u.id || u.uid)}
                emptyText="Nenhum usuário com acesso."
                dashboardId={selectedDash?.id}
              />
              <div className="w-px bg-border shrink-0" />
              <AccessPanel
                title="Adicionar Acesso"
                count={availableUsers.length}
                users={availableUsers}
                search={searchAdd}
                onSearch={setSearchAdd}
                actionLabel="Adicionar"
                actionVariant="secondary"
                onAction={(u) => handleAddAccess(u.id || u.uid)}
                emptyText={
                  searchAdd
                    ? "Nenhum usuário encontrado."
                    : "Todos os usuários já têm acesso."
                }
              />
            </div>
          </div>
        ) : (
          <EmptyState
            text="Selecione um dashboard"
            sub="Para gerenciar os acessos"
          />
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden flex-1 overflow-hidden flex flex-col">
        {mobileView === "list" ? (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {isAdmin && (
              <Button
                onClick={() => navigate("/admin/dashboard/create")}
                className="gap-1 w-full"
              >
                <Plus className="size-4" />
                Novo Dashboard
              </Button>
            )}
            {dashboards.map((dash) => (
              <DashItem
                key={dash.id}
                dash={dash}
                selected={false}
                onClick={() => handleSelectDash(dash)}
                navigate={navigate}
                isAdmin={isAdmin}
                onDelete={handleDeleteDash}
                sectorName={
                  sectors.find(
                    (s) => s.id === dash.sectorId || s.id === dash.setor,
                  )?.name
                }
              />
            ))}
          </div>
        ) : selectedDash ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToList}
                className="gap-1 text-primary"
              >
                <ChevronLeft className="size-4" /> Voltar
              </Button>
            </div>
            <DashHeader
              dash={selectedDash}
              compact
              sectorName={
                sectors.find(
                  (s) =>
                    s.id === selectedDash.sectorId ||
                    s.id === selectedDash.setor,
                )?.name
              }
              pbiStatus={pbiStatuses[selectedDash.titulo]}
            />
            <MobileAccessTabs
              withAccess={filteredWithAccess}
              totalAccess={withAccess.length}
              searchAccess={searchAccess}
              onSearchAccess={setSearchAccess}
              availableUsers={availableUsers}
              searchAdd={searchAdd}
              onSearchAdd={setSearchAdd}
              onAdd={(u) => handleAddAccess(u.id || u.uid)}
              onRemove={(u) => handleRemoveAccess(u.id || u.uid)}
              dashboardId={selectedDash?.id}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
