import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Check, X, GripVertical, ChevronUp, ChevronDown } from "lucide-react";

export default function KioskSetupModal({ isOpen, onClose, dashboards: initialDashboards, onStart }) {
  const [selectedIds, setSelectedIds] = useState(
    initialDashboards.filter(d => (d.isVisible !== undefined ? d.isVisible : true)).map(d => d.id)
  );
  const [interval, setIntervalValue] = useState(30);
  const [list, setList] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Sincroniza a lista local quando o modal abre ou os dashboards mudam
  useMemo(() => {
    if (isOpen) {
      setList([...initialDashboards]);
    }
  }, [isOpen, initialDashboards]);

  const toggleDash = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const moveItem = (from, to) => {
    const newList = [...list];
    const item = newList.splice(from, 1)[0];
    newList.splice(to, 0, item);
    setList(newList);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    moveItem(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleStart = () => {
    if (selectedIds.length === 0) return;
    // Retorna os IDs na ordem visual da lista
    const orderedSelectedIds = list
      .map(d => d.id)
      .filter(id => selectedIds.includes(id));
    onStart(orderedSelectedIds, interval);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-card border border-border rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-2">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="size-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <span className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Play className="size-5 text-primary fill-current" />
            </span>
            <h2 className="text-2xl font-black text-foreground">
              Modo Apresentação (Kiosk)
            </h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Selecione os dashboards para rotação automática e defina o tempo.
          </p>
        </div>

        <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Configuração de Intervalo */}
          <div className="flex flex-col gap-2.5 p-5 rounded-2xl bg-muted/30 border border-border/50">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Tempo de transição (segundos)
            </label>
            <div className="flex items-center gap-4">
              <Input 
                type="number" 
                min="5" 
                max="300"
                value={interval}
                onChange={(e) => setIntervalValue(e.target.value)}
                className="w-24 h-12 bg-background border-border text-center font-bold text-lg rounded-xl"
              />
              <span className="text-xs text-muted-foreground leading-tight">
                Sugestão: 30s para dashboards visuais ou 60s para tabelas densas.
              </span>
            </div>
          </div>

          {/* Lista de Dashboards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
               <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Dashboards selecionados ({selectedIds.length})
              </span>
              <button 
                className="text-[11px] font-bold text-primary hover:underline"
                onClick={() => setSelectedIds(list.map(d => d.id))}
              >
                Marcar todos
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {list.map((d, index) => (
                <div 
                  key={d.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={() => setDraggedIndex(null)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all select-none group relative ${
                    selectedIds.includes(d.id) 
                      ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" 
                      : "bg-muted/5 border-transparent opacity-70 hover:opacity-100 hover:border-border"
                  } ${draggedIndex === index ? "opacity-30 scale-95" : ""}`}
                >
                  {/* Alça de Arrastar (Desktop) */}
                  <div className="hidden sm:flex cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-primary transition-colors">
                    <GripVertical className="size-5" />
                  </div>

                  {/* Seleção */}
                  <div 
                    onClick={() => toggleDash(d.id)}
                    className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                      selectedIds.includes(d.id) ? "bg-primary border-primary scale-110 shadow-sm" : "border-muted-foreground/30 bg-background"
                    }`}
                  >
                    {selectedIds.includes(d.id) && <Check className="size-3 text-white" strokeWidth={4} />}
                  </div>

                  <div className="flex-1 min-w-0" onClick={() => toggleDash(d.id)}>
                    <p className={`text-sm font-bold truncate ${selectedIds.includes(d.id) ? "text-foreground" : "text-muted-foreground"}`}>
                      {d.titulo}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground/60 truncate uppercase tracking-tighter">
                      {d.setor || d.sectorId}
                    </p>
                  </div>

                  {/* Botões de Ordem (Mobile Friendly) */}
                  <div className="flex flex-col gap-1">
                    <button 
                      disabled={index === 0}
                      onClick={(e) => { e.stopPropagation(); moveItem(index, index - 1); }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-0"
                    >
                      <ChevronUp className="size-3" />
                    </button>
                    <button 
                      disabled={index === list.length - 1}
                      onClick={(e) => { e.stopPropagation(); moveItem(index, index + 1); }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-0"
                    >
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-12 px-6">
            Cancelar
          </Button>
          <Button 
            disabled={selectedIds.length === 0}
            onClick={handleStart}
            className="h-12 px-8 rounded-xl shadow-lg shadow-primary/20 gap-2 font-bold"
          >
            <Play className="size-4 fill-current" />
            Iniciar Apresentação
          </Button>
        </div>
      </div>
    </div>
  );
}
