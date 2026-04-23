function PBIStatusBadge({ status }) {
  if (!status) return null;

  if (status === "loading") {
    return (
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm border border-white/20 rounded-full px-2.5 py-1">
        <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        <span className="text-white text-[10px] font-medium">Verificando</span>
      </div>
    );
  }

  if (status === "updated") {
    return (
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-emerald-500/80 backdrop-blur-sm border border-emerald-400/40 rounded-full px-2.5 py-1">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6l3 3 5-5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-white text-[10px] font-semibold tracking-wide">
          Atualizado
        </span>
      </div>
    );
  }

  if (status === "outdated") {
    return (
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-red-500/80 backdrop-blur-sm border border-red-400/40 rounded-full px-2.5 py-1">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path
            d="M6 2v4M6 8.5v.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-white text-[10px] font-semibold tracking-wide">
          Desatualizado
        </span>
      </div>
    );
  }

  return null;
}

export default function DashboardCard({
  card,
  index,
  onClick,
  pbiStatus,
  isFavorite,
  onToggleFavorite,
  compact = false,
  sectorName,
}) {
  const delayClass = compact ? "" : `card-delay-${Math.min(index + 1, 15)}`;
  const isNovo = card.badge === "NOVO";
  const isOutdated = pbiStatus === "outdated";
  const displaySetor = sectorName || card.sectorId || card.setor;

  return (
    <div
      id={`dashboard-card-${card.id}`}
      onClick={() => onClick && onClick(card)}
      className={[
        "group relative overflow-hidden rounded-2xl cursor-pointer",
        compact ? "" : `animate-fade-in-up ${delayClass} opacity-0`,
        "shadow-card hover:shadow-card-hover",
        "transition-all duration-300",
        "aspect-4/3",
        // Ring: vermelho se desatualizado, verde se atualizado, âmbar se favorito, nada se sem status
        isOutdated
          ? "ring-2 ring-red-500/70"
          : pbiStatus === "updated"
            ? "ring-2 ring-emerald-500/80"
            : isFavorite
              ? "ring-2 ring-amber-500/80"
              : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ── Imagem / gradiente de fundo ── */}
      {card.thumb ? (
        <img
          src={card.thumb}
          alt={card.titulo}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      ) : (
        <div
          className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105"
          style={{
            background:
              card.gradient ||
              "linear-gradient(135deg, #006064 0%, #00838F 100%)",
          }}
        />
      )}

      {/* ── Overlay escuro que aparece no hover ── */}
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* ── Badge NOVO — sempre visível ── */}
      {isNovo && (
        <div className="absolute top-0 right-0 z-20">
          <div className="badge-novo bg-red-600 text-white text-xs font-black px-4 py-3 rounded-bl-2xl rounded-tr-2xl shadow-lg tracking-widest">
            NOVO
          </div>
        </div>
      )}

      {/* ── Status Power BI ── */}
      {!isNovo && <PBIStatusBadge status={pbiStatus} />}

      {/* ── Setor — top-left, aparece no hover ── */}
      {displaySetor && (
        <div className="absolute top-3 left-3 z-20 -translate-y-1.5 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
          <span className="inline-block bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full shadow-sm">
            {displaySetor}
          </span>
        </div>
      )}

      {/* ── Botão favorito — bottom-right ── */}
      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(card.id);
          }}
          className={[
            "cursor-pointer absolute bottom-3 right-3 z-30",
            "w-8 h-8 rounded-full flex items-center justify-center",
            "bg-black/40 backdrop-blur-sm border border-white/20",
            "transition-all duration-200 hover:scale-110 hover:bg-black/60",
            isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          ].join(" ")}
          title={
            isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"
          }
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={isFavorite ? "#fbbf24" : "none"}
            stroke={isFavorite ? "#fbbf24" : "white"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      )}

      {/* ── Título + descrição — bottom, aparece no hover ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
        {card.titulo && (
          <p className="text-white font-black text-base leading-tight drop-shadow-md line-clamp-2">
            {card.titulo}
          </p>
        )}
        {card.descricao && (
          <p className="text-white/80 text-xs font-light mt-1 leading-snug line-clamp-2 drop-shadow-sm">
            {card.descricao}
          </p>
        )}
      </div>
    </div>
  );
}
