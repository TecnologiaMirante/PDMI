import { useState, useEffect, useRef, useCallback } from "react";
import { updateUser } from "@infra/firebase";

const MAX = 6;

/**
 * Gerencia dashboards recentes do usuário, sincronizando com o Firestore.
 * @param {string} uid - UID do usuário
 * @param {string[]} initialRecents - Valor inicial vindo do userProfile
 */
export function useRecents(uid, initialRecents) {
  const [recents, setRecents] = useState(() => initialRecents || []);
  const initialized = useRef(false);

  // Carrega do Firestore assim que userProfile estiver disponível
  useEffect(() => {
    if (!initialized.current && initialRecents !== undefined) {
      setRecents(initialRecents || []);
      initialized.current = true;
    }
  }, [initialRecents]);

  const push = useCallback(
    (id) => {
      setRecents((prev) => {
        const next = [id, ...prev.filter((r) => r !== id)].slice(0, MAX);
        if (uid) {
          updateUser(uid, { recents: next }).catch(console.error);
        }
        return next;
      });
    },
    [uid],
  );

  return { recents, push };
}
