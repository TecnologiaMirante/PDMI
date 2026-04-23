import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Search, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateUser,
  addUserToDashboard,
  removeUserFromDashboard,
  deleteUserComplete,
} from "@infra/firebase";
import { EmptyState, UserListItem } from "./AdminShared";
import UserDetailPanel from "./UserDetailPanel";

// ── Hook de navegação mobile ───────────────────────────────────
function useMobileView() {
  const [mobileView, setMobileView] = useState("list");
  return {
    mobileView,
    goToDetail: () => setMobileView("detail"),
    goToList: () => setMobileView("list"),
  };
}

export default function UsersTab({
  users,
  setUsers,
  dashboards,
  setDashboards,
  sectors,
  isSuperAdmin,
  isAdmin,
}) {
  const { mobileView, goToDetail, goToList } = useMobileView();
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchUser, setSearchUser] = useState("");
  const [sectorEdit, setSectorEdit] = useState("");
  const [typeUserEdit, setTypeUserEdit] = useState("");
  const [savingSetor, setSavingSetor] = useState(false);
  const [savingType, setSavingType] = useState(false);

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setSectorEdit(u.sectorId || u.setor || "");
    setTypeUserEdit(u.typeUser || "user");
    goToDetail();
  };

  const handleSaveSetor = async () => {
    setSavingSetor(true);
    try {
      const uid = selectedUser.id || selectedUser.uid;
      await updateUser(uid, { sectorId: sectorEdit, setor: sectorEdit });
      const updated = {
        ...selectedUser,
        sectorId: sectorEdit,
        setor: sectorEdit,
      };
      setSelectedUser(updated);
      setUsers((prev) =>
        prev.map((u) => ((u.id || u.uid) === uid ? updated : u)),
      );
      toast.success("Setor atualizado.");
    } catch {
      toast.error("Erro ao atualizar setor.");
    } finally {
      setSavingSetor(false);
    }
  };

  const handleSaveTypeUser = async () => {
    setSavingType(true);
    try {
      const uid = selectedUser.id || selectedUser.uid;
      await updateUser(uid, { typeUser: typeUserEdit });
      const updated = { ...selectedUser, typeUser: typeUserEdit };
      setSelectedUser(updated);
      setUsers((prev) =>
        prev.map((u) => ((u.id || u.uid) === uid ? updated : u)),
      );
      toast.success("Tipo de usuário atualizado.");
    } catch {
      toast.error("Erro ao atualizar tipo de usuário.");
    } finally {
      setSavingType(false);
    }
  };

  const handleToggleDash = async (dash) => {
    const uid = selectedUser.id || selectedUser.uid;
    const has = (dash.users_acess || []).includes(uid);
    try {
      if (has) {
        await removeUserFromDashboard(dash.id, uid);
        toast.success(`Acesso removido: ${dash.titulo}`);
      } else {
        await addUserToDashboard(dash.id, uid);
        toast.success(`Acesso concedido: ${dash.titulo}`);
      }
      // Atualiza estado local do dashboard
      const updatedDash = {
        ...dash,
        users_acess: has
          ? (dash.users_acess || []).filter((u) => u !== uid)
          : [...(dash.users_acess || []), uid],
      };
      setDashboards((prev) =>
        prev.map((d) => (d.id === dash.id ? updatedDash : d)),
      );
    } catch {
      toast.error("Erro ao alterar acesso.");
    }
  };

  const handleDeleteUser = async () => {
    try {
      const uid = selectedUser.id || selectedUser.uid;
      await deleteUserComplete(uid);
      setUsers((prev) => prev.filter((u) => (u.id || u.uid) !== uid));
      setSelectedUser(null);
      toast.success("Usuário deletado com sucesso.");
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      toast.error(
        "Erro ao deletar usuário. O usuário pode estar em uso em outros lugares.",
      );
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchUser) return users;
    const q = searchUser.toLowerCase();
    return users.filter(
      (u) =>
        u.display_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q),
    );
  }, [searchUser, users]);

  return (
    <>
      {/* Desktop */}
      <div
        className="hidden md:flex flex-1 gap-6 p-6 overflow-hidden"
        style={{ maxHeight: "calc(100vh - 72px)" }}
      >
        {/* Lista de usuários */}
        <div className="w-80 bg-card rounded-2xl border border-border shadow-card flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-border bg-muted/40">
            <h2 className="font-bold text-foreground mb-3">
              Usuários ({users.length})
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar usuário..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {filteredUsers.map((u) => (
              <UserListItem
                key={u.id || u.uid}
                user={u}
                sectorName={
                  sectors.find((s) => s.id === u.sectorId || s.id === u.setor)
                    ?.name
                }
                selected={
                  (selectedUser?.id || selectedUser?.uid) === (u.id || u.uid)
                }
                onClick={() => handleSelectUser(u)}
              />
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum usuário encontrado.
              </p>
            )}
          </div>
        </div>

        {/* Detalhe do usuário */}
        {selectedUser ? (
          <div className="flex-1 bg-card rounded-2xl border border-border shadow-card flex flex-col overflow-hidden min-w-0">
            <UserDetailPanel
              user={selectedUser}
              dashboards={dashboards}
              sectors={sectors}
              sectorEdit={sectorEdit}
              onSectorChange={setSectorEdit}
              onSaveSetor={handleSaveSetor}
              savingSetor={savingSetor}
              typeUserEdit={typeUserEdit}
              onTypeUserChange={setTypeUserEdit}
              onSaveTypeUser={handleSaveTypeUser}
              savingType={savingType}
              isSuperAdmin={isSuperAdmin}
              isAdmin={isAdmin}
              onToggleDash={handleToggleDash}
              onDeleteUser={handleDeleteUser}
            />
          </div>
        ) : (
          <EmptyState
            text="Selecione um usuário"
            sub="Para editar o setor e gerenciar acessos"
          />
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden flex-1 overflow-hidden flex flex-col">
        {mobileView === "list" ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Buscar usuário..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {filteredUsers.map((u) => (
                <UserListItem
                  key={u.id || u.uid}
                  user={u}
                  selected={false}
                  onClick={() => handleSelectUser(u)}
                  sectorName={
                    sectors.find((s) => s.id === u.sectorId || s.id === u.setor)
                      ?.name
                  }
                />
              ))}
            </div>
          </div>
        ) : selectedUser ? (
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
            <div className="flex-1 overflow-y-auto">
              <UserDetailPanel
                user={selectedUser}
                dashboards={dashboards}
                sectors={sectors}
                sectorEdit={sectorEdit}
                onSectorChange={setSectorEdit}
                onSaveSetor={handleSaveSetor}
                savingSetor={savingSetor}
                typeUserEdit={typeUserEdit}
                onTypeUserChange={setTypeUserEdit}
                onSaveTypeUser={handleSaveTypeUser}
                savingType={savingType}
                isSuperAdmin={isSuperAdmin}
                isAdmin={isAdmin}
                onToggleDash={handleToggleDash}
                onDeleteUser={handleDeleteUser}
              />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
