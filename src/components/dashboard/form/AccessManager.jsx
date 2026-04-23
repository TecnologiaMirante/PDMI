import { Search, UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "../../admin/AdminShared";

export default function AccessManager({
  selectedUsers,
  selectedUsersList,
  availableUsers,
  searchAccess,
  setSearchAccess,
  searchUser,
  setSearchUser,
  onAddUser,
  onRemoveUser,
}) {
  return (
    <div>
      <h2 className="text-base font-bold text-foreground mb-3 px-1">
        Controle de Acesso
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Com acesso */}
        <div className="bg-card rounded-2xl border border-border shadow-card flex flex-col min-h-72">
          <div className="px-5 py-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-sm">Com Acesso</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedUsers.length} usuário
                  {selectedUsers.length !== 1 ? "s" : ""} liberado
                  {selectedUsers.length !== 1 ? "s" : ""}
                </p>
              </div>
              {selectedUsers.length > 0 && (
                <div className="flex -space-x-2">
                  {selectedUsersList.slice(0, 3).map((u) => (
                    <UserAvatar key={u.id || u.uid} user={u} size="sm" />
                  ))}
                  {selectedUsers.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-bold text-muted-foreground">
                      +{selectedUsers.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar usuário..."
                value={searchAccess}
                onChange={(e) => setSearchAccess(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 h-64">
            {selectedUsersList.length > 0 ? (
              selectedUsersList.map((u) => (
                <div
                  key={u.id || u.uid}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-primary/20 bg-secondary/50 group"
                >
                  <UserAvatar user={u} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {u.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveUser(u.id || u.uid)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Remover acesso"
                  >
                    <UserMinus className="cursor-pointer size-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <UserMinus className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {searchAccess
                    ? "Nenhum usuário encontrado."
                    : "Nenhum usuário com acesso ainda."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Adicionar usuários */}
        <div className="bg-card rounded-2xl border border-border shadow-card flex flex-col min-h-72">
          <div className="px-5 py-4 border-b border-border space-y-3">
            <div>
              <h3 className="font-bold text-foreground text-sm">
                Adicionar Usuários
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {availableUsers.length} disponível
                {availableUsers.length !== 1 ? "is" : ""}
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 h-64">
            {availableUsers.length > 0 ? (
              availableUsers.map((u) => (
                <Button
                  key={u.id || u.uid}
                  variant="ghost"
                  onClick={() => onAddUser(u.id || u.uid)}
                  className="w-full flex items-center gap-3 p-2.5 h-auto rounded-xl border border-border bg-muted/30 hover:bg-secondary/60 hover:border-primary/20 transition-all group justify-start"
                >
                  <UserAvatar user={u} size="sm" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {u.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email}
                    </p>
                  </div>
                  <UserPlus className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 opacity-0 group-hover:opacity-100" />
                </Button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Search className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {searchUser
                    ? "Nenhum usuário encontrado."
                    : "Todos os usuários já têm acesso."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
