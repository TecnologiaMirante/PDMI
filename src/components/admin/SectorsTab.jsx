import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Save, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/context/AuthContext";
import { createSector, updateSector, deleteSector } from "@infra/firebase";
import { EmptyState } from "./AdminShared";

export default function SectorsTab({ sectors, setSectors, dashboards = [], users = [] }) {
  const { user } = useAuth();
  const [newSectorName, setNewSectorName] = useState("");
  const [editingSector, setEditingSector] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeSectorId, setActiveSectorId] = useState(null);

  const uid = user?.uid || user?.id || "unknown";

  const handleCreateSector = async (e) => {
    e.preventDefault();
    if (!newSectorName.trim()) return;
    setSaving(true);
    try {
      const id = await createSector({ name: newSectorName }, uid);
      setSectors((prev) =>
        [...prev, { id, name: newSectorName }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setNewSectorName("");
      toast.success("Setor criado!");
    } catch {
      toast.error("Erro ao criar setor.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSector = async () => {
    if (!editingName.trim() || !editingSector) return;
    setSaving(true);
    try {
      await updateSector(editingSector.id, { name: editingName }, uid);
      setSectors((prev) =>
        prev
          .map((s) => (s.id === editingSector.id ? { ...s, name: editingName } : s))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditingSector(null);
      setEditingName("");
      toast.success("Setor atualizado!");
    } catch {
      toast.error("Erro ao atualizar setor.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSector = async (id) => {
    try {
      await deleteSector(id);
      setSectors((prev) => prev.filter((s) => s.id !== id));
      toast.success("Setor apagado.");
    } catch {
      toast.error("Erro ao apagar setor.");
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {/* Header form */}
        <div className="p-5 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div>
            <h2 className="font-bold text-foreground text-lg">Gerenciar Setores</h2>
            <p className="text-sm text-muted-foreground">Crie e edite os setores da plataforma.</p>
          </div>

          <form onSubmit={handleCreateSector} className="flex items-center gap-2">
            <Input placeholder="Nome do novo setor..." value={newSectorName} onChange={(e) => setNewSectorName(e.target.value)} disabled={saving} />
            <Button type="submit" disabled={!newSectorName.trim() || saving} className="shrink-0 gap-1.5"><Plus className="size-4" /> Criar</Button>
          </form>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-3">
            {sectors.map((s) => (
              <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/30 transition-colors gap-4">
                {editingSector?.id === s.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus />
                    <Button size="sm" onClick={handleUpdateSector} disabled={saving} className="gap-1.5"><Save className="size-3.5" /> Salvar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingSector(null)} disabled={saving}>Cancelar</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0 relative">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground text-base truncate">{s.name}</h3>
                        <button
                          onClick={() => setActiveSectorId(activeSectorId === s.id ? null : s.id)}
                          className={`cursor-pointer shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                            activeSectorId === s.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                          }`}
                          title="Ver dashboards e usuários deste setor"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                          {dashboards.filter(d => String(d.sectorId) === String(s.id) || String(d.setor) === String(s.id) || String(d.setor) === String(s.name)).length} dashboards
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                          {users.filter(u => String(u.setor) === String(s.id) || String(u.sectorId) === String(s.id) || String(u.setor) === String(s.name)).length} usuários
                        </span>
                      </div>
                      {activeSectorId === s.id && (
                        <SectorDetailsPopover
                          sector={s}
                          dashboards={dashboards}
                          users={users}
                          onClose={() => setActiveSectorId(null)}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => { setEditingSector(s); setEditingName(s.name); }}>
                        <Edit className="size-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir setor?</AlertDialogTitle>
                            <AlertDialogDescription>Você está apagando o setor <strong>{s.name}</strong>. Terá que renomeá-lo nos dashboards que já o utilizam.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDeleteSector(s.id)}>Sim, excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </div>
            ))}
            {sectors.length === 0 && <EmptyState text="Nenhum setor cadastrado" sub="Adicione um no formulário acima." />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SectorDetailsPopover ─────────────────────────────────────────
function SectorDetailsPopover({ sector, dashboards, users, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const ds = dashboards.filter(d => String(d.sectorId) === String(sector.id) || String(d.setor) === String(sector.id) || String(d.setor) === String(sector.name));
  const us = users.filter(u => String(u.setor) === String(sector.id) || String(u.sectorId) === String(sector.id) || String(u.setor) === String(sector.name));

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-2 z-50 w-72 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider">
          Detalhes do Setor
        </p>
        <button
          onClick={onClose}
          className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-border">
        {/* Dashboards Section */}
        <div className="py-2">
          <p className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Dashboards ({ds.length})</p>
          {ds.length === 0 ? (
            <p className="px-4 text-[11px] text-muted-foreground italic">Nenhum dashboard</p>
          ) : (
            ds.map(d => (
              <div key={d.id} className="px-4 py-1.5 flex items-center gap-2 hover:bg-muted/30">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                <p className="text-xs text-foreground truncate">{d.titulo}</p>
              </div>
            ))
          )}
        </div>
        {/* Users Section */}
        <div className="py-2">
          <p className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Usuários ({us.length})</p>
          {us.length === 0 ? (
            <p className="px-4 text-[11px] text-muted-foreground italic">Nenhum usuário</p>
          ) : (
            us.map(u => (
              <div key={u.id || u.uid} className="px-4 py-1.5 flex items-center gap-2 hover:bg-muted/30">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{u.display_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
