import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// ── Formata data relativa (usado nas notificações) ─────────────
export function fmtRelative(ts) {
  if (!ts) return "";
  const date = ts?.toDate?.() || new Date(ts);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "Agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return date.toLocaleDateString("pt-BR");
}

export const TYPE_STYLES = {
  info: { dot: "bg-blue-500", bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-600 dark:text-blue-400" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
  success: { dot: "bg-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" },
  error: { dot: "bg-red-500", bg: "bg-red-500/10 border-red-500/20", text: "text-red-600 dark:text-red-400" },
};

// ── Avatar específico do Navbar (borda branca) ────────────────
export function NavUserAvatar({ user, size = "sm" }) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = size === "sm" ? "w-8 h-8" : "w-12 h-12";
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  if (user?.picture && !imgError) {
    return (
      <img
        src={user.picture}
        alt={user.name}
        className={`${sizeClass} rounded-full object-cover border-2 border-white/40`}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white font-bold text-xs`}>
      {initials}
    </div>
  );
}

// ── Menu do Usuário ───────────────────────────────────────────
export function NavUserMenu({ user, onLogoutClick }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className="relative shrink-0" ref={ref}>
      <Button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-white/10 border border-white/30 rounded-full px-3 py-1.5 hover:bg-white/20 transition-all duration-200"
      >
        <NavUserAvatar user={user} />
        <span className="text-white text-xs font-medium max-w-25 truncate hidden md:block">
          {user?.given_name || user?.name?.split(" ")[0] || "Usuário"}
        </span>
      </Button>

      {open && (
        <div className="nav-dropdown-menu right-0 left-auto" style={{ minWidth: "210px" }}>
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button className="nav-dropdown-item flex items-center gap-2" onClick={() => { setOpen(false); navigate("/profile"); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> Meu Perfil
          </button>
          <button className="nav-dropdown-item flex items-center gap-2 text-destructive hover:bg-destructive/10 w-full text-left" onClick={() => { setOpen(false); onLogoutClick(); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg> Sair
          </button>
        </div>
      )}
    </div>
  );
}

// ── Dropdown Sino ──────────────────────────────────────────────
export function NavBellMenu({ unreadCount, notifications, notifLoading, markAllRead }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleClick = () => {
    setOpen((v) => {
      if (!v && unreadCount > 0) markAllRead();
      return !v;
    });
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <Button onClick={handleClick} className="cursor-pointer relative flex items-center justify-center w-9 h-9 rounded-full bg-white/10 border border-white/30 hover:bg-white/20 transition-all duration-200" title="Notificações">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 leading-none shadow-sm">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </Button>

      {open && (
        <div className="nav-dropdown-menu right-0 left-auto overflow-hidden" style={{ width: "320px", maxHeight: "420px", display: "flex", flexDirection: "column" }}>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
            <p className="text-sm font-bold text-foreground">Notificações</p>
            {notifications.length > 0 && <button onClick={markAllRead} className="text-xs text-primary hover:underline">Marcar todas como lidas</button>}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifLoading ? (
              <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/50"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                <p className="text-sm text-muted-foreground">Nenhuma notificação.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const style = TYPE_STYLES[n.type] || TYPE_STYLES.info;
                return (
                  <div key={n.id} className={`px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${style.bg} border-l-2 mx-0`}>
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-tight ${style.text}`}>{n.title}</p>
                        {n.message && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{fmtRelative(n.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
