import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { registerPlatformAccess, addPlatformTime, registerDashboardAccess, addDashboardTime } from "@infra/firebase";

export default function SessionTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const uid = user?.uid || user?.id;

  // Variável para garantir que não registramos "login" em cada re-render se o mount ocorrer
  const hasLogged = useRef(false);

  // Registrar login
  useEffect(() => {
    if (uid && !hasLogged.current) {
      registerPlatformAccess(uid).catch(console.error);
      hasLogged.current = true;
    }
  }, [uid]);

  // Monitorar tempo de sessão global (salva a cada 60s)
  useEffect(() => {
    if (!uid) return;
    const interval = setInterval(() => {
      addPlatformTime(uid, 60).catch(console.error);
    }, 60000); // 60 segundos
    return () => clearInterval(interval);
  }, [uid]);

  // Monitorar acessos e tempo por dashboard
  useEffect(() => {
    if (!uid) return;

    const path = location.pathname;
    const isDashboard = path.startsWith("/dashboard/") && !path.includes("/edit") && !path.includes("create");
    
    let dashId = null;
    let interval = null;

    if (isDashboard) {
      dashId = path.split("/")[2];
      if (dashId) {
        // Registra acesso ao dashboard
        registerDashboardAccess(uid, dashId).catch(console.error);
        
        // Salva tempo decorrido no dashboard a cada 60s
        interval = setInterval(() => {
          addDashboardTime(uid, dashId, 60).catch(console.error);
        }, 60000); // 60 segundos
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [location.pathname, uid]);

  return null;
}
