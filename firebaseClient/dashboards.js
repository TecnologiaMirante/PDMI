import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

/**
 * Busca todos os dashboards ordenados alfabeticamente por título (Admin only).
 */
export async function getDashboards() {
  const q = query(collection(db, "dashboard"), orderBy("created_at", "asc"));
  const snap = await getDocs(q);
  const dashboards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return dashboards.sort((a, b) => {
    const titleA = (a.titulo || "").toLowerCase();
    const titleB = (b.titulo || "").toLowerCase();
    return titleA.localeCompare(titleB, "pt-BR");
  });
}

/**
 * Busca somente os dashboards liberados para o UID.
 * Filtra no servidor via array-contains — o cliente nunca recebe
 * documentos de outros usuários.
 * Ordena alfabeticamente por título.
 */
export async function getDashboardsForUser(uid) {
  const q = query(
    collection(db, "dashboard"),
    where("users_acess", "array-contains", uid),
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return docs.sort((a, b) => {
    const titleA = (a.titulo || "").toLowerCase();
    const titleB = (b.titulo || "").toLowerCase();
    return titleA.localeCompare(titleB, "pt-BR");
  });
}

/**
 * Concede acesso de um UID a um dashboard.
 */
export async function addUserToDashboard(dashboardId, uid) {
  const ref = doc(db, "dashboard", dashboardId);
  await updateDoc(ref, { users_acess: arrayUnion(uid) });
}

/**
 * Remove acesso de um UID de um dashboard.
 */
export async function removeUserFromDashboard(dashboardId, uid) {
  const ref = doc(db, "dashboard", dashboardId);
  await updateDoc(ref, { users_acess: arrayRemove(uid) });
}

/**
 * Busca um dashboard específico por ID (para edição).
 */
export async function getDashboard(dashboardId) {
  const ref = doc(db, "dashboard", dashboardId);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
}

/**
 * Cria um novo dashboard.
 */
export async function createDashboard(data, uid) {
  const dashboardRef = doc(collection(db, "dashboard"));
  await setDoc(dashboardRef, {
    ...data,
    created_at: serverTimestamp(),
    created_by: uid || "unknown",
    updated_at: serverTimestamp(),
    updated_by: uid || "unknown",
    isVisible: data.isVisible !== undefined ? data.isVisible : true,
    users_acess: data.users_acess || [],
  });
  return dashboardRef.id;
}

/**
 * Atualiza um dashboard existente.
 */
export async function updateDashboard(dashboardId, data, uid) {
  const ref = doc(db, "dashboard", dashboardId);
  await updateDoc(ref, {
    ...data,
    updated_at: serverTimestamp(),
    updated_by: uid || "unknown",
  });
}

/**
 * Deleta um dashboard.
 */
export async function deleteDashboard(dashboardId) {
  const ref = doc(db, "dashboard", dashboardId);
  await deleteDoc(ref);
}
