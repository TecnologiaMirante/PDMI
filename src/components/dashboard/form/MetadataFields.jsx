import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MetadataFields({
  register,
  control,
  errors,
  FieldError,
  sectorId,
  setores,
}) {
  return (
    <>
      {/* ── Título + Setor ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase block mb-2">
            Título *
          </label>
          <Input
            {...register("titulo")}
            placeholder="Ex: Dashboard de Vendas"
            className={errors.titulo ? "border-destructive focus-visible:ring-destructive/30" : ""}
          />
          <FieldError message={errors.titulo?.message} />
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase block mb-2">
            Setor *
          </label>
          <Controller
            name="sectorId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={`w-full ${errors.sectorId ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Selecione um setor..." />
                </SelectTrigger>
                <SelectContent>
                  {setores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                  {setores.length > 0 && <SelectSeparator />}
                  <SelectItem value="__new__">+ Criar novo setor</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.sectorId?.message} />
          {sectorId === "__new__" && (
            <>
              <Input
                {...register("newSetorValue")}
                placeholder="Nome do novo setor"
                className={`mt-2 ${errors.newSetorValue ? "border-destructive" : ""}`}
                autoFocus
              />
              <FieldError message={errors.newSetorValue?.message} />
            </>
          )}
        </div>
      </div>

      {/* ── Link + Visibilidade ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase block mb-2">
            Link de Acesso
          </label>
          <Input
            {...register("link")}
            placeholder="https://exemplo.com/dashboard"
            type="url"
          />
          <FieldError message={errors.link?.message} />
        </div>

        <div className="bg-card rounded-2xl border border-border flex flex-col p-6 shadow-card">
          <div>
            <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase block mb-1">
              Visibilidade no Portal
            </label>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-4">
              Define se o dashboard aparecerá ativamente na tela inicial ou se ficará oculto.
            </p>
          </div>
          <Controller
            name="isVisible"
            control={control}
            render={({ field }) => (
              <div
                className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none ${field.value ? "border-primary/50 bg-primary/5" : "border-border bg-muted/30 hover:border-border/80"}`}
                onClick={() => field.onChange(!field.value)}
              >
                <p className={`text-sm font-semibold ${field.value ? "text-primary" : "text-muted-foreground"}`}>
                  {field.value ? "Dashboard Visível" : "Dashboard Oculto"}
                </p>
                <div className={`flex w-10 h-6 p-0.5 rounded-full transition-colors ${field.value ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${field.value ? "translate-x-4" : "translate-x-0"}`} />
                </div>
              </div>
            )}
          />
        </div>
      </div>

      {/* ── Descrição ── */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-6">
        <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase block mb-2">
          Descrição
        </label>
        <Textarea
          {...register("descricao")}
          placeholder="Descreva o propósito e o conteúdo deste dashboard..."
          rows={4}
          className="resize-none"
        />
        <FieldError message={errors.descricao?.message} />
      </div>
    </>
  );
}
