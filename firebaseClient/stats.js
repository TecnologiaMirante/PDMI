import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

/**
 * Registra um novo acesso à plataforma e também salva dados como lastAccess.
 */
export async function registerPlatformAccess(uid) {
  const ref = doc(db, "user_stats", uid);
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      platform: {
        accessCount: 1,
        totalTimeSeconds: 0,
        lastAccess: serverTimestamp(),
        dailyAccesses: { [today]: 1 },
      },
      dashboards: {},
    });
  } else {
    await updateDoc(ref, {
      "platform.accessCount": increment(1),
      "platform.lastAccess": serverTimestamp(),
      [`platform.dailyAccesses.${today}`]: increment(1),
    });
  }
}

/**
 * Registra acesso a um dashboard específico.
 */
export async function registerDashboardAccess(uid, dashboardId) {
  const ref = doc(db, "user_stats", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // Caso raro onde o log de platform não rolou, cria base.
    await setDoc(ref, {
      uid,
      platform: {
        accessCount: 1,
        totalTimeSeconds: 0,
        lastAccess: serverTimestamp(),
      },
      dashboards: {
        [dashboardId]: {
          accessCount: 1,
          totalTimeSeconds: 0,
          lastAccess: serverTimestamp(),
        },
      },
    });
  } else {
    const data = snap.data();
    if (!data.dashboards || !data.dashboards[dashboardId]) {
      await updateDoc(ref, {
        [`dashboards.${dashboardId}.accessCount`]: 1,
        [`dashboards.${dashboardId}.totalTimeSeconds`]: 0,
        [`dashboards.${dashboardId}.lastAccess`]: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        [`dashboards.${dashboardId}.accessCount`]: increment(1),
        [`dashboards.${dashboardId}.lastAccess`]: serverTimestamp(),
      });
    }
  }
}

/**
 * Adiciona tempo gasto (em segundos) na plataforma.
 */
export async function addPlatformTime(uid, seconds) {
  const ref = doc(db, "user_stats", uid);
  // Assume document exists since `registerPlatformAccess` was called when app loaded
  await updateDoc(ref, {
    "platform.totalTimeSeconds": increment(seconds),
  }).catch(() => null); // Silent fallback se não existir documento
}

/**
 * Adiciona tempo gasto (em segundos) num dashboard específico.
 */
export async function addDashboardTime(uid, dashboardId, seconds) {
  const ref = doc(db, "user_stats", uid);
  await updateDoc(ref, {
    [`dashboards.${dashboardId}.totalTimeSeconds`]: increment(seconds),
  }).catch(() => null);
}

/**
 * Recupera as estatísticas de um usuário.
 */
export async function getUserStats(uid) {
  const ref = doc(db, "user_stats", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return null;
}

/**
 * Recupera estatísticas de TODOS os usuários (para Analytics admin).
 * @returns {Array<{uid, platform, dashboards}>}
 */
export async function getAllUserStats() {
  const snap = await getDocs(collection(db, "user_stats"));
  return snap.docs.map((d) => d.data());
}
