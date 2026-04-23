import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/context/AuthContext";
import {
  createNotification,
  deleteNotification,
  getNotifications,
} from "@infra/firebase";

export default function NotificationsTab() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [form, setForm] = useState({ title: "", message: "", type: "info" });
  const [saving, setSaving] = useState(false);

  const uid = user?.uid || user?.id;

  const fetchNotifs = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      toast.error("Erro ao carregar notificações.");
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    setSaving(true);
    try {
      await createNotification(form, uid);
      setForm({ title: "", message: "", type: "info" });
      await fetchNotifs();
      toast.success("Notificação criada!");
    } catch {
      toast.error("Erro ao criar notificação.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notificação removida.");
    } catch {
      toast.error("Erro ao remover notificação.");
    }
  };

  const typeConfig = {
    info: { label: "Informação", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
    warning: { label: "Aviso", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
    success: { label: "Sucesso", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
    error: { label: "Erro", cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
  };

  const fmtTs = (ts) => {
    if (!ts) return "";
    const d = ts?.toDate?.() || new Date(ts);
    return d.toLocaleString("pt-BR");
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h2 className="text-lg font-black text-foreground">Notificações da Plataforma</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Crie comunicados visíveis para todos os usuários no sino de notificações.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm"><Plus className="size-4 text-primary" /> Nova Notificação</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Input placeholder="Título da notificação..." value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} disabled={saving} />
              </div>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Informação</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Mensagem detalhada..." value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} disabled={saving} />
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !form.title.trim() || !form.message.trim()} className="gap-1.5"><Plus className="size-4" />{saving ? "Criando..." : "Criar Notificação"}</Button>
            </div>
          </form>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm">
              Notificações ativas
              <span className="ml-2 text-xs font-normal text-muted-foreground">({notifications.length})</span>
            </h3>
            <Button variant="ghost" size="sm" onClick={fetchNotifs} disabled={loadingNotifs} className="gap-1 text-muted-foreground h-7 text-xs">
              <RefreshCw className={`size-3.5 ${loadingNotifs ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>

          {loadingNotifs ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Bell className="size-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm italic">Nenhuma notificação criada ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const tc = typeConfig[n.type] || typeConfig.info;
                return (
                  <div key={n.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                    <span className={`mt-0.5 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${tc.cls}`}>{tc.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      {n.createdAt && <p className="text-[10px] text-muted-foreground/60 mt-1">{fmtTs(n.createdAt)}</p>}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8">
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir notificação?</AlertDialogTitle>
                          <AlertDialogDescription>"{n.title}" será removida para todos os usuários.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(n.id)}>Sim, excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
