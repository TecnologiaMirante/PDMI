import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./config";

/**
 * Busca todas as notificações, mais recentes primeiro.
 */
export async function getNotifications() {
  const q = query(
    collection(db, "notifications"),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Cria uma nova notificação.
 * @param {object} payload - { title, message, type, targetUsers? }
 *   targetUsers: array de UIDs que verão esta notificação.
 *   Se omitido/vazio, a notificação é global (todos os usuários).
 * @param {string} uid - UID de quem criou
 */
export async function createNotification({ title, message, type = "info", targetUsers = null }, uid) {
  const data = {
    title,
    message,
    type,
    createdAt: serverTimestamp(),
    createdBy: uid,
  };
  // Só salva targetUsers se for um array não-vazio (global caso contrário)
  if (Array.isArray(targetUsers) && targetUsers.length > 0) {
    data.targetUsers = targetUsers;
  }
  const ref = await addDoc(collection(db, "notifications"), data);
  return ref.id;
}

/**
 * Deleta uma notificação (admin only).
 */
export async function deleteNotification(id) {
  await deleteDoc(doc(db, "notifications", id));
}
