import { useState, useEffect, useCallback } from "react";
import { getNotifications, updateUser } from "@infra/firebase";
import { useAuth } from "@/context/AuthContext";

/**
 * Hook para gerenciar notificações da plataforma.
 * - `notifications`: lista de notificações
 * - `unreadCount`: quantas são mais recentes que o último acesso lido
 * - `markAllRead()`: atualiza `lastNotificationRead` no Firestore + contexto
 * - `loading`: carregando
 */
export function useNotifications() {
  const { user, userProfile, refreshProfile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(() => {
    setLoading(true);
    getNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Filtra notificações: global (sem targetUsers) OU direcionadas a este usuário
  const uid = user?.uid || user?.id;
  const visibleNotifications = notifications.filter((n) => {
    if (!n.targetUsers || n.targetUsers.length === 0) return true; // global
    return uid && n.targetUsers.includes(uid);
  });

  // Calcula não-lidas: notificações visíveis criadas depois de lastNotificationRead
  const lastRead = userProfile?.lastNotificationRead;
  const lastReadTime = lastRead?.toDate?.()?.getTime?.() || (lastRead ? new Date(lastRead).getTime() : 0);

  const unreadCount = visibleNotifications.filter((n) => {
    const created = n.createdAt?.toDate?.()?.getTime?.() || 0;
    return created > lastReadTime;
  }).length;

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const uid = user.uid || user.id;
    try {
      await updateUser(uid, { lastNotificationRead: new Date() });
      await refreshProfile();
    } catch {
      // silencioso
    }
  }, [user, refreshProfile]);

  return { notifications: visibleNotifications, unreadCount, loading, refetch: fetchNotifications, markAllRead };
}
