import { getAllUserStats } from "@infra/firebase";

/**
 * Cache de estatísticas de usuários (evita múltiplos fetches por sessão)
 * @type {Array|null}
 */
let _adminStatsCache = null;

/**
 * Carrega todas as estatísticas uma única vez por sessão administrativa
 * @returns {Promise<Array>} Lista de estatísticas
 */
export async function loadAllStatsOnce() {
  if (_adminStatsCache) return _adminStatsCache;
  _adminStatsCache = await getAllUserStats();
  return _adminStatsCache;
}

/**
 * Limpa o cache de estatísticas de usuários
 */
export function clearStatsCache() {
  _adminStatsCache = null;
}

/**
 * Formata a data de refresh no Power BI
 * @param {string} str - Data em string
 * @returns {string} Data formatada
 */
export function fmtPBIDate(str) {
  if (!str) return "";
  return new Date(str).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formata o tempo de administração em segundos para texto legível
 * @param {number} seconds - Segundos
 * @returns {string} Texto formatado
 */
export function fmtAdminTime(seconds) {
  if (!seconds) return "0 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

/**
 * Mapa de valores do banco → rótulos de exibição
 */
export const TYPE_LABELS = {
  user: "Usuário",
  admin: "Admin",
  superadmin: "SuperAdmin",
};
