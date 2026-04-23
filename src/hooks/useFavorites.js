import { useState, useEffect, useRef, useCallback } from "react";
import { updateUser } from "@infra/firebase";

/**
 * Gerencia favoritos do usuário, sincronizando com o Firestore.
 * @param {string} uid - UID do usuário
 * @param {string[]} initialFavorites - Valor inicial vindo do userProfile
 */
export function useFavorites(uid, initialFavorites) {
  const [favorites, setFavorites] = useState(() => new Set(initialFavorites || []));
  const initialized = useRef(false);

  // Carrega do Firestore assim que userProfile estiver disponível
  useEffect(() => {
    if (!initialized.current && initialFavorites !== undefined) {
      setFavorites(new Set(initialFavorites || []));
      initialized.current = true;
    }
  }, [initialFavorites]);

  const toggle = useCallback(
    (id) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        if (uid) {
          updateUser(uid, { favorites: [...next] }).catch(console.error);
        }
        return next;
      });
    },
    [uid],
  );

  const isFavorite = useCallback((id) => favorites.has(id), [favorites]);

  return { favorites, toggle, isFavorite };
}
