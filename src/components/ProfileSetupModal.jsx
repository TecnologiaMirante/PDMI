import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getSectors, updateUser } from "@infra/firebase";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import portalLogo from "@/assets/PORTAL-DE-DADOS.png";

export default function ProfileSetupModal() {
  const { user, userProfile, refreshProfile } = useAuth();
  const [sectors, setSectors] = useState([]);
  const [sectorId, setSectorId] = useState("");
  const [saving, setSaving] = useState(false);
  const [sectorError, setSectorError] = useState(false);

  // Carrega setores disponíveis
  useEffect(() => {
    getSectors()
      .then(setSectors)
      .catch(() => setSectors([]));
  }, []);

  // Perfil incompleto = documento não existe ainda ou existe sem sectorId
  const isIncomplete =
    userProfile === null || (!userProfile?.sectorId && !userProfile?.setor);

  if (!user || !isIncomplete) return null;

  const handleSave = async () => {
    if (!sectorId) {
      setSectorError(true);
      return;
    }
    setSectorError(false);
    setSaving(true);
    try {
      const uid = user.uid || user.id;
      await updateUser(uid, { sectorId });
      await refreshProfile();
      toast.success("Perfil concluído! Bem-vindo ao Portal.");
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    // Overlay bloqueante — sem onClose, sem escape
    <div className="fixed inset-0 z-9999 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Header colorido */}
        <div
          className="px-8 py-6 flex flex-col items-center gap-3"
          style={{
            background:
              "linear-gradient(135deg, #006064 0%, #00838F 60%, #00acc1 100%)",
          }}
        >
          <img
            src={portalLogo}
            alt="Portal de Dados Mirante"
            className="h-8 w-auto brightness-0 invert select-none"
            draggable={false}
          />
          <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-white font-black text-xl">
              Complete seu perfil
            </h2>
            <p className="text-white/80 text-sm mt-1">
              Para acessar a plataforma, preencha as informações abaixo.
            </p>
          </div>
        </div>

        {/* Corpo */}
        <div className="px-8 py-6 space-y-5">
          {/* Nome (somente leitura) */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Nome
            </label>
            <div className="px-4 py-3 rounded-xl bg-muted/40 border border-border">
              <span className="text-foreground text-sm font-medium">
                {user?.name || "—"}
              </span>
            </div>
          </div>

          {/* E-mail (somente leitura) */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              E-mail
            </label>
            <div className="px-4 py-3 rounded-xl bg-muted/40 border border-border">
              <span className="text-foreground text-sm font-medium">
                {user?.email || "—"}
              </span>
            </div>
          </div>

          {/* Setor — obrigatório */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Setor <span className="text-destructive">*</span>
            </label>
            <Select
              value={sectorId}
              onValueChange={(v) => {
                setSectorId(v);
                setSectorError(false);
              }}
            >
              <SelectTrigger
                className={`w-full ${sectorError ? "border-destructive ring-1 ring-destructive" : ""}`}
              >
                <SelectValue placeholder="Selecione seu setor..." />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sectorError && (
              <p className="text-destructive text-xs mt-1.5 flex items-center gap-1">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Setor é obrigatório para continuar.
              </p>
            )}
          </div>

          <Button
            className="w-full h-11 text-sm font-bold mt-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </span>
            ) : (
              "Concluir cadastro e entrar"
            )}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            Esta etapa é obrigatória. Você não poderá pular este passo.
          </p>
        </div>
      </div>
    </div>
  );
}
