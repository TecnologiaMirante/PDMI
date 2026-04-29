import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getDashboards, getDashboardsForUser } from "@infra/firebase";
import { X, ChevronLeft, ChevronRight, Play, Pause, Maximize2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import portalLogo from "@/assets/PORTAL DE DADOS.svg";

export default function KioskPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin, user, loading: authLoading } = useAuth();
  
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFirstLoadComplete, setIsFirstLoadComplete] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Estados para Double Buffering
  const [activeBuffer, setActiveBuffer] = useState("A"); // "A" ou "B"
  const [bufferA, setBufferA] = useState(null);
  const [bufferB, setBufferB] = useState(null);

  const dashIds = useMemo(() => searchParams.get("ids")?.split(",") || [], [searchParams]);
  const interval = useMemo(() => parseInt(searchParams.get("interval") || "30", 10), [searchParams]);

  useEffect(() => {
    if (authLoading) return;

    async function fetchData() {
      try {
        let all;
        if (isAdmin) {
          all = await getDashboards();
        } else {
          // Usuários comuns: apenas os próprios dashboards visíveis
          const uid = user?.uid || user?.id;
          const userDashes = await getDashboardsForUser(uid);
          all = userDashes.filter((d) => d.isVisible !== false);
        }

        // Preserva a ordem enviada via query param (ou usa todos se não houver filtro)
        const filtered = dashIds.length > 0
          ? dashIds.map(id => all.find(d => d.id === id)).filter(Boolean)
          : all;

        if (filtered.length === 0) {
          toast.error("Nenhum dashboard encontrado para exibição.");
          navigate("/home");
          return;
        }
        setDashboards(filtered);
        setBufferA(filtered[0]);
        if (filtered.length > 1) setBufferB(filtered[1]);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar dados da apresentação.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dashIds, navigate, isAdmin, authLoading, user]);

  // Timer de progresso e troca (SÓ COMEÇA QUANDO CARREGAR O PRIMEIRO)
  useEffect(() => {
    if (!isPlaying || loading || !isFirstLoadComplete || dashboards.length <= 1) return;

    const tick = 100;
    const totalMs = interval * 1000;
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + (tick / totalMs) * 100;
      });
    }, tick);

    return () => clearInterval(timer);
  }, [isPlaying, loading, isFirstLoadComplete, dashboards.length, interval, activeBuffer, activeIndex]);

  const handleNext = () => {
    const nextIdx = (activeIndex + 1) % dashboards.length;
    const preNextIdx = (nextIdx + 1) % dashboards.length;
    
    const nextBuffer = activeBuffer === "A" ? "B" : "A";
    setActiveBuffer(nextBuffer);
    setActiveIndex(nextIdx);

    setTimeout(() => {
      if (nextBuffer === "B") {
        setBufferA(dashboards[preNextIdx]);
      } else {
        setBufferB(dashboards[preNextIdx]);
      }
    }, 2000);
  };

  const handlePrev = () => {
    const prevIdx = (activeIndex - 1 + dashboards.length) % dashboards.length;
    setActiveIndex(prevIdx);
    setBufferA(dashboards[prevIdx]);
    setBufferB(dashboards[(prevIdx + 1) % dashboards.length]);
    setActiveBuffer("A");
    setProgress(0);
  };

  useEffect(() => {
    let timeout;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const currentDash = dashboards[activeIndex];

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8 px-6">
        <img src={portalLogo} alt="Logo" className="h-12 w-auto animate-pulse brightness-0 invert" />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-10 text-primary animate-spin" />
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.3em]">Sintonizando Ambiente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex flex-col font-sans">
      {/* Splash Screen (Aguardando carga do 1º dashboard) */}
      <div 
        className={`absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${
          isFirstLoadComplete ? "opacity-0 pointer-events-none scale-105" : "opacity-100"
        }`}
      >
        <div className="relative">
          <div className="absolute -inset-10 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
          <img src={portalLogo} alt="Logo" className="h-16 w-auto relative z-10 brightness-0 invert" />
        </div>
        <div className="mt-12 flex flex-col items-center gap-6 relative z-10">
          <div className="h-1 w-48 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-progress-loading" />
          </div>
          <div className="flex flex-col items-center gap-1">
             <p className="text-white font-black text-xl tracking-tight">Modo Apresentação</p>
             <p className="text-primary text-[10px] font-bold uppercase tracking-[0.4em] animate-pulse">
               Carregando Dados em Tempo Real
             </p>
          </div>
        </div>
      </div>

      {/* Barra de Progresso no topo */}
      <div className={`absolute top-0 left-0 w-full h-1.5 bg-white/5 z-[60] transition-opacity duration-1000 ${isFirstLoadComplete ? "opacity-100" : "opacity-0"}`}>
        <div 
          className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Container de Dashboards (Double Buffer) */}
      <div className="flex-1 w-full h-full relative bg-neutral-950">
        {/* Slot Buffer A */}
        <div 
          className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${
            activeBuffer === "A" 
              ? "opacity-100 z-10 scale-100 blur-0" 
              : "opacity-0 z-0 pointer-events-none scale-110 blur-xl"
          }`}
        >
          {bufferA?.link && (
            <iframe
              src={bufferA.link}
              className="w-full h-full border-0"
              allowFullScreen
              onLoad={() => activeBuffer === "A" && !isFirstLoadComplete && setIsFirstLoadComplete(true)}
            />
          )}
        </div>

        {/* Slot Buffer B */}
        <div 
          className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${
            activeBuffer === "B" 
              ? "opacity-100 z-10 scale-100 blur-0" 
              : "opacity-0 z-0 pointer-events-none scale-110 blur-xl"
          }`}
        >
          {bufferB?.link && (
            <iframe
              src={bufferB.link}
              className="w-full h-full border-0"
              allowFullScreen
              onLoad={() => activeBuffer === "B" && !isFirstLoadComplete && setIsFirstLoadComplete(true)}
            />
          )}
        </div>
      </div>

      {/* Controles Flutuantes (Footer) */}
      <div 
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-2.5 rounded-[24px] bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] transition-all duration-700 z-[70] ${
          showControls && isFirstLoadComplete ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        }`}
      >
        <div className="flex items-center gap-4 border-r border-white/10 pr-6 mr-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-primary font-black uppercase tracking-widest leading-none mb-1">Mirroring</span>
            <p className="text-white font-bold text-sm truncate max-w-[180px] leading-tight">
              {currentDash?.titulo}
            </p>
          </div>
          <span className="text-[11px] bg-white/10 text-white/90 px-2.5 py-1 rounded-lg font-black border border-white/10 tabular-nums">
            {activeIndex + 1} <span className="text-white/30 mx-0.5">/</span> {dashboards.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 h-10 w-10 rounded-full"
            onClick={handlePrev}
          >
            <ChevronLeft className="size-5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 h-12 w-12 rounded-full bg-white/5"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current ml-1" />}
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 h-10 w-10 rounded-full"
            onClick={handleNext}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>

        <div className="w-px h-6 bg-white/10 mx-2" />

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 h-10 w-10 rounded-full"
            onClick={toggleFullscreen}
            title="Screencast Mode"
          >
            <Maximize2 className="size-5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-red-500/20 hover:text-red-400 h-10 w-10 rounded-full"
            onClick={() => navigate("/home")}
            title="Encerrar"
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {!isPlaying && isFirstLoadComplete && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[80] animate-in fade-in zoom-in duration-500">
          <div className="bg-black/60 backdrop-blur-xl p-10 rounded-full border border-white/5 shadow-2xl">
            <Pause className="size-20 text-white animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}
