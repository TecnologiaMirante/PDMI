import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ThemeToggle from "@/components/ThemeToggle";
import portalLogo from "@/assets/PORTAL DE DADOS.svg";
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
import { NavUserMenu, NavBellMenu } from "./NavbarComponents";

export default function Navbar({ search, onSearchChange, setor, onSetorChange, setores = [] }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading: notifLoading, markAllRead } = useNotifications();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 shadow-nav" style={{ background: "linear-gradient(90deg, #006064 0%, #00838F 50%, #006064 100%)" }}>
      <div className="grid grid-cols-3 items-center px-4 h-16">
        {/* COLUNA 1 */}
        <div className="flex items-center justify-start gap-2">
          {isAdmin && (
            <Button
              id="btn-goto-admin"
              onClick={() => navigate("/admin")}
              className="flex btn-pill-solid py-1.5! text-xs! gap-1.5 shrink-0 h-auto"
              style={{ background: "white", color: "#006064" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
              <span className="hidden md:inline">Administração</span>
            </Button>
          )}
          <ThemeToggle variant="navbar" />
        </div>

        {/* COLUNA 2: LOGO */}
        <div className="flex justify-center">
          <img src={portalLogo} alt="Portal de Dados Mirante" className="h-7 md:h-8 w-auto select-none" draggable={false} />
        </div>

        {/* COLUNA 3: PESQUISA, SETOR, SINO, PERFIL */}
        <div className="flex items-center justify-end gap-2">
          {/* Pesquisa Desktop */}
          <div className="hidden lg:block relative shrink-0">
            <Input id="input-search" type="text" placeholder="Pesquisar" value={search} onChange={(e) => onSearchChange(e.target.value)} className="search-input bg-white/10 border border-white/30 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto rounded-full px-4 py-2 text-white text-xs font-medium hover:bg-white/20 transition-all duration-200 justify-between" />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          </div>

          {/* Setor Dropdown */}
          <div className="hidden md:block relative shrink-0" ref={dropdownRef}>
            <Button onClick={() => setDropdownOpen((v) => !v)} className="cursor-pointer flex items-center gap-2 bg-white/10 border border-white/30 rounded-full px-4 py-2 text-white text-xs font-medium hover:bg-white/20 transition-all duration-200 min-w-38 justify-between">
              <span className="truncate">{setor}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-200 shrink-0 ${dropdownOpen ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9" /></svg>
            </Button>
            {dropdownOpen && (
              <div className="nav-dropdown-menu right-0 left-auto" style={{ minWidth: "180px" }}>
                {setores.map((s) => (
                  <button key={s} className={`nav-dropdown-item ${setor === s ? "bg-secondary text-primary font-semibold" : ""}`} onClick={() => { onSetorChange(s); setDropdownOpen(false); }}>{s}</button>
                ))}
              </div>
            )}
          </div>

          {/* Sino e Perfil (Componentizados) */}
          <NavBellMenu unreadCount={unreadCount} notifications={notifications} notifLoading={notifLoading} markAllRead={markAllRead} />
          <NavUserMenu user={user} onLogoutClick={() => setLogoutDialogOpen(true)} />
        </div>
      </div>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
            <AlertDialogDescription>Você será desconectado e redirecionado para a tela de login.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleLogout}>Sim, sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile: busca + setor */}
      <div className="md:hidden flex gap-2 px-4 pb-3">
        <div className="relative flex-1">
          <Input type="text" placeholder="Pesquisar dashboard..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="w-full bg-white/15 border border-white/30 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus:bg-white/25 focus:border-white/60 transition-all h-auto pr-9" />
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        </div>
        <Select value={setor} onValueChange={onSetorChange}>
          <SelectTrigger className="bg-white/15 border-white/30 text-white text-xs max-w-30 rounded-full h-9 [&_svg]:text-white/70 hover:bg-white/25 focus:ring-white/30 focus:border-white/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            {setores.map((s) => (
              <SelectItem key={s} value={s}>{s === "Todos os setores" ? "Todos" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </nav>
  );
}
