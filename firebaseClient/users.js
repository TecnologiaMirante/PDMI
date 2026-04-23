import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { db, auth } from "./config";

/**
 * Busca todos os usuários da coleção "users" ordenados alfabeticamente por nome.
 */
export async function getUsers() {
  const snap = await getDocs(collection(db, "users"));
  const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return users.sort((a, b) => {
    const nameA = (a.display_name || "").toLowerCase();
    const nameB = (b.display_name || "").toLowerCase();
    return nameA.localeCompare(nameB, "pt-BR");
  });
}

/**
 * Busca o perfil completo de um usuário pelo UID.
 */
export async function getUserProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
}

/**
 * Atualiza campos do documento do usuário na coleção "users".
 */
export async function updateUser(uid, data) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, data);
}

/**
 * Deleta um usuário do Firebase Auth e da Firestore.
 */
export async function deleteUserComplete(uid) {
  try {
    // Deleta do Firestore
    const userRef = doc(db, "users", uid);
    await deleteDoc(userRef);

    // Deleta do Firebase Auth
    // Nota: Isso requer que o usuário esteja autenticado ou use admin SDK
    // Para funcionar no client-side, o usuário deve ser re-autenticado ou ter privilégios
    const userToDelete = auth.currentUser;
    if (userToDelete && userToDelete.uid === uid) {
      await deleteUser(userToDelete);
    }
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    throw error;
  }
}
