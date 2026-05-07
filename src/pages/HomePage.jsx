import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import DashboardCard from "@/components/DashboardCard";
import { Button } from "@/components/ui/button";
import { getDashboardsForUser, getSectors } from "@infra/firebase";
import { useAuth } from "@/context/AuthContext";
import { usePowerBIStatuses } from "@/hooks/usePowerBIStatuses";
import { useFavorites } from "@/hooks/useFavorites";
import { useRecents } from "@/hooks/useRecents";
import { SkeletonCard } from "@/components/ui/Skeleton";
import KioskSetupModal from "@/components/KioskSetupModal";
import { Play } from "lucide-react";

export default function HomePage() {
  const { user, userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [setor, setSetor] = useState("Todos os setores");
  const [dashboards, setDashboards] = useState([]);
  const [sectorMap, setSectorMap] = useState({});
  const [setores, setSetores] = useState(["Todos os setores"]);
  const [loading, setLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [isKioskModalOpen, setIsKioskModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const pbiStatuses = usePowerBIStatuses(dashboards);
  const uid = user?.uid || user?.id || "";
  const { favorites, toggle: toggleFavorite, isFavorite } = useFavorites(uid, userProfile?.favorites);
  const { recents, push: pushRecent } = useRecents(uid, userProfile?.recents);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      setLoading(true);
      try {
        const [data, sectorsList] = await Promise.all([
          getDashboardsForUser(user.uid || user.id),
          getSectors().catch(() => []) 
        ]);
        
        const sMap = {};
        sectorsList.forEach(s => {
          sMap[s.id] = s.name;
        });
        setSectorMap(sMap);
        setDashboards(data);

        // Nomes únicos de setores para o Navbar
        const unique = [
          ...new Set(data.map((d) => sMap[d.sectorId || d.setor] || d.sectorId || d.setor).filter(Boolean)),
        ].sort();
        setSetores(["Todos os setores", ...unique]);
      } catch {
        toast.error("Erro ao carregar dashboards. Tente recarregar a página.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, isAdmin]);

  const isFiltering = search || setor !== "Todos os setores";

  const filteredCards = useMemo(() => {
    return dashboards
      .filter((card) => {
        // Cards ocultos: só visíveis para admin com showHidden ativo
        const isVisibleCard = card.isVisible !== undefined ? card.isVisible : true;
        if (!isVisibleCard && !(isAdmin && showHidden)) return false;

        const cardSectorName = sectorMap[card.sectorId || card.setor] || card.sectorId || card.setor;
        const matchSetor = setor === "Todos os setores" || cardSectorName === setor;
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          card.titulo?.toLowerCase().includes(q) ||
          card.descricao?.toLowerCase().includes(q);
        return matchSetor && matchSearch;
      })
      .sort((a, b) => {
        // Favoritos primeiro, depois alfabético
        const af = favorites.has(a.id) ? 0 : 1;
        const bf = favorites.has(b.id) ? 0 : 1;
        if (af !== bf) return af - bf;
        return (a.titulo || "").localeCompare(b.titulo || "");
      });
  }, [search, setor, dashboards, favorites, showHidden, isAdmin, sectorMap]);


  // Cards recentes (só os que o usuário ainda tem acesso e estão visíveis)
  const recentCards = useMemo(
    () =>
      recents
        .map((id) => dashboards.find((d) => d.id === id))
        .filter(Boolean)
        .filter((d) => (d.isVisible !== undefined ? d.isVisible : true) || showHidden)
        .slice(0, 6),
    [recents, dashboards, showHidden],
  );

  // Reseta para página 1 quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [search, setor]);

  const totalPages = Math.ceil(filteredCards.length / ITEMS_PER_PAGE);
  const paginatedCards = useMemo(
    () => filteredCards.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredCards, currentPage, ITEMS_PER_PAGE],
  );

  const handleCardClick = useCallback((card) => {
    pushRecent(card.id);
    navigate(`/dashboard/${card.id}`);
  }, [pushRecent, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar
        search={search}
        onSearchChange={setSearch}
        setor={setor}
        onSetorChange={setSetor}
        setores={setores}
      />

      <main className="flex-1 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 border-primary/20 hover:bg-primary/5 text-primary"
            onClick={() => setIsKioskModalOpen(true)}
          >
            <Play className="size-3.5 fill-current" />
            Modo Apresentação
          </Button>

          {/* Toggle "Ver dashboards ocultos" — apenas para admin */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground mr-1 select-none hidden sm:block">
                Ver dashboards ocultos
              </label>
              <div
                className={`flex w-10 h-5 p-0.5 rounded-full cursor-pointer transition-colors border ${showHidden ? 'bg-primary border-primary' : 'bg-muted/50 border-border'}`}
                onClick={() => setShowHidden(!showHidden)}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${showHidden ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 animate-in fade-in duration-500">
            {[...Array(8)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="text-primary"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-foreground font-semibold text-lg">
                Nenhum dashboard encontrado
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Tente outro termo de busca ou setor.
              </p>
            </div>
            <Button
              onClick={() => {
                setSearch("");
                setSetor("Todos os setores");
              }}
              className="rounded-full"
            >
              Limpar filtros
            </Button>
          </div>
        ) : (
          <>
            {/* ── Recentes ── */}
            {!isFiltering && recentCards.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  Recentes
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {recentCards.map((card) => (
                    <div key={card.id} className="w-44 shrink-0">
                      <DashboardCard
                        card={card}
                        index={0}
                        onClick={handleCardClick}
                        pbiStatus={pbiStatuses[card.titulo]?.status}
                        isFavorite={isFavorite(card.id)}
                        onToggleFavorite={toggleFavorite}
                        sectorName={sectorMap[card.sectorId || card.setor]}
                        compact
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Favoritos highlight ── */}
            {!isFiltering && favorites.size > 0 && (
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Favoritos primeiro
              </h2>
            )}

            {/* ── Contador de filtro ── */}
            {isFiltering && (
              <p className="text-muted-foreground text-sm mb-4">
                {filteredCards.length} dashboard
                {filteredCards.length !== 1 ? "s" : ""} encontrado
                {filteredCards.length !== 1 ? "s" : ""}
                {setor !== "Todos os setores" && (
                  <span>
                    {" "}em <strong className="text-primary">{setor}</strong>
                  </span>
                )}
                {search && (
                  <span>
                    {" "}para "<strong>{search}</strong>"
                  </span>
                )}
              </p>
            )}

            {/* ── Grid principal ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {paginatedCards.map((card, i) => (
                <DashboardCard
                  key={card.id}
                  card={card}
                  index={i}
                  onClick={handleCardClick}
                  pbiStatus={pbiStatuses[card.titulo]?.status}
                  isFavorite={isFavorite(card.id)}
                  onToggleFavorite={toggleFavorite}
                  sectorName={sectorMap[card.sectorId || card.setor]}
                />
              ))}
            </div>

            {/* ── Paginação ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-8 pb-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-3 rounded-lg text-sm font-medium border border-border bg-card text-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ‹ Anterior
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("ellipsis-" + p);
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p) =>
                    typeof p === "string" ? (
                      <span key={p} className="px-1 text-muted-foreground text-sm select-none">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                          p === currentPage
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "border border-border bg-card text-foreground hover:bg-muted/60"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-3 rounded-lg text-sm font-medium border border-border bg-card text-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima ›
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <KioskSetupModal 
        isOpen={isKioskModalOpen}
        onClose={() => setIsKioskModalOpen(false)}
        dashboards={isAdmin ? dashboards : dashboards.filter(d => d.isVisible !== false)}
        onStart={(ids, interval) => {
          setIsKioskModalOpen(false);
          const idsQuery = ids.join(",");
          navigate(`/kiosk?ids=${idsQuery}&interval=${interval}`);
        }}
      />
    </div>
  );
}
