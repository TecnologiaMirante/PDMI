import React, { useState } from 'react';
import { Search, Check, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function DashboardMultiSelect({ dashboards, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = dashboards.filter((d) =>
    d.titulo?.toLowerCase().includes(search.toLowerCase()),
  );

  const allSelected = selected === null;
  const noneSelected = selected !== null && selected.length === 0;

  const toggle = (id) => {
    if (selected === null) {
      onChange(dashboards.filter((d) => d.id !== id).map((d) => d.id));
    } else if (selected.includes(id)) {
      const next = selected.filter((x) => x !== id);
      onChange(next);
    } else {
      const next = [...selected, id];
      onChange(next.length === dashboards.length ? null : next);
    }
  };

  const isChecked = (id) =>
    allSelected || (selected !== null && selected.includes(id));
  const checkedCount = allSelected
    ? dashboards.length
    : (selected?.length ?? 0);

  const label = allSelected
    ? "Todos os dashboards"
    : noneSelected
      ? "Nenhum selecionado"
      : `${selected.length} dashboard${selected.length > 1 ? "s" : ""}`;

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 h-9 text-xs font-semibold ${!allSelected ? "border-primary/60 bg-primary/5 text-primary" : ""}`}
          >
            <LayoutDashboard className="size-3.5 shrink-0" />
            <span className="max-w-36 truncate">{label}</span>
            <ChevronDown
              className={`size-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end">
          <div className="p-2 border-b border-border">
            <input
              type="text"
              placeholder="Buscar dashboard..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-muted border border-border focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
            <button
              className="text-xs text-primary hover:underline font-medium"
              onClick={() => onChange(null)}
            >
              Marcar todos
            </button>
            <span className="text-xs text-muted-foreground">
              {checkedCount}/{dashboards.length}
            </span>
            <button
              className="text-xs text-muted-foreground hover:text-destructive hover:underline font-medium"
              onClick={() => onChange([])}
            >
              Desmarcar todos
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((d) => (
              <button
                key={d.id}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/60 transition-colors text-left"
                onClick={() => toggle(d.id)}
              >
                <div
                  className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                    isChecked(d.id)
                      ? "bg-primary border-primary"
                      : "border-border bg-background"
                  }`}
                >
                  {isChecked(d.id) && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path
                        d="M1 3.5L3.2 6L8 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span className="truncate text-foreground">{d.titulo}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-4 italic">
                Nenhum encontrado
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {/* BotÃ£o Ã— rÃ¡pido para limpar o filtro de dashboard */}
      {!allSelected && (
        <button
          onClick={() => onChange(null)}
          className="h-9 w-7 flex items-center justify-center rounded-md border border-primary/40 bg-primary/5 text-primary hover:bg-primary/15 transition-colors shrink-0"
          title="Mostrar todos os dashboards"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1 1L9 9M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
